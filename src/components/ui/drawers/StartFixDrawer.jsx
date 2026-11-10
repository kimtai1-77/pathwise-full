
import { useRef, useState } from 'react';

import { BtnMain } from '@/components/ui/buttons/btn-main';
import { BtnSecondary } from '@/components/ui/buttons/btn-secondary';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock.js';
import { NotesViewer } from './NotesViewer.jsx';
import './StartFixDrawer.css';

const evidenceStatusLabels = {
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
};

function formatEvidenceDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString();
}

export function StartFixDrawer({
  control,
  evidenceFiles = [],
  evidenceLoading = false,
  evidenceError = '',
  evidenceNoteError = '',
  reviewerRole = '',
  onClose,
  onSubmitEvidence,
  onReviewEvidence,
  onAddEvidenceNote,
  onMarkEvidenceRead,
  onMarkNoteRead,
  onSetControlSatisfied,
  onOpenEvidenceFile,
}) {
  const [file, setFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [rejectingEvidenceId, setRejectingEvidenceId] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [reviewErrorEvidenceId, setReviewErrorEvidenceId] = useState('');
  const [reviewingEvidenceId, setReviewingEvidenceId] = useState('');
  const [noteEvidenceId, setNoteEvidenceId] = useState('');
  const [noteSubject, setNoteSubject] = useState('');
  const [noteDraft, setNoteDraft] = useState('');
  const [noteError, setNoteError] = useState('');
  const [noteSuccess, setNoteSuccess] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [fileOpeningId, setFileOpeningId] = useState('');
  const [fileOpenError, setFileOpenError] = useState('');
  const [notesEvidenceId, setNotesEvidenceId] = useState('');
  const [supersedingEvidenceId, setSupersedingEvidenceId] = useState('');
  const [highlightedEvidenceId, setHighlightedEvidenceId] = useState('');
  const [updatingSatisfaction, setUpdatingSatisfaction] = useState(false);
  const [satisfactionError, setSatisfactionError] = useState('');
  const [satisfactionSuccess, setSatisfactionSuccess] = useState('');
  const fileInputRef = useRef(null);
  const uploadSectionRef = useRef(null);
  const evidenceItemRefs = useRef(new Map());
  const highlightTimeoutRef = useRef(null);
  const rejectionDialogRef = useRef(null);
  const [expandedControlId, setExpandedControlId] = useState(null);
  const [expandedEvidenceControlId, setExpandedEvidenceControlId] = useState(null);
  const showControl = control && expandedControlId === control.id;
  const showEvidence = control && expandedEvidenceControlId === control.id;
  const canReviewEvidence = reviewerRole === 'owner' || reviewerRole === 'msp_admin';
  useBodyScrollLock(Boolean(control));

  if (!control) return null;

  const handleClose = () => {
    setExpandedControlId(null);
    setExpandedEvidenceControlId(null);
    setNotesEvidenceId('');
    window.clearTimeout(highlightTimeoutRef.current);
    rejectionDialogRef.current?.close();
    onClose?.();
  };

  const handleSubmitEvidence = async () => {
    if (!file || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError('');
    setSubmitSuccess('');

    try {
      const result = await onSubmitEvidence?.(file, supersedingEvidenceId || null);
      if (!result?.success) {
        setSubmitError(result?.error || 'Unable to upload this file.');
        return;
      }

      setFile(null);
      setSupersedingEvidenceId('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setSubmitSuccess('Evidence uploaded and pending approval.');
    } catch {
      setSubmitError('Unable to upload this file. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (event) => {
    setFile(event.target.files?.[0] || null);
    setSubmitError('');
    setSubmitSuccess('');
  };

  const clearFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setSubmitError('');
    setSubmitSuccess('');
  };

  const openRejectionDialog = (evidenceId) => {
    setRejectingEvidenceId(evidenceId);
    setRejectionReason('');
    setReviewError('');
    setReviewErrorEvidenceId(evidenceId);
    rejectionDialogRef.current?.showModal();
  };

  const closeRejectionDialog = () => {
    setRejectingEvidenceId('');
    setRejectionReason('');
    setReviewError('');
    setReviewErrorEvidenceId('');
  };

  const submitRejection = async (event) => {
    event.preventDefault();
    const reason = rejectionReason.trim();
    if (!rejectingEvidenceId || !reason || reviewingEvidenceId) return;

    setReviewingEvidenceId(rejectingEvidenceId);
    setReviewError('');
    try {
      const result = await onReviewEvidence?.(rejectingEvidenceId, 'rejected', reason);
      if (!result?.success) {
        setReviewError(result?.error || 'Unable to save the rejection.');
        return;
      }
      rejectionDialogRef.current?.close();
    } catch {
      setReviewError('Unable to save the rejection. Please try again.');
    } finally {
      setReviewingEvidenceId('');
    }
  };

  const approveEvidence = async (evidenceId) => {
    if (!evidenceId || reviewingEvidenceId) return;

    setReviewingEvidenceId(evidenceId);
    setReviewError('');
    setReviewErrorEvidenceId(evidenceId);
    try {
      const result = await onReviewEvidence?.(evidenceId, 'approved');
      if (!result?.success) {
        setReviewError(result?.error || 'Unable to approve this file.');
      }
    } catch {
      setReviewError('Unable to approve this file. Please try again.');
    } finally {
      setReviewingEvidenceId('');
    }
  };

  const toggleNoteForm = (evidenceId) => {
    setNoteEvidenceId(noteEvidenceId === evidenceId ? '' : evidenceId);
    setNoteSubject('');
    setNoteDraft('');
    setNoteError('');
    setNoteSuccess('');
  };

  const submitEvidenceNote = async (event, evidenceId) => {
    event.preventDefault();
    const subject = noteSubject.trim();
    const note = noteDraft.trim();
    if (!subject || !note || savingNote) return;

    setSavingNote(true);
    setNoteError('');
    setNoteSuccess('');
    try {
      const result = await onAddEvidenceNote?.(evidenceId, subject, note);
      if (!result?.success) {
        setNoteError(result?.error || 'Unable to save this note.');
        return;
      }
      setNoteSubject('');
      setNoteDraft('');
      setNoteEvidenceId('');
      setNoteSuccess('Note added.');
    } catch {
      setNoteError('Unable to save this note. Please try again.');
    } finally {
      setSavingNote(false);
    }
  };

  const openEvidenceFile = async (evidence) => {
    const newWindow = window.open('about:blank', '_blank');
    if (!newWindow) {
      setFileOpenError('Allow pop-ups to open this evidence file.');
      return;
    }

    newWindow.opener = null;
    setFileOpeningId(evidence.id);
    setFileOpenError('');
    try {
      const result = await onOpenEvidenceFile?.(evidence.filePath);
      if (!result?.success || !result.url) {
        newWindow.close();
        setFileOpenError(result?.error || 'Unable to open this evidence file.');
        return;
      }
      const readResult = await onMarkEvidenceRead?.(evidence.id);
      if (readResult && !readResult.success) {
        setFileOpenError(readResult.error || 'Unable to save the evidence read status.');
      }
      newWindow.location.replace(result.url);
    } catch {
      newWindow.close();
      setFileOpenError('Unable to open this evidence file. Please try again.');
    } finally {
      setFileOpeningId('');
    }
  };

  const beginSuperseding = (evidence) => {
    clearFile();
    setSupersedingEvidenceId(evidence.id);
    requestAnimationFrame(() => uploadSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  };

  const scrollToEvidence = (evidenceId) => {
    window.clearTimeout(highlightTimeoutRef.current);
    setExpandedEvidenceControlId(control.id);
    window.requestAnimationFrame(() => {
      const target = evidenceItemRefs.current.get(evidenceId);
      if (!target) return;
      setHighlightedEvidenceId(evidenceId);
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      highlightTimeoutRef.current = window.setTimeout(() => setHighlightedEvidenceId(''), 1800);
    });
  };

  const toggleControlSatisfaction = async () => {
    if (updatingSatisfaction) return;

    setUpdatingSatisfaction(true);
    setSatisfactionError('');
    setSatisfactionSuccess('');
    try {
      const result = await onSetControlSatisfied?.(control.tenantControlStatus !== 'satisfied');
      if (!result?.success) {
        setSatisfactionError(result?.error || 'Unable to update this control.');
        return;
      }
      setSatisfactionSuccess(
        control.tenantControlStatus === 'satisfied'
          ? 'Control marked unsatisfied.'
          : 'Control marked satisfied.'
      );
    } catch {
      setSatisfactionError('Unable to update this control. Please try again.');
    } finally {
      setUpdatingSatisfaction(false);
    }
  };

  return (
    <div className="start-fix-drawer-overlay" onClick={handleClose}>
      <div className="start-fix-drawer" onClick={(event) => event.stopPropagation()}>
        
        {/* Top Header Section */}
        <div className="strategy-name-write">
          <div className="control-code-wrapper">
            <span className="control-code">{control.control_code}</span>
            <span className="level-badge">LEVEL 1 REQ</span>
          </div>
          <div className="strategy-header-row">
            <h2 className="strategy-name">{control.strategy}</h2>
            <button className="close-btn" onClick={handleClose} aria-label="Close drawer">
              <svg 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
                >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="control-disclosure">
            <button
              type="button"
              className="control-disclosure-toggle"
              aria-expanded={showControl}
              aria-controls="control-name-panel"
              onClick={() => setExpandedControlId(showControl ? null : control.id)}
            >
              <span>Show control</span>
              <svg
                className="control-disclosure-arrow"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                {showControl ? (
                  <path d="M7.41 15.41 12 10.83l4.59 4.58L18 14l-6-6-6 6z" />
                ) : (
                  <path d="m7.41 8.59 4.59 4.58 4.59-4.58L18 10l-6 6-6-6z" />
                )}
              </svg>
            </button>
            <div id="control-name-panel" className="control-name" hidden={!showControl}>
              {control.name}
            </div>
          </div>
        </div>

        {/* Compliance State Section */}
        <div className="compliance-state-cont">
          <div className="compliance-state-wrapper">
            <div className="compliance-state-header">STRATEGY COMPLIANCE STATE</div>
            <div className="compliance-state">
              <span className="compliance-status-text">
                {control.status === 'unsatisfactory' ? 'Unsatisfactory / Non Compliant' : 'Non Compliant'}
              </span>
              <span className="evidence-flag">
                {evidenceLoading
                  ? 'Loading Evidence'
                  : evidenceFiles.length === 0
                    ? 'No Evidence'
                    : `${evidenceFiles.length} Evidence File${evidenceFiles.length === 1 ? '' : 's'}`}
              </span>
            </div>
            {canReviewEvidence && (
              <button
                className="start-fix-control-satisfaction"
                type="button"
                disabled={updatingSatisfaction}
                onClick={toggleControlSatisfaction}
              >
                {updatingSatisfaction
                  ? 'Updating...'
                  : control.tenantControlStatus === 'satisfied'
                    ? 'Mark control unsatisfied'
                    : 'Mark control satisfied'}
              </button>
            )}
            {satisfactionError && <p className="start-fix-evidence-message is-error" role="alert">{satisfactionError}</p>}
            {satisfactionSuccess && <p className="start-fix-evidence-message is-success" role="status">{satisfactionSuccess}</p>}
          </div>
        </div>

        <section className="start-fix-evidence-wrapper" aria-labelledby="start-fix-evidence-title">
          <div className="start-fix-evidence-heading">
            <h3 className="start-fix-evidence-title" id="start-fix-evidence-title">Evidence</h3>
            <BtnSecondary
              className="btn-small drawer-evidence-toggle"
              type="button"
              aria-expanded={Boolean(showEvidence)}
              aria-controls={`start-fix-evidence-panel-${control.id}`}
              onClick={() => setExpandedEvidenceControlId(showEvidence ? null : control.id)}
            >
              {showEvidence ? 'Hide evidence' : 'Show evidence'}
            </BtnSecondary>
          </div>
          <div
            className="start-fix-evidence-panel"
            id={`start-fix-evidence-panel-${control.id}`}
            hidden={!showEvidence}
          >
            {evidenceLoading ? (
              <p className="start-fix-evidence-message">Loading evidence...</p>
            ) : evidenceError ? (
              <p className="start-fix-evidence-message is-error" role="alert">{evidenceError}</p>
            ) : evidenceFiles.length === 0 ? (
              <p className="start-fix-evidence-message">No evidence has been submitted for this control.</p>
            ) : (
              <ul className="start-fix-evidence-list">
                {evidenceFiles.map((evidence) => {
                  const unreadNotesCount = evidence.notes?.filter((note) => note.isUnread).length ?? 0;
                  return (
                  <li
                    className={`start-fix-evidence-item${highlightedEvidenceId === evidence.id ? ' is-chain-highlighted' : ''}`}
                    key={evidence.id}
                    ref={(element) => {
                      if (element) evidenceItemRefs.current.set(evidence.id, element);
                      else evidenceItemRefs.current.delete(evidence.id);
                    }}
                  >
                    <div className="start-fix-evidence-file-heading">
                      <strong className={`start-fix-evidence-file-name${evidence.isUnread ? ' is-unread' : ''}`}>{evidence.fileName}</strong>
                      <span className={`start-fix-evidence-status is-${evidence.approvalStatus}`}>
                        {evidenceStatusLabels[evidence.approvalStatus] || 'Unknown Status'}
                      </span>
                    </div>
                    <p className="start-fix-evidence-metadata">
                      Uploaded by {evidence.uploadedBy} · {formatEvidenceDate(evidence.uploadedAt)}
                    </p>
                    {evidence.approvedBy && evidence.approvedAt && (
                      <p className="start-fix-evidence-metadata">
                        Approved by {evidence.approvedBy} · {formatEvidenceDate(evidence.approvedAt)}
                      </p>
                    )}
                    {evidence.approvalStatus === 'rejected' && evidence.reviewedBy && (
                      <p className="start-fix-evidence-metadata">Reviewed by {evidence.reviewedBy}</p>
                    )}
                    {evidence.description && (
                      <p className="start-fix-evidence-note">{evidence.description}</p>
                    )}
                    {evidence.approvalStatus === 'rejected' && evidence.reviewReason && (
                      <p className="start-fix-evidence-reason">
                        <strong>Rejection reason:</strong> {evidence.reviewReason}
                      </p>
                    )}
                    <div className="start-fix-evidence-footer">
                      <div className="start-fix-evidence-actions">
                      <button
                        className="start-fix-evidence-action is-open"
                        type="button"
                        disabled={Boolean(fileOpeningId)}
                        onClick={() => openEvidenceFile(evidence)}
                      >
                        {fileOpeningId === evidence.id ? 'Opening...' : 'Open file'}
                      </button>
                      {evidence.approvalStatus === 'rejected' && !evidence.supersededById && (
                        <button
                          className="start-fix-evidence-action is-supersede"
                          type="button"
                          onClick={() => beginSuperseding(evidence)}
                        >
                          Create superseder
                        </button>
                      )}
                      {canReviewEvidence && evidence.approvalStatus === 'pending_approval' && (
                        <>
                          <button
                            className="start-fix-evidence-action is-approve"
                            type="button"
                            disabled={Boolean(reviewingEvidenceId)}
                            onClick={() => approveEvidence(evidence.id)}
                          >
                            {reviewingEvidenceId === evidence.id ? 'Saving...' : 'Approve'}
                          </button>
                          <button
                            className="start-fix-evidence-action is-reject"
                            type="button"
                            disabled={Boolean(reviewingEvidenceId)}
                            onClick={() => openRejectionDialog(evidence.id)}
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {canReviewEvidence && (
                        <BtnSecondary
                          className="btn-small drawer-note-toggle"
                          type="button"
                          disabled={savingNote}
                          onClick={() => toggleNoteForm(evidence.id)}
                        >
                          {noteEvidenceId === evidence.id ? 'Cancel note' : 'Add note'}
                        </BtnSecondary>
                      )}
                      {(evidence.supersedesEvidenceId || evidence.supersededById) && (
                        <div className="start-fix-evidence-chain-actions" role="group" aria-label="Evidence chain navigation">
                          {evidence.supersedesEvidenceId && (
                            <button
                              className="start-fix-evidence-link"
                              type="button"
                              onClick={() => scrollToEvidence(evidence.supersedesEvidenceId)}
                            >
                              Superseding
                            </button>
                          )}
                          {evidence.supersededById && (
                            <button
                              className="start-fix-evidence-link"
                              type="button"
                              onClick={() => scrollToEvidence(evidence.supersededById)}
                            >
                              Superseded by
                            </button>
                          )}
                        </div>
                      )}
                      </div>
                      {evidence.notes?.length > 0 && (
                        <div className="start-fix-evidence-links" role="group" aria-label="Evidence notes">
                          {evidence.notes?.length > 0 && (
                            <button
                              className="start-fix-evidence-link"
                              type="button"
                              onClick={() => setNotesEvidenceId(evidence.id)}
                            >
                              View notes{unreadNotesCount > 0 ? ` (${unreadNotesCount})` : ''}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    {reviewError && reviewErrorEvidenceId === evidence.id && !rejectingEvidenceId && (
                      <p className="start-fix-evidence-message is-error" role="alert">{reviewError}</p>
                    )}
                    {noteEvidenceId === evidence.id && canReviewEvidence && (
                      <form className="start-fix-evidence-note-form" onSubmit={(event) => submitEvidenceNote(event, evidence.id)}>
                        <label className="start-fix-evidence-note-label" htmlFor={`evidence-note-subject-${evidence.id}`}>
                          Subject
                        </label>
                        <input
                          id={`evidence-note-subject-${evidence.id}`}
                          className="start-fix-evidence-note-subject"
                          type="text"
                          value={noteSubject}
                          onChange={(event) => setNoteSubject(event.target.value)}
                          maxLength={120}
                          required
                        />
                        <label className="start-fix-evidence-note-label" htmlFor={`evidence-note-${evidence.id}`}>Note</label>
                        <textarea
                          id={`evidence-note-${evidence.id}`}
                          value={noteDraft}
                          onChange={(event) => setNoteDraft(event.target.value)}
                          maxLength={2000}
                          required
                          rows={3}
                        />
                        {noteError && <p className="start-fix-evidence-message is-error" role="alert">{noteError}</p>}
                        <button className="start-fix-evidence-action is-note" type="submit" disabled={savingNote || !noteSubject.trim() || !noteDraft.trim()}>
                          {savingNote ? 'Saving...' : 'Save note'}
                        </button>
                      </form>
                    )}
                  </li>
                  );
                })}
              </ul>
            )}
            {evidenceNoteError && (
              <p className="start-fix-evidence-message is-error" role="status">{evidenceNoteError}</p>
            )}
            {fileOpenError && <p className="start-fix-evidence-message is-error" role="alert">{fileOpenError}</p>}
            {noteSuccess && <p className="start-fix-evidence-message is-success" role="status">{noteSuccess}</p>}
          </div>
        </section>

        <dialog
          className="start-fix-rejection-dialog"
          ref={rejectionDialogRef}
          aria-labelledby={`start-fix-rejection-title-${control.id}`}
          onClose={closeRejectionDialog}
        >
          <form onSubmit={submitRejection}>
            <h2 id={`start-fix-rejection-title-${control.id}`}>Reject evidence</h2>
            <p>Provide a reason for rejecting this file.</p>
            <label htmlFor={`start-fix-rejection-reason-${control.id}`}>Rejection reason</label>
            <textarea
              id={`start-fix-rejection-reason-${control.id}`}
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
              maxLength={2000}
              required
              rows={4}
            />
            {reviewError && <p className="start-fix-evidence-message is-error" role="alert">{reviewError}</p>}
            <div className="start-fix-rejection-actions">
              <BtnSecondary
                className="btn-small"
                type="button"
                disabled={Boolean(reviewingEvidenceId)}
                onClick={() => rejectionDialogRef.current?.close()}
              >
                Cancel
              </BtnSecondary>
              <button
                className="start-fix-evidence-action is-reject"
                type="submit"
                disabled={Boolean(reviewingEvidenceId) || !rejectionReason.trim()}
              >
                {reviewingEvidenceId ? 'Saving...' : 'Reject file'}
              </button>
            </div>
          </form>
        </dialog>

        {/* Upload Section */}
        <div className="upload-cont" ref={uploadSectionRef}>
          {supersedingEvidenceId && (
            <div className="start-fix-superseding-banner">
              <span>Creating a superseder for {evidenceFiles.find((item) => item.id === supersedingEvidenceId)?.fileName || 'rejected evidence'}.</span>
              <button type="button" onClick={() => setSupersedingEvidenceId('')}>Cancel</button>
            </div>
          )}
          <div className="upload-heading">UPLOAD EVIDENCE FILE</div>
          <div className="upload-wrapper">
            <div className="upload-img">
              <div className="upload-icon-box">
                <svg xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 -960 960 960" 
                  >
                  <path d="M440-200h80v-167l64 64 56-57-160-160-160 160 57 56 63-63v167ZM240-80q-33 0-56.5-23.5T160-160v-640q0-33 23.5-56.5T240-880h320l240 240v480q0 33-23.5 56.5T720-80H240Zm280-520v-200H240v640h480v-440H520ZM240-800v200-200 640-640Z"/>
                </svg>
              </div>
              <div className="upload-text">Drag & drop exported report or screenshot here</div>
              <div className="upload-subtext">Supports exports from NinjaOne, Datto, M365 (Max 50MB)</div>
              {file && (
                <div className="file-selected-name">
                  <span>Selected: {file.name}</span>
                  <button
                    type="button"
                    className="uploaded-file-delete"
                    aria-label={`Delete ${file.name}`}
                    onClick={clearFile}
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      viewBox="0 0 24 24" 
                      aria-hidden="true"
                      >
                        <path d="M7,21q-0.82,0-1.41-0.59T5,19V6H4V4H9V3h6V4h5V6H19V19q0,0.82-0.59,1.41T17,21H7ZM17,6H7V19H17V6ZM9,17h2V8H9v9Zm4,0h2V8H13v9ZM7,6V19V6Z"/>
                    </svg>
                  </button>
                </div>
              )}
              <input 
                ref={fileInputRef}
                type="file" 
                className="file-hidden-input" 
                accept=".pdf,.csv,.txt,.xlsx,.png,.jpg,.jpeg,application/pdf,text/csv,application/csv,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/png,image/jpeg"
                onChange={handleFileChange} 
              />
            </div>
          </div>
        </div>

        {/* Action Button Footer */}
        <div className="drawer-actions">
          {submitError && <p className="evidence-submit-message is-error" role="alert">{submitError}</p>}
          {submitSuccess && <p className="evidence-submit-message is-success" role="status">{submitSuccess}</p>}
          <BtnMain
            onClick={handleSubmitEvidence}
            disabled={!file || isSubmitting}
          >
            {isSubmitting ? 'Uploading...' : supersedingEvidenceId ? 'Submit Superseder' : 'Submit Evidence'}
          </BtnMain>
        </div>

        {notesEvidenceId && (
          <NotesViewer
            evidence={evidenceFiles.find((item) => item.id === notesEvidenceId)}
            loading={evidenceLoading}
            onClose={() => setNotesEvidenceId('')}
            onMarkRead={onMarkNoteRead}
          />
        )}

      </div>
    </div>
  );
}