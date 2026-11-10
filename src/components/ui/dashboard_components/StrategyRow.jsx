
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { calculateFileHash } from '@/utils/crypto.js';
import { uploadEvidenceFile } from '@/utils/services/uploadEvidence.js';
import { StrategyScoreCard } from './StrategyScoreCard.jsx';
import { WhatsMissingCard } from './WhatsMissingCard.jsx';
import { StartFixDrawer } from '@/components/ui/drawers/StartFixDrawer.jsx';
import { ControlsSatisfied } from '@/components/ui/drawers/ControlsSatisfied.jsx';
import { calculateStrategyScore } from '@/utils/calculateStrategyScore.js';
import './styles/StrategyRow.css';

export function StrategyRow({ 
  strategyName = '',
  maturityLevel,
  tenantId,
  mspId,
  userId,
  reviewerRole,
  onScoreChange
}) {
  const [controls, setControls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [fixControl, setFixControl] = useState(null);
  const [controlsSatisfiedOpen, setControlsSatisfiedOpen] = useState(false);
  const [evidenceRefreshKey, setEvidenceRefreshKey] = useState(0);
  const [profileNamesById, setProfileNamesById] = useState({});
  const [evidenceStatusState, setEvidenceStatusState] = useState({
    queryKey: '',
    byControl: {},
    error: '',
    notesError: '',
  });

  useEffect(() => {
    // Correct guard: ensure strategyName exists and maturityLevel is not undefined/null
    if (!strategyName || maturityLevel === undefined || maturityLevel === null) {
      console.warn('Fetch skipped: Missing strategyName or maturityLevel', { strategyName, maturityLevel });
      return;
    }

    if (!tenantId) return undefined;

    let isMounted = true;

    const fetchStrategyControls = async () => {
      setLoading(true);
      setLoadError('');

      try {
        const { data, error } = await supabase
          .from('tenant_controls')
          .select(`
            id,
            status,
            satisfied_by,
            satisfied_on,
            control:controls!tenant_controls_rebuild_control_id_fkey!inner(
              id,
              strategy,
              maturity_level,
              control_code,
              name,
              ism_id
            )
          `)
          .eq('tenant_id', tenantId)
          .eq('control.strategy', strategyName)
          .eq('control.maturity_level', maturityLevel);

        if (error) throw error;
        if (!isMounted) return;

        const tenantControls = (data || []).map((tenantControl) => ({
          ...tenantControl.control,
          tenantControlId: tenantControl.id,
          tenantControlStatus: tenantControl.status,
          satisfiedBy: tenantControl.satisfied_by,
          satisfiedOn: tenantControl.satisfied_on,
          status: tenantControl.status === 'unsatisfied' ? 'unsatisfactory' : 'compliant',
        }));

        if (tenantControls.length === 0) {
          setControls([]);
          setLoadError('No controls are mapped to this tenant for this strategy.');
          return;
        }

        setControls(tenantControls);
      } catch (error) {
        console.error(`Error fetching tenant controls for "${strategyName}" (${maturityLevel}):`, error);
        if (isMounted) {
          setControls([]);
          setLoadError('Unable to load controls for this tenant.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchStrategyControls();

    return () => {
      isMounted = false;
    };
  }, [strategyName, maturityLevel, tenantId]);

  const evidenceQueryKey = JSON.stringify([
    tenantId,
    userId,
    controls.map((control) => control.id).sort(),
    evidenceRefreshKey,
  ]);

  useEffect(() => {
    const controlIds = controls.map((control) => control.id);
    if (!tenantId || controlIds.length === 0) return undefined;

    let isMounted = true;

    async function fetchEvidenceStatuses() {
      try {
        const { data, error } = await supabase
          .from('evidence_with_approver')
            .select('id, control_id, tenant_id, msp_id, file_name, file_path, file_type, file_size_bytes, description, uploaded_by, created_at, approval_status, approved_by, approved_at')
          .eq('tenant_id', tenantId)
          .in('control_id', controlIds)
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (!isMounted) return;

        const evidenceRows = data || [];
        const evidenceIds = evidenceRows.map((evidence) => evidence.id);
        let reviews = [];
        let notes = [];
        let evidenceReadRows = [];
        let noteReadRows = [];
        let evidenceChainRows = [];
        let notesError = '';

        if (evidenceIds.length > 0) {
          const { data: reviewData, error: reviewError } = await supabase
            .from('evidence_reviews')
            .select('id, evidence_id, decision, reason, reviewed_by, reviewed_at')
            .in('evidence_id', evidenceIds)
            .order('reviewed_at', { ascending: false })
            .order('id', { ascending: false });

          if (reviewError) throw reviewError;
          reviews = reviewData || [];

          const { data: noteData, error: noteError } = await supabase
            .from('evidence_notes')
            .select('id, evidence_id, subject, note, created_by, created_at')
            .in('evidence_id', evidenceIds)
            .order('created_at', { ascending: false });

          if (noteError) {
            console.error('Error fetching evidence notes:', noteError);
            notesError = 'Admin notes are unavailable.';
          } else {
            notes = noteData || [];
          }

          const { data: chainData, error: chainError } = await supabase
            .from('evidence')
            .select('id, supersedes_evidence_id')
            .eq('tenant_id', tenantId)
            .in('control_id', controlIds);

          if (chainError) throw chainError;
          evidenceChainRows = chainData || [];

          if (userId) {
            const { data: evidenceReadData, error: evidenceReadError } = await supabase
              .from('evidence_reads')
              .select('evidence_id, read_at')
              .eq('user_id', userId)
              .in('evidence_id', evidenceIds);

            if (evidenceReadError) throw evidenceReadError;
            evidenceReadRows = evidenceReadData || [];

            if (notes.length > 0) {
              const { data: noteReadData, error: noteReadError } = await supabase
                .from('evidence_note_reads')
                .select('note_id')
                .eq('user_id', userId)
                .in('note_id', notes.map((note) => note.id));

              if (noteReadError) throw noteReadError;
              noteReadRows = noteReadData || [];
            }
          }
        }

        const latestReviewByEvidence = new Map();
        for (const review of reviews) {
          if (!latestReviewByEvidence.has(review.evidence_id)) {
            latestReviewByEvidence.set(review.evidence_id, review);
          }
        }

        const evidenceById = new Map(evidenceChainRows.map((evidence) => [evidence.id, evidence]));
        const successorByEvidenceId = new Map(
          evidenceChainRows
            .filter((evidence) => evidence.supersedes_evidence_id)
            .map((evidence) => [evidence.supersedes_evidence_id, evidence.id])
        );
        const evidenceReadAtById = new Map(evidenceReadRows.map((read) => [read.evidence_id, read.read_at]));
        const readNoteIds = new Set(noteReadRows.map((read) => read.note_id));

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

        const notesWithReadState = notes.map((note) => ({
          ...note,
          isUnread: note.created_by !== userId && !readNoteIds.has(note.id),
        }));

        const happenedAfterRead = (eventAt, readAt) => (
          !readAt || new Date(eventAt).getTime() > new Date(readAt).getTime()
        );

        const notesByEvidence = notesWithReadState.reduce((notesByFile, note) => {
          notesByFile[note.evidence_id] ??= [];
          notesByFile[note.evidence_id].push(note);
          return notesByFile;
        }, {});

        const profileIds = [...new Set([
          ...evidenceRows.map((evidence) => evidence.uploaded_by),
          ...reviews.map((review) => review.reviewed_by),
          ...notesWithReadState.map((note) => note.created_by),
          ...controls.map((control) => control.satisfiedBy),
        ].filter(Boolean))];
        let profilesById = {};

        if (profileIds.length > 0) {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name, deactivated_at')
            .in('id', profileIds);

          if (profileError) throw profileError;
          profilesById = Object.fromEntries((profileData || []).map((profile) => [profile.id, profile]));
        }
        setProfileNamesById(Object.fromEntries(Object.entries(profilesById).map(([id, profile]) => (
          [id, profile.deactivated_at ? 'Deactivated user' : profile.full_name?.trim() || 'Unknown user']
        ))));

        const byControl = evidenceRows.reduce((filesByControl, evidence) => {
          const latestReview = latestReviewByEvidence.get(evidence.id);
          const uploader = evidence.uploaded_by ? profilesById[evidence.uploaded_by] : null;
          const reviewer = latestReview?.reviewed_by ? profilesById[latestReview.reviewed_by] : null;
          const uploaderName = uploader?.deactivated_at
            ? 'Deactivated user'
            : uploader?.full_name?.trim();
          const reviewerName = reviewer?.deactivated_at
            ? 'Deactivated user'
            : reviewer?.full_name?.trim();
          const evidenceNotes = notesByEvidence[evidence.id] || [];
          const readAt = evidenceReadAtById.get(evidence.id);
          const isUnread = Boolean(userId && (
            (evidence.uploaded_by !== userId && happenedAfterRead(evidence.created_at, readAt))
            || (latestReview && latestReview.reviewed_by !== userId && happenedAfterRead(latestReview.reviewed_at, readAt))
          ));

          filesByControl[evidence.control_id] ??= [];
          filesByControl[evidence.control_id].push({
            id: evidence.id,
            fileName: evidence.file_name,
            filePath: evidence.file_path,
            fileType: evidence.file_type,
            fileSizeBytes: evidence.file_size_bytes,
            description: evidence.description,
            uploadedBy: evidence.uploaded_by
              ? uploaderName || 'Unknown user'
              : 'API',
            uploadedAt: evidence.created_at,
            approvalStatus: evidence.approval_status,
            isUnread,
            isRejectedUnresolved: evidence.approval_status === 'rejected' && !hasApprovedDescendant(evidence.id),
            supersedesEvidenceId: evidenceById.get(evidence.id)?.supersedes_evidence_id || null,
            supersededById: successorByEvidenceId.get(evidence.id) || null,
            approvedBy: reviewer?.deactivated_at
              ? 'Deactivated user'
              : evidence.approved_by?.trim() || reviewerName || '',
            approvedAt: evidence.approved_at,
            reviewedBy: latestReview?.reviewed_by
              ? reviewerName || 'Unknown user'
              : '',
            reviewedAt: latestReview?.reviewed_at || null,
            reviewReason: latestReview?.reason?.trim() || '',
            hasAdminNote: evidenceNotes.some((note) => note.isUnread),
            notes: evidenceNotes.map((note) => ({
              id: note.id,
              subject: note.subject,
              note: note.note,
              createdById: note.created_by,
              createdBy: profilesById[note.created_by]?.deactivated_at
                ? 'Deactivated user'
                : profilesById[note.created_by]?.full_name?.trim() || 'Unknown user',
              createdAt: note.created_at,
              isUnread: note.isUnread,
            })),
          });
          return filesByControl;
        }, {});

        setEvidenceStatusState({ queryKey: evidenceQueryKey, byControl, error: '', notesError });
      } catch (error) {
        console.error(`Error fetching evidence statuses for "${strategyName}":`, error);
        if (isMounted) {
          setProfileNamesById({});
          setEvidenceStatusState({
            queryKey: evidenceQueryKey,
            byControl: {},
            error: 'Evidence statuses are unavailable.',
            notesError: '',
          });
        }
      }
    }

    fetchEvidenceStatuses();

    return () => {
      isMounted = false;
    };
  }, [controls, evidenceQueryKey, evidenceRefreshKey, strategyName, tenantId, userId]);

  // Derived Metrics
  const maxControls = controls.length;
  const whatsMissing = controls.filter((control) => control.tenantControlStatus !== 'satisfied');
  const satisfiedControls = controls
    .filter((control) => control.tenantControlStatus === 'satisfied')
    .map((control) => ({
      ...control,
      satisfiedByName: profileNamesById[control.satisfiedBy] || 'Unknown user',
    }));
  const missingItems = whatsMissing.length;
  const score = calculateStrategyScore(maxControls, missingItems) ?? 0;

  useEffect(() => {
    if (
      !loading &&
      tenantId &&
      !loadError &&
      controls.length > 0 &&
      strategyName &&
      maturityLevel !== undefined &&
      maturityLevel !== null
    ) {
      onScoreChange?.(strategyName, score, maturityLevel);
    }
  }, [controls.length, loadError, loading, maturityLevel, onScoreChange, score, strategyName, tenantId]);

  if (!strategyName || !maturityLevel) return null;

  // Determine compliance tier ('high', 'medium', 'low') for StrategyScoreCard
  const getComplianceStatus = () => {
    if (maxControls === 0) return 'low';
    const percentage = ((maxControls - missingItems) / maxControls) * 100;
    if (percentage > 80) return 'high';
    if (percentage < 40) return 'low';
    else return 'medium';
  };

  const complianceStatus = getComplianceStatus();

  async function handleSubmitEvidence(file, supersedesEvidenceId = null) {
    if (!fixControl || !file) {
      return { success: false, error: 'Select a control and file before submitting.' };
    }

    try {
      const fileHash = await calculateFileHash(file);
      const result = await uploadEvidenceFile({
        file,
        fileHash,
        controlId: fixControl.id,
        tenantId,
        mspId,
        userId,
        supersedesEvidenceId,
      });

      if (result.success) {
        setEvidenceRefreshKey((refreshKey) => refreshKey + 1);
      }

      return result;
    } catch (error) {
      console.error('Unable to prepare evidence upload:', error);
      return { success: false, error: 'Unable to prepare this file for upload.' };
    }
  }

  const canReviewEvidence = reviewerRole === 'owner' || reviewerRole === 'msp_admin';

  async function handleReviewEvidence(evidenceId, decision, reason = '') {
    if (!canReviewEvidence || !userId || !evidenceId) {
      return { success: false, error: 'You are not allowed to review this evidence.' };
    }

    const { error } = await supabase
      .from('evidence_reviews')
      .insert({
        evidence_id: evidenceId,
        decision,
        reason: decision === 'rejected' ? reason.trim() : null,
        reviewed_by: userId,
      });

    if (error) {
      console.error('Unable to save evidence review:', error);
      return { success: false, error: 'Unable to save this review. Please try again.' };
    }

    setEvidenceRefreshKey((refreshKey) => refreshKey + 1);
    return { success: true };
  }

  async function handleAddEvidenceNote(evidenceId, subject, note) {
    if (!canReviewEvidence || !userId || !fixControl || !evidenceId) {
      return { success: false, error: 'You are not allowed to add a note here.' };
    }
    if (!subject.trim() || !note.trim()) {
      return { success: false, error: 'Enter a subject and note.' };
    }

    const { error } = await supabase
      .from('evidence_notes')
      .insert({
        evidence_id: evidenceId,
        tenant_id: tenantId,
        control_id: fixControl.id,
        msp_id: mspId,
        subject: subject.trim(),
        note: note.trim(),
        created_by: userId,
      });

    if (error) {
      console.error('Unable to save evidence note:', error);
      return { success: false, error: 'Unable to save this note. Please try again.' };
    }

    setEvidenceRefreshKey((refreshKey) => refreshKey + 1);
    return { success: true };
  }

  async function handleMarkEvidenceRead(evidenceId) {
    if (!userId || !evidenceId) return { success: false, error: 'Unable to identify this evidence read.' };

    const { error } = await supabase
      .from('evidence_reads')
      .upsert({ evidence_id: evidenceId, user_id: userId, read_at: new Date().toISOString() }, {
        onConflict: 'evidence_id,user_id',
      });

    if (error) {
      console.error('Unable to mark evidence as read:', error);
      return { success: false, error: 'Unable to save the evidence read status.' };
    }

    setEvidenceRefreshKey((refreshKey) => refreshKey + 1);
    return { success: true };
  }

  async function handleMarkNoteRead(noteId) {
    if (!userId || !noteId) return { success: false, error: 'Unable to identify this note read.' };

    const { error } = await supabase
      .from('evidence_note_reads')
      .insert({ note_id: noteId, user_id: userId });

    if (error && error.code !== '23505') {
      console.error('Unable to mark note as read:', error);
      return { success: false, error: 'Unable to save the note read status.' };
    }

    setEvidenceRefreshKey((refreshKey) => refreshKey + 1);
    return { success: true };
  }

  async function updateControlSatisfaction(tenantControlId, isSatisfied) {
    if (!canReviewEvidence || !userId || !tenantId || !tenantControlId) {
      return { success: false, error: 'You are not allowed to update this control.' };
    }

    const satisfactionFields = isSatisfied
      ? {
          status: 'satisfied',
          satisfied_by: userId,
          satisfied_on: new Date().toISOString(),
        }
      : {
          status: 'unsatisfied',
          satisfied_by: null,
          satisfied_on: null,
        };

    const { data, error } = await supabase
      .from('tenant_controls')
      .update(satisfactionFields)
      .eq('id', tenantControlId)
      .eq('tenant_id', tenantId)
      .select('status, satisfied_by, satisfied_on')
      .single();

    if (error || !data) {
      console.error('Unable to update tenant control satisfaction:', error);
      return { success: false, error: 'Unable to update this control. Please try again.' };
    }

    const updatedFields = {
      tenantControlStatus: data.status,
      satisfiedBy: data.satisfied_by,
      satisfiedOn: data.satisfied_on,
      status: data.status === 'satisfied' ? 'compliant' : 'unsatisfactory',
    };

    setControls((currentControls) => currentControls.map((item) => (
      item.tenantControlId === tenantControlId
        ? { ...item, ...updatedFields }
        : item
    )));
    setFixControl((currentControl) => (
      currentControl?.tenantControlId === tenantControlId
        ? { ...currentControl, ...updatedFields }
        : currentControl
    ));

    return { success: true };
  }

  async function handleSetControlSatisfied(isSatisfied) {
    if (!fixControl?.tenantControlId) {
      return { success: false, error: 'Unable to identify this control.' };
    }
    return updateControlSatisfaction(fixControl.tenantControlId, isSatisfied);
  }

  async function handleResetSatisfiedControl(tenantControlId) {
    return updateControlSatisfaction(tenantControlId, false);
  }

  async function handleResetImplementedControls() {
    if (!canReviewEvidence || !tenantId) {
      return { success: false, error: 'You are not allowed to reset this strategy.' };
    }

    const satisfiedTenantControlIds = controls
      .filter((item) => item.tenantControlStatus === 'satisfied')
      .map((item) => item.tenantControlId);

    if (satisfiedTenantControlIds.length === 0) {
      return { success: false, error: 'There are no implemented controls to reset.' };
    }

    const { data, error } = await supabase
      .from('tenant_controls')
      .update({ status: 'unsatisfied', satisfied_by: null, satisfied_on: null })
      .eq('tenant_id', tenantId)
      .in('id', satisfiedTenantControlIds)
      .select('id');

    if (error || data?.length !== satisfiedTenantControlIds.length) {
      console.error('Unable to reset implemented controls:', error);
      return { success: false, error: 'Unable to reset this strategy. Please try again.' };
    }

    setControls((currentControls) => currentControls.map((item) => (
      satisfiedTenantControlIds.includes(item.tenantControlId)
        ? { ...item, tenantControlStatus: 'unsatisfied', satisfiedBy: null, satisfiedOn: null, status: 'unsatisfactory' }
        : item
    )));
    return { success: true };
  }

  async function handleOpenEvidenceFile(filePath) {
    if (!filePath) return { success: false, error: 'File path is unavailable.' };

    try {
      const { data, error } = await supabase.storage
        .from('compliance_evidence')
        .createSignedUrl(filePath, 60);

      if (error) throw error;
      return { success: true, url: data.signedUrl };
    } catch (error) {
      console.error('Unable to create evidence file link:', error);
      return { success: false, error: 'Unable to open this evidence file.' };
    }
  }

  return (
    <article className="strategy-row-cont">
      <StrategyScoreCard
        strategyName={strategyName}
        complianceStatus={complianceStatus}
        maxControls={maxControls}
        missingItems={missingItems}
        satisfiedControlsCount={satisfiedControls.length}
        onOpenSatisfiedControls={() => setControlsSatisfiedOpen(true)}
      />
      <WhatsMissingCard
        whatsMissing={whatsMissing}
        loading={Boolean(tenantId) && loading}
        error={tenantId ? loadError : 'Select a tenant to load controls.'}
        evidenceByControl={evidenceStatusState.queryKey === evidenceQueryKey ? evidenceStatusState.byControl : {}}
        evidenceError={evidenceStatusState.queryKey === evidenceQueryKey ? evidenceStatusState.error : ''}
        onOpenFixDrawer={setFixControl}
        canResetControls={canReviewEvidence}
        onResetControls={handleResetImplementedControls}
      />
      <StartFixDrawer
        key={fixControl?.id || 'closed'}
        control={fixControl}
        evidenceFiles={evidenceStatusState.queryKey === evidenceQueryKey ? evidenceStatusState.byControl[fixControl?.id] || [] : []}
        evidenceLoading={evidenceStatusState.queryKey !== evidenceQueryKey}
        evidenceError={evidenceStatusState.queryKey === evidenceQueryKey ? evidenceStatusState.error : ''}
        evidenceNoteError={evidenceStatusState.queryKey === evidenceQueryKey ? evidenceStatusState.notesError : ''}
        reviewerRole={reviewerRole}
        onClose={() => setFixControl(null)}
        onSubmitEvidence={handleSubmitEvidence}
        onReviewEvidence={handleReviewEvidence}
        onAddEvidenceNote={handleAddEvidenceNote}
        onMarkEvidenceRead={handleMarkEvidenceRead}
        onMarkNoteRead={handleMarkNoteRead}
        onSetControlSatisfied={handleSetControlSatisfied}
        onOpenEvidenceFile={handleOpenEvidenceFile}
      />
      {controlsSatisfiedOpen && satisfiedControls.length > 0 && (
        <ControlsSatisfied
          strategyName={strategyName}
          controls={satisfiedControls}
          evidenceByControl={evidenceStatusState.queryKey === evidenceQueryKey ? evidenceStatusState.byControl : {}}
          evidenceLoading={evidenceStatusState.queryKey !== evidenceQueryKey}
          evidenceError={evidenceStatusState.queryKey === evidenceQueryKey ? evidenceStatusState.error : ''}
          canReset={canReviewEvidence}
          onResetControl={handleResetSatisfiedControl}
          onOpenEvidenceFile={handleOpenEvidenceFile}
          onMarkEvidenceRead={handleMarkEvidenceRead}
          onMarkNoteRead={handleMarkNoteRead}
          onClose={() => setControlsSatisfiedOpen(false)}
        />
      )}
    </article>
  );
}