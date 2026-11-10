import { useState } from 'react';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock.js';
import { NotesViewer } from './NotesViewer.jsx';
import './ControlsSatisfied.css';

const evidenceStatusLabels = {
  pending_approval: 'Pending approval',
  approved: 'Approved',
  rejected: 'Rejected',
};

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
}

export function ControlsSatisfied({
  strategyName,
  controls = [],
  evidenceByControl = {},
  evidenceLoading = false,
  evidenceError = '',
  canReset = false,
  onResetControl,
  onOpenEvidenceFile,
  onMarkEvidenceRead,
  onMarkNoteRead,
  onClose,
}) {
  const [expandedControlId, setExpandedControlId] = useState(controls[0]?.tenantControlId || '');
  const [resetConfirmationId, setResetConfirmationId] = useState('');
  const [resettingControlId, setResettingControlId] = useState('');
  const [resetError, setResetError] = useState('');
  const [notesEvidenceId, setNotesEvidenceId] = useState('');
  const [fileOpeningId, setFileOpeningId] = useState('');
  const [fileOpenError, setFileOpenError] = useState('');
  useBodyScrollLock(true);

  async function resetControl(control) {
    if (!control.tenantControlId || resettingControlId) return;
    setResettingControlId(control.tenantControlId);
    setResetError('');
    try {
      const result = await onResetControl?.(control.tenantControlId);
      if (!result?.success) {
        setResetError(result?.error || 'Unable to reset this control.');
        return;
      }
      setResetConfirmationId('');
    } catch {
      setResetError('Unable to reset this control. Please try again.');
    } finally {
      setResettingControlId('');
    }
  }

  async function openEvidenceFile(evidence) {
    if (!evidence.filePath || fileOpeningId) return;

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
  }

  return (
    <div className="controls-satisfied-overlay" onClick={onClose}>
      <aside
        className="controls-satisfied-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="controls-satisfied-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="controls-satisfied-header">
          <div>
            <span className="controls-satisfied-eyebrow">IMPLEMENTED CONTROLS</span>
            <h2 id="controls-satisfied-title">Satisfied controls ({controls.length})</h2>
            <p>{strategyName}</p>
          </div>
          <button className="controls-satisfied-close" type="button" onClick={onClose} aria-label="Close satisfied controls">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        {evidenceError && <p className="controls-satisfied-error" role="alert">{evidenceError}</p>}
        {fileOpenError && <p className="controls-satisfied-error" role="alert">{fileOpenError}</p>}
        {resetError && <p className="controls-satisfied-error" role="alert">{resetError}</p>}

        <ol className="controls-satisfied-list">
          {controls.map((control) => {
            const isExpanded = expandedControlId === control.tenantControlId;
            const evidenceFiles = evidenceByControl[control.id] || [];
            const satisfiedAt = formatDate(control.satisfiedOn);

            return (
              <li className="controls-satisfied-item" key={control.tenantControlId}>
                <div className="controls-satisfied-control-row">
                  <button
                    className="controls-satisfied-control-toggle"
                    type="button"
                    aria-expanded={isExpanded}
                    aria-controls={`satisfied-control-${control.tenantControlId}`}
                    onClick={() => setExpandedControlId(isExpanded ? '' : control.tenantControlId)}
                  >
                    <span className="controls-satisfied-code">{control.control_code}</span>
                    <span className="controls-satisfied-name">{control.name}</span>
                    <span className="controls-satisfied-status">Satisfied</span>
                  </button>
                  {canReset && (
                    <button
                      className="controls-satisfied-reset"
                      type="button"
                      disabled={Boolean(resettingControlId)}
                      onClick={() => {
                        setResetError('');
                        setResetConfirmationId(control.tenantControlId);
                      }}
                    >
                      Reset
                    </button>
                  )}
                </div>

                {satisfiedAt && (
                  <p className="controls-satisfied-meta">
                    Satisfied by {control.satisfiedByName || 'Unknown user'} · {satisfiedAt}
                  </p>
                )}

                {resetConfirmationId === control.tenantControlId && (
                  <div className="controls-satisfied-confirm" role="group" aria-label={`Confirm reset for ${control.control_code}`}>
                    <p>Reset this control to the missing list? Its evidence and notes will remain.</p>
                    <div className="controls-satisfied-confirm-actions">
                      <button type="button" onClick={() => setResetConfirmationId('')} disabled={Boolean(resettingControlId)}>
                        Cancel
                      </button>
                      <button
                        className="is-danger"
                        type="button"
                        disabled={Boolean(resettingControlId)}
                        onClick={() => void resetControl(control)}
                      >
                        {resettingControlId === control.tenantControlId ? 'Resetting...' : 'Reset control'}
                      </button>
                    </div>
                  </div>
                )}

                {isExpanded && (
                  <div className="controls-satisfied-details" id={`satisfied-control-${control.tenantControlId}`}>
                    {evidenceLoading ? (
                      <p className="controls-satisfied-empty" role="status">Loading evidence...</p>
                    ) : evidenceFiles.length === 0 ? (
                      <p className="controls-satisfied-empty">No evidence has been submitted for this control.</p>
                    ) : (
                      <ul className="controls-satisfied-evidence-list">
                        {evidenceFiles.map((evidence) => {
                          const unreadNotesCount = evidence.notes?.filter((note) => note.isUnread).length ?? 0;
                          return (
                          <li className="controls-satisfied-evidence" key={evidence.id}>
                            <div className="controls-satisfied-evidence-heading">
                              <strong>{evidence.fileName}</strong>
                              <span className={`controls-satisfied-evidence-status is-${evidence.approvalStatus}`}>
                                {evidenceStatusLabels[evidence.approvalStatus] || 'Unknown status'}
                              </span>
                            </div>
                            <p>Uploaded by {evidence.uploadedBy} · {formatDate(evidence.uploadedAt)}</p>
                            {evidence.approvedBy && evidence.approvedAt && (
                              <p>Approved by {evidence.approvedBy} · {formatDate(evidence.approvedAt)}</p>
                            )}
                            {evidence.approvalStatus === 'rejected' && evidence.reviewedBy && (
                              <p>Reviewed by {evidence.reviewedBy}</p>
                            )}
                            {evidence.description && <p>{evidence.description}</p>}
                            {evidence.approvalStatus === 'rejected' && evidence.reviewReason && (
                              <p><strong>Reason:</strong> {evidence.reviewReason}</p>
                            )}
                            <div className="controls-satisfied-evidence-actions">
                              <button
                                type="button"
                                disabled={Boolean(fileOpeningId)}
                                onClick={() => void openEvidenceFile(evidence)}
                              >
                                {fileOpeningId === evidence.id ? 'Opening...' : 'Open file'}
                              </button>
                              {evidence.notes?.length > 0 && (
                                <button type="button" onClick={() => setNotesEvidenceId(evidence.id)}>
                                  View notes{unreadNotesCount > 0 ? ` (${unreadNotesCount})` : ''}
                                </button>
                              )}
                            </div>
                          </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>

        {notesEvidenceId && (
          <NotesViewer
            evidence={evidenceByControl[controls.find((control) => control.tenantControlId === expandedControlId)?.id]
              ?.find((evidence) => evidence.id === notesEvidenceId)}
            loading={evidenceLoading}
            onClose={() => setNotesEvidenceId('')}
            onMarkRead={onMarkNoteRead}
          />
        )}
      </aside>
    </div>
  );
}