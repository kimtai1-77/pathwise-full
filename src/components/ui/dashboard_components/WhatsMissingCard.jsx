
import { useEffect, useId, useRef, useState } from 'react';
import ControlsImplemented from './ControlsImplemented.jsx';
import './styles/WhatsMissingCard.css';

export function WhatsMissingCard({ 
  whatsMissing = [], 
  loading = false, 
  onOpenFixDrawer 
}) {
  const [selectedNote, setSelectedNote] = useState(null);
  const [listExpanded, setListExpanded] = useState(false);
  const [listOverflows, setListOverflows] = useState(false);
  const noteDialogRef = useRef(null);
  const missingListRef = useRef(null);
  const missingListId = useId();

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

  if (loading) {
    return (
      <div className="missing-card-cont loading">
        <p>Loading control gaps...</p>
      </div>
    );
  }

  if (whatsMissing.length === 0) {
    return (
      <div className="missing-card-cont all-compliant">
        <ControlsImplemented />
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
      <ul
        className={`missing-card-text missing-card-text-cont${listExpanded ? ' is-expanded' : ''}`}
        id={missingListId}
        ref={missingListRef}
      >
        {whatsMissing.map((control) => (
          <li key={control.id} className="missing-card-row">
            <div className="missing-card-row-left">
              <h6 className="missing-card-code">{control.control_code}</h6>
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
    </div>
  );
}