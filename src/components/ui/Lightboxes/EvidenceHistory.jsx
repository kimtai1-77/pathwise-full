import { useEffect, useState } from 'react';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock.js';
import { buildEvidenceHistoryEntries, getEvidenceChain } from '@/utils/evidenceExpiry.js';
import './EvidenceHistory.css';

const PAGE_SIZE = 25;

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString();
}

export function EvidenceHistory({
  evidenceId,
  evidenceFiles = [],
  expirationEvents = [],
  reviewEvents = [],
  onOpenEvidenceFile,
  onClose,
}) {
  const [page, setPage] = useState(1);
  const [openingEvidenceId, setOpeningEvidenceId] = useState('');
  const [fileOpenError, setFileOpenError] = useState('');
  useBodyScrollLock(true);

  const selectedEvidence = evidenceFiles.find((evidence) => evidence.id === evidenceId);
  const evidenceChain = getEvidenceChain(evidenceFiles, evidenceId);
  const chainIds = new Set(evidenceChain.map((evidence) => evidence.id));
  const chainEvents = expirationEvents.filter((event) => chainIds.has(event.evidenceId));
  const chainReviews = reviewEvents.filter((event) => chainIds.has(event.evidenceId));
  const entries = buildEvidenceHistoryEntries(evidenceChain, chainEvents, chainReviews);
  const pageCount = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageEntries = entries.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const visiblePageNumbers = [...new Set([1, currentPage - 1, currentPage, currentPage + 1, pageCount])]
    .filter((pageNumber) => pageNumber >= 1 && pageNumber <= pageCount)
    .sort((left, right) => left - right);
  const pageControls = visiblePageNumbers.flatMap((pageNumber, index) => {
    const previousPage = visiblePageNumbers[index - 1];
    return [
      ...(previousPage && pageNumber - previousPage > 1 ? [`ellipsis-${previousPage}`] : []),
      pageNumber,
    ];
  });

  async function openEvidenceFile(evidenceId) {
    const evidence = evidenceFiles.find((item) => item.id === evidenceId);
    if (!evidence?.filePath || openingEvidenceId) {
      setFileOpenError('The file is unavailable.');
      return;
    }

    const newWindow = window.open('about:blank', '_blank');
    if (!newWindow) {
      setFileOpenError('Allow pop-ups to open this evidence file.');
      return;
    }

    newWindow.opener = null;
    setOpeningEvidenceId(evidenceId);
    setFileOpenError('');
    try {
      const result = await onOpenEvidenceFile?.(evidence.filePath);
      if (!result?.success || !result.url) {
        newWindow.close();
        setFileOpenError(result?.error || 'Unable to open this evidence file.');
        return;
      }
      newWindow.location.replace(result.url);
    } catch {
      newWindow.close();
      setFileOpenError('Unable to open this evidence file. Please try again.');
    } finally {
      setOpeningEvidenceId('');
    }
  }

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="evidence-history-overlay" onClick={onClose}>
      <section
        className="evidence-history-lightbox"
        role="dialog"
        aria-modal="true"
        aria-labelledby="evidence-history-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="evidence-history-header">
          <div>
            <span className="evidence-history-eyebrow">EVIDENCE AUDIT TRAIL</span>
            <h2 id="evidence-history-title">Evidence history</h2>
            <p>{selectedEvidence?.fileName || 'Selected evidence'} · {evidenceChain.length} file version{evidenceChain.length === 1 ? '' : 's'}</p>
          </div>
          <button className="evidence-history-close" type="button" onClick={onClose} aria-label="Close evidence history">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        {fileOpenError && <p className="evidence-history-error" role="alert">{fileOpenError}</p>}
        {entries.length === 0 ? (
          <p className="evidence-history-empty">No history is available for this evidence.</p>
        ) : (
          <>
            <div className="evidence-history-table-wrap">
              <table className="evidence-history-table">
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Event</th>
                    <th scope="col">File</th>
                    <th scope="col">Details</th>
                    <th scope="col">Updated by</th>
                  </tr>
                </thead>
                <tbody>
                  {pageEntries.map((entry) => (
                    <tr
                      className={entry.evidenceId === evidenceId ? 'is-selected' : ''}
                      key={entry.id}
                      aria-current={entry.evidenceId === evidenceId ? 'true' : undefined}
                    >
                      <td>{formatDate(entry.timestamp)}</td>
                      <td>{entry.event}</td>
                      <td className="evidence-history-filename">
                        <button
                          className="evidence-history-file-link"
                          type="button"
                          aria-label={`Open ${entry.fileName}`}
                          disabled={openingEvidenceId === entry.evidenceId}
                          onClick={() => void openEvidenceFile(entry.evidenceId)}
                        >
                          {openingEvidenceId === entry.evidenceId ? 'Opening...' : entry.fileName}
                        </button>
                      </td>
                      <td>{entry.details || '—'}</td>
                      <td>{entry.actor || 'Unknown user'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <nav className="evidence-history-pagination" aria-label="Evidence history pages">
              <span>{entries.length} events</span>
              <div>
                <button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>
                  Previous
                </button>
                {pageControls.map((pageControl) => typeof pageControl === 'string' ? (
                  <span className="evidence-history-page-ellipsis" aria-hidden="true" key={pageControl}>...</span>
                ) : (
                  <button
                    className={pageControl === currentPage ? 'is-current' : ''}
                    type="button"
                    aria-current={pageControl === currentPage ? 'page' : undefined}
                    key={pageControl}
                    onClick={() => setPage(pageControl)}
                  >
                    {pageControl}
                  </button>
                ))}
                <button type="button" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>
                  Next
                </button>
              </div>
            </nav>
          </>
        )}
      </section>
    </div>
  );
}