const DAY_IN_MS = 24 * 60 * 60 * 1000;
export const EVIDENCE_EXPIRY_WARNING_DAYS = 7;

export function getEvidenceExpiryState(expiresAt, now = Date.now()) {
  if (!expiresAt) return { status: 'none', days: null };

  const expiryTime = new Date(expiresAt).getTime();
  if (!Number.isFinite(expiryTime)) return { status: 'none', days: null };

  const remainingMs = expiryTime - now;
  if (remainingMs <= 0) {
    return { status: 'expired', days: Math.floor(Math.abs(remainingMs) / DAY_IN_MS) };
  }

  if (remainingMs <= EVIDENCE_EXPIRY_WARNING_DAYS * DAY_IN_MS) {
    return { status: 'expiring', days: Math.ceil(remainingMs / DAY_IN_MS) };
  }

  return { status: 'current', days: null };
}

export function formatEvidenceExpiry(state) {
  if (state.status === 'expiring') return `Expires in ${state.days} ${state.days === 1 ? 'day' : 'days'}`;
  if (state.status === 'expired') return `Expired ${state.days} ${state.days === 1 ? 'day' : 'days'} ago`;
  return '';
}

export function getEvidenceChain(evidenceFiles, selectedEvidenceId) {
  const evidenceById = new Map(evidenceFiles.map((evidence) => [evidence.id, evidence]));
  const successorById = new Map(
    evidenceFiles
      .filter((evidence) => evidence.supersedesEvidenceId)
      .map((evidence) => [evidence.supersedesEvidenceId, evidence])
  );

  let first = evidenceById.get(selectedEvidenceId);
  if (!first) return [];

  const visited = new Set([first.id]);
  while (first.supersedesEvidenceId && !visited.has(first.supersedesEvidenceId)) {
    const predecessor = evidenceById.get(first.supersedesEvidenceId);
    if (!predecessor) break;
    first = predecessor;
    visited.add(first.id);
  }

  const chain = [];
  let current = first;
  while (current && !chain.some((evidence) => evidence.id === current.id)) {
    chain.push(current);
    current = successorById.get(current.id);
  }

  return chain;
}

export function buildEvidenceHistoryEntries(evidenceFiles, expirationEvents, reviewEvents = []) {
  const evidenceById = new Map(evidenceFiles.map((evidence) => [evidence.id, evidence]));
  const successorById = new Map(
    evidenceFiles
      .filter((evidence) => evidence.supersedesEvidenceId)
      .map((evidence) => [evidence.supersedesEvidenceId, evidence])
  );
  const eventsByEvidenceId = new Map();

  for (const event of expirationEvents) {
    eventsByEvidenceId.get(event.evidenceId) ?? eventsByEvidenceId.set(event.evidenceId, []).get(event.evidenceId);
    eventsByEvidenceId.get(event.evidenceId).push(event);
  }

  const entries = [];
  for (const evidence of evidenceFiles) {
    const initialEvent = (eventsByEvidenceId.get(evidence.id) || [])
      .find((event) => event.eventType === 'initial');
    const predecessorName = evidenceById.get(evidence.supersedesEvidenceId)?.fileName;
    const successorName = successorById.get(evidence.id)?.fileName;
    const details = [];

    if (predecessorName) details.push(`Replaces ${predecessorName}`);
    if (successorName) details.push(`Updated by ${successorName}`);
    if (initialEvent) details.push(`Expiry ${formatHistoryDate(initialEvent.expiresAt)}`);

    entries.push({
      id: `upload-${evidence.id}`,
      evidenceId: evidence.id,
      timestamp: evidence.uploadedAt,
      event: predecessorName ? 'Replacement uploaded' : 'Evidence uploaded',
      fileName: evidence.fileName,
      details: details.join(' · '),
      actor: evidence.uploadedBy,
    });

    const expirationHistory = [...(eventsByEvidenceId.get(evidence.id) || [])]
      .sort((left, right) => new Date(left.createdAt) - new Date(right.createdAt));
    for (let index = 0; index < expirationHistory.length; index += 1) {
      const event = expirationHistory[index];
      if (event.eventType !== 'renewal') continue;

      const previousEvent = expirationHistory[index - 1];
      entries.push({
        id: `renewal-${event.id}`,
        evidenceId: evidence.id,
        timestamp: event.createdAt,
        event: 'Evidence renewed',
        fileName: evidence.fileName,
        details: previousEvent
          ? `Expiry changed from ${formatHistoryDate(previousEvent.expiresAt)} to ${formatHistoryDate(event.expiresAt)}`
          : `Expiry set to ${formatHistoryDate(event.expiresAt)}`,
        actor: event.createdBy,
      });
    }
  }

  for (const event of reviewEvents) {
    if (!evidenceById.has(event.evidenceId)) continue;
    entries.push({
      id: `review-${event.id}`,
      evidenceId: event.evidenceId,
      timestamp: event.reviewedAt,
      event: event.decision === 'approved' ? 'Evidence approved' : 'Evidence rejected',
      fileName: evidenceById.get(event.evidenceId).fileName,
      details: event.reason || '',
      actor: event.reviewedBy,
    });
  }

  return entries.sort((left, right) => (
    new Date(right.timestamp) - new Date(left.timestamp)
    || right.id.localeCompare(left.id)
  ));
}

function formatHistoryDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'date unavailable' : date.toLocaleDateString();
}