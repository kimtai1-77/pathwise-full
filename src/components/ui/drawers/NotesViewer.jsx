import { useState } from 'react';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock.js';
import './NotesViewer.css';

function formatNoteDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString();
}

function noteSubject(note) {
  const subject = note.subject?.trim();
  if (subject) return subject;
  const bodyLine = note.note?.trim().split(/\r?\n/, 1)[0];
  return bodyLine || 'Untitled note';
}

export function NotesViewer({ evidence, loading = false, onClose, onMarkRead }) {
  useBodyScrollLock(true);

  const [expandedNoteId, setExpandedNoteId] = useState('');
  const [readNoteIds, setReadNoteIds] = useState(() => new Set());
  const [error, setError] = useState('');
  const notes = [...(evidence?.notes || [])].sort((first, second) => (
    new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
  ));

  async function toggleNote(note) {
    const shouldExpand = expandedNoteId !== note.id;
    setExpandedNoteId(shouldExpand ? note.id : '');
    setError('');

    if (!shouldExpand || !note.isUnread || readNoteIds.has(note.id)) return;

    const result = await onMarkRead?.(note.id);
    if (result?.success) {
      setReadNoteIds((current) => new Set(current).add(note.id));
    } else {
      setError(result?.error || 'Unable to save the note as read.');
    }
  }

  return (
    <div className="notes-viewer-overlay" onClick={onClose}>
      <aside
        className="notes-viewer-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="notes-viewer-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="notes-viewer-header">
          <div>
            <span className="notes-viewer-eyebrow">EVIDENCE NOTES</span>
            <h2 id="notes-viewer-title">Notes</h2>
            {evidence?.fileName && <p>{evidence.fileName}</p>}
          </div>
          <button className="notes-viewer-close" type="button" onClick={onClose} aria-label="Close notes">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        {error && <p className="notes-viewer-error" role="alert">{error}</p>}

        {loading ? (
          <p className="notes-viewer-empty" role="status">Loading notes...</p>
        ) : notes.length === 0 ? (
          <p className="notes-viewer-empty">No notes for this evidence.</p>
        ) : (
          <ol className="notes-viewer-list">
            {notes.map((note) => {
              const isExpanded = expandedNoteId === note.id;
              const isUnread = note.isUnread && !readNoteIds.has(note.id);
              return (
                <li className="notes-viewer-item" key={note.id}>
                  <button
                    className={`notes-viewer-summary${isUnread ? ' is-unread' : ''}${isExpanded ? ' is-expanded' : ''}`}
                    type="button"
                    aria-expanded={isExpanded}
                    aria-controls={`notes-viewer-note-${note.id}`}
                    onClick={() => void toggleNote(note)}
                  >
                    <span className="notes-viewer-subject">{noteSubject(note)}</span>
                    <span className="notes-viewer-preview">{note.note}</span>
                    <time dateTime={note.createdAt}>{formatNoteDate(note.createdAt)}</time>
                  </button>
                  {isExpanded && (
                    <article className="notes-viewer-detail" id={`notes-viewer-note-${note.id}`}>
                      <h3>{noteSubject(note)}</h3>
                      <p>{note.note}</p>
                      <footer>{note.createdBy} · {formatNoteDate(note.createdAt)}</footer>
                    </article>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </aside>
    </div>
  );
}