import { supabase } from '@/lib/supabaseClient.js';

const PAGE_SIZE = 1000;
const ID_BATCH_SIZE = 100;
const statusOrder = ['pending', 'rejected', 'approved', 'note'];

async function fetchAllRows(buildQuery) {
  const rows = [];
  let offset = 0;

  while (true) {
    const { data, error } = await buildQuery().range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) return rows;
    offset += PAGE_SIZE;
  }
}

async function fetchRowsByIds(table, columns, column, ids, orderBy = null) {
  const batches = [];

  for (let index = 0; index < ids.length; index += ID_BATCH_SIZE) {
    const idBatch = ids.slice(index, index + ID_BATCH_SIZE);
    batches.push(fetchAllRows(() => {
      let query = supabase.from(table).select(columns).in(column, idBatch);
      for (const order of orderBy || []) {
        query = query.order(order.column, { ascending: order.ascending });
      }
      return query;
    }));
  }

  return (await Promise.all(batches)).flat();
}

export async function fetchTenantNotifications(tenantIds, userId) {
  const notificationsByTenant = Object.fromEntries(tenantIds.map((tenantId) => [tenantId, []]));
  if (!tenantIds.length || !userId) return notificationsByTenant;

  const evidence = await fetchAllRows(() => supabase
    .from('evidence_with_approver')
    .select('id, tenant_id, uploaded_by, created_at, approval_status')
    .in('tenant_id', tenantIds));
  const evidenceIds = evidence.map((item) => item.id);
  if (evidenceIds.length === 0) return notificationsByTenant;

  const [reviews, notes, evidenceChain, evidenceReads] = await Promise.all([
    fetchRowsByIds('evidence_reviews', 'id, evidence_id, decision, reviewed_by, reviewed_at', 'evidence_id', evidenceIds, [
      { column: 'reviewed_at', ascending: false },
      { column: 'id', ascending: false },
    ]),
    fetchRowsByIds('evidence_notes', 'id, evidence_id, created_by', 'evidence_id', evidenceIds),
    fetchAllRows(() => supabase
      .from('evidence')
      .select('id, tenant_id, supersedes_evidence_id')
      .in('tenant_id', tenantIds)),
    fetchRowsByIds('evidence_reads', 'evidence_id, read_at', 'evidence_id', evidenceIds),
  ]);

  const latestReviewByEvidence = new Map();
  for (const review of reviews) {
    if (!latestReviewByEvidence.has(review.evidence_id)) {
      latestReviewByEvidence.set(review.evidence_id, review);
    }
  }

  const noteIds = notes.map((note) => note.id);
  const noteReads = await fetchRowsByIds('evidence_note_reads', 'note_id', 'note_id', noteIds);
  const readNoteIds = new Set(noteReads.map((read) => read.note_id));
  const evidenceReadAtById = new Map(evidenceReads.map((read) => [read.evidence_id, read.read_at]));
  const evidenceById = new Map(evidence.map((item) => [item.id, item]));
  const successorByEvidenceId = new Map(
    evidenceChain
      .filter((item) => item.supersedes_evidence_id)
      .map((item) => [item.supersedes_evidence_id, item.id])
  );
  const statusSetsByTenant = new Map(tenantIds.map((tenantId) => [tenantId, new Set()]));

  function hasApprovedDescendant(evidenceId) {
    const visited = new Set();
    let successorId = successorByEvidenceId.get(evidenceId);
    while (successorId && !visited.has(successorId)) {
      visited.add(successorId);
      if (latestReviewByEvidence.get(successorId)?.decision === 'approved') return true;
      successorId = successorByEvidenceId.get(successorId);
    }
    return false;
  }

  function happenedAfterRead(eventAt, readAt) {
    return !readAt || new Date(eventAt).getTime() > new Date(readAt).getTime();
  }

  for (const item of evidence) {
    const latestReview = latestReviewByEvidence.get(item.id);
    const status = item.approval_status || 'pending_approval';
    const readAt = evidenceReadAtById.get(item.id);
    const isUnread = Boolean(
      (item.uploaded_by !== userId && happenedAfterRead(item.created_at, readAt))
      || (latestReview && latestReview.reviewed_by !== userId && happenedAfterRead(latestReview.reviewed_at, readAt))
    );
    const tenantStatuses = statusSetsByTenant.get(item.tenant_id);

    if (status === 'rejected' && !hasApprovedDescendant(item.id)) tenantStatuses?.add('rejected');
    if (isUnread && status === 'pending_approval') tenantStatuses?.add('pending');
    if (isUnread && status === 'approved') tenantStatuses?.add('approved');
  }

  for (const note of notes) {
    if (note.created_by !== userId && !readNoteIds.has(note.id)) {
      const tenantId = evidenceById.get(note.evidence_id)?.tenant_id;
      statusSetsByTenant.get(tenantId)?.add('note');
    }
  }

  for (const [tenantId, statuses] of statusSetsByTenant) {
    notificationsByTenant[tenantId] = statusOrder.filter((status) => statuses.has(status));
  }

  return notificationsByTenant;
}