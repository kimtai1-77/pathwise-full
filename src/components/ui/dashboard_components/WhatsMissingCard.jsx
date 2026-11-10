
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import ControlsImplemented from './ControlsImplemented.jsx';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock.js';
import './styles/WhatsMissingCard.css';

export function WhatsMissingCard({ 
  whatsMissing = [], 
  loading = false, 
  error = '',
  evidenceByControl = {},
  evidenceError = '',
  onOpenFixDrawer,
  canResetControls = false,
  onResetControls,
}) {
  const [selectedNote, setSelectedNote] = useState(null);
  const [listExpanded, setListExpanded] = useState(false);
  const [listOverflows, setListOverflows] = useState(false);
  const [statusTooltip, setStatusTooltip] = useState(null);
  const noteDialogRef = useRef(null);
  const missingListRef = useRef(null);
  const missingListId = useId();
  useBodyScrollLock(Boolean(selectedNote));

  useEffect(() => {
    const list = missingListRef.current;
    if (!list) return;

    const updateOverflow = () => {
      setListOverflows(list.scrollHeight > list.clientHeight + 1);
    };

    updateOverflow();
    const observer = new ResizeObserver(updateOverflow);
    observer.observe(list);
    return () => observer.disconnect();
  }, [loading, listExpanded, whatsMissing.length]);

  useEffect(() => {
    if (selectedNote && noteDialogRef.current && !noteDialogRef.current.open) {
      noteDialogRef.current.showModal();
    }
  }, [selectedNote]);

  const showStatusTooltip = (event, indicator, controlId) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const tooltipWidth = 260;
    const left = Math.min(
      Math.max(bounds.left + bounds.width / 2, tooltipWidth / 2 + 8),
      window.innerWidth - tooltipWidth / 2 - 8
    );
    const isBelow = bounds.top < 64;

    setStatusTooltip({
      id: `missing-card-status-tooltip-${controlId}-${indicator.value}`,
      label: indicator.label,
      left,
      top: isBelow ? bounds.bottom + 8 : bounds.top - 8,
      isBelow,
    });
  };

  if (loading) {
    return (
      <div className="missing-card-cont loading">
        <p>Loading control gaps...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="missing-card-cont loading" role="alert">
        <p>{error}</p>
      </div>
    );
  }

  if (whatsMissing.length === 0) {
    return (
      <div className="missing-card-cont all-compliant">
        <ControlsImplemented canReset={canResetControls} onReset={onResetControls} />
      </div>
    );
  }

  return (
    <div className="missing-card-cont">
      <div className="missing-card-heading">
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 -960 960 960"
          >
          <path d="M508.5-331.5Q520-343 520-360t-11.5-28.5Q497-400 480-400t-28.5 11.5Q440-377 440-360t11.5 28.5Q463-320 480-320t28.5-11.5ZM440-480h80v-200h-80v200Zm40 400q-139-35-229.5-159.5T160-516v-244l320-120 320 120v244q0 152-90.5 276.5T480-80Zm0-84q104-33 172-132t68-220v-189l-240-90-240 90v189q0 121 68 220t172 132Zm0-316Z"/>
        </svg>
        <h6>Missing Controls ({whatsMissing.length})</h6> 
      </div>
      {evidenceError && (
        <p className="missing-card-evidence-error" role="alert">{evidenceError}</p>
      )}
      <ul
        className={`missing-card-text missing-card-text-cont${listExpanded ? ' is-expanded' : ''}`}
        id={missingListId}
        ref={missingListRef}
      >
        {whatsMissing.map((control) => (
          <li key={control.id} className="missing-card-row">
            <div className="missing-card-row-left">
              <div className="missing-card-code-wrapper">
                <h6 className="missing-card-code">{control.control_code}</h6>
                {(() => {
                  const evidenceFiles = evidenceByControl[control.id] || [];
                  const indicators = [
                    {
                      value: 'pending_approval',
                      className: 'pending',
                      label: 'One or more files are pending approval',
                      visible: evidenceFiles.some((evidence) => evidence.approvalStatus === 'pending_approval' && evidence.isUnread),
                    },
                    {
                      value: 'rejected',
                      className: 'rejected',
                      label: 'One or more files were rejected',
                      visible: evidenceFiles.some((evidence) => evidence.isRejectedUnresolved),
                    },
                    {
                      value: 'approved',
                      className: 'approved',
                      label: 'One or more files have been approved',
                      visible: evidenceFiles.some((evidence) => evidence.approvalStatus === 'approved' && evidence.isUnread),
                    },
                    {
                      value: 'admin_note',
                      className: 'note',
                      label: 'One or more files have an admin note',
                      visible: evidenceFiles.some((evidence) => evidence.notes?.some((note) => note.isUnread)),
                    },
                  ].filter((indicator) => indicator.visible);

                  if (indicators.length === 0) return null;

                  return (
                    <span className="missing-card-evidence-status-wrapper" aria-label={`Evidence statuses for ${control.control_code}`}>
                      {indicators.map((indicator) => (
                        <span
                          key={indicator.value}
                          className={`missing-card-evidence-status-cont is-${indicator.className}`}
                          aria-label={indicator.label}
                          aria-describedby={`missing-card-status-tooltip-${control.id}-${indicator.value}`}
                          onMouseEnter={(event) => showStatusTooltip(event, indicator, control.id)}
                          onMouseLeave={() => setStatusTooltip(null)}
                          onFocus={(event) => showStatusTooltip(event, indicator, control.id)}
                          onBlur={() => setStatusTooltip(null)}
                          role="img"
                          tabIndex={0}
                        >
                          <span className="missing-card-evidence-status-dot" aria-hidden="true" />
                        </span>
                      ))}
                    </span>
                  );
                })()}
              </div>
              <div className="missing-card-name">
                <p>{control.name}</p>
                {/* <span className="missing-card-ism">({control.ism_id})</span> */}
              </div>
            </div>
            
            <div className="control-actions">
              {typeof control.admin_note === 'string' && control.admin_note.trim() && (
                <button 
                  type="button" 
                  className="action-btn note-btn" 
                  onClick={() => setSelectedNote(control)}
                  title="View Admin Note"
                >
                  Note
                </button>
              )}

              <button 
                type="button" 
                className="action-btn start-fix-btn" 
                onClick={() => onOpenFixDrawer?.(control)}
                title="Remediate Control"
              >
                <svg
                  className="fix-arrow-icon"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 -960 960 960"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path d="M504-480 320-664l56-56 240 240-240 240-56-56 184-184Z" />
                </svg>
              </button>
            </div>
          </li>
        ))}
      </ul>
      {(listOverflows || listExpanded) && (
        <button
          className="missing-card-expand"
          type="button"
          aria-expanded={listExpanded}
          aria-controls={missingListId}
          onClick={() => setListExpanded((expanded) => !expanded)}
        >
          {listExpanded ? 'See less' : 'See all'}
        </button>
      )}
      <dialog
        ref={noteDialogRef}
        className="admin-note-dialog"
        aria-labelledby="admin-note-dialog-title"
        onClose={() => setSelectedNote(null)}
      >
        {selectedNote && (
          <>
            <div className="admin-note-dialog-heading">
              <div>
                <p className="admin-note-dialog-code">{selectedNote.control_code}</p>
                <h2 id="admin-note-dialog-title">{selectedNote.name}</h2>
              </div>
              <button type="button" onClick={() => noteDialogRef.current?.close()}>
                Close
              </button>
            </div>
            <p className="admin-note-dialog-content">{selectedNote.admin_note}</p>
          </>
        )}
      </dialog>
      {statusTooltip && createPortal(
        <div
          className={`missing-card-evidence-tooltip${statusTooltip.isBelow ? ' is-below' : ''}`}
          id={statusTooltip.id}
          role="tooltip"
          style={{ left: statusTooltip.left, top: statusTooltip.top }}
        >
          {statusTooltip.label}
        </div>,
        document.body
      )}
    </div>
  );
}