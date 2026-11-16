import { useRef, useState } from 'react';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock.js';
import { EvidenceValidityDialog } from '@/components/ui/Lightboxes/EvidenceValidityDialog.jsx';
import './styles/EvidenceExpiryStatus.css';

const FILE_ACCEPT = '.pdf,.csv,.txt,.xlsx,.png,.jpg,.jpeg,application/pdf,text/csv,application/csv,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/png,image/jpeg';

const approvalLabels = {
  pending_approval: 'Pending approval',
  approved: 'Approved',
  rejected: 'Rejected',
};

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString();
}

export function EvidenceExpiryStatus({
  strategyName,
  status,
  evidenceFiles = [],
  readOnly = false,
  onClose,
  onOpenEvidenceFile,
  onUpdateEvidence,
  onRenewEvidence,
  onOpenHistory,
}) {
  const [renewingEvidence, setRenewingEvidence] = useState(null);
  const [pendingUpdate, setPendingUpdate] = useState(null);
  const [workingEvidenceId, setWorkingEvidenceId] = useState('');
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const fileInputs = useRef(new Map());
  useBodyScrollLock(true);

  const isExpired = status === 'expired';
  const visibleEvidence = evidenceFiles
    .filter((evidence) => evidence.isCurrent && evidence.expiryStatus === status)
    .sort((left, right) => new Date(left.expiresAt) - new Date(right.expiresAt));
  const pageCount = Math.max(1, Math.ceil(visibleEvidence.length / 25));
  const currentPage = Math.min(page, pageCount);
  const pageEvidence = visibleEvidence.slice((currentPage - 1) * 25, currentPage * 25);

  async function openEvidenceFile(evidence) {
    if (!evidence.filePath || workingEvidenceId) return;

    const newWindow = window.open('about:blank', '_blank');
    if (!newWindow) {
      setError('Allow pop-ups to open this evidence file.');
      return;
    }

    newWindow.opener = null;
    setWorkingEvidenceId(evidence.id);
    setError('');
    try {
      const result = await onOpenEvidenceFile?.(evidence.filePath);
      if (!result?.success || !result.url) {
        newWindow.close();
        setError(result?.error || 'Unable to open this evidence file.');
        return;
      }
      newWindow.location.replace(result.url);
    } catch {
      newWindow.close();
      setError('Unable to open this evidence file. Please try again.');
    } finally {
      setWorkingEvidenceId('');
    }
  }

  async function updateEvidence(evidence, file, validityDays) {
    setWorkingEvidenceId(evidence.id);
    setError('');
    try {
      const result = await onUpdateEvidence?.(evidence, file, validityDays);
      if (!result?.success) {
        setError(result?.error || 'Unable to upload the updated evidence.');
        return;
      }
      setPendingUpdate(null);
    } catch {
      setError('Unable to upload the updated evidence. Please try again.');
    } finally {
      setWorkingEvidenceId('');
    }
  }

  async function saveRenewal(evidence, renewalDays) {
    if (!evidence || workingEvidenceId) return;

    setWorkingEvidenceId(evidence.id);
    setError('');
    try {
      const result = await onRenewEvidence?.(evidence, renewalDays);
      if (!result?.success) {
        setError(result?.error || 'Unable to renew this evidence.');
        return;
      }
      setRenewingEvidence(null);
    } catch {
      setError('Unable to renew this evidence. Please try again.');
    } finally {
      setWorkingEvidenceId('');
    }
  }

  return (
    <div className="evidence-expiry-overlay" onClick={onClose}>
      <aside
        className="evidence-expiry-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="evidence-expiry-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="evidence-expiry-header">
          <div>
            <span className={`evidence-expiry-eyebrow${isExpired ? ' is-expired' : ''}`}>
              {isExpired ? 'EXPIRED EVIDENCE' : 'EXPIRING EVIDENCE'}
            </span>
            <h2 id="evidence-expiry-title">
              {isExpired ? 'Evidence expired' : 'Almost expiring'} ({visibleEvidence.length})
            </h2>
            <p>{strategyName}</p>
          </div>
          <button className="evidence-expiry-close" type="button" onClick={onClose} aria-label="Close expiry status">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        {error && <p className="evidence-expiry-error" role="alert">{error}</p>}
        <ol className="evidence-expiry-list">
          {visibleEvidence.length === 0 ? (
            <li className="evidence-expiry-empty">No matching evidence.</li>
          ) : pageEvidence.map((evidence) => (
            <li className="evidence-expiry-row" key={evidence.id}>
              <div className="evidence-expiry-row-main">
                <div className="evidence-expiry-file-info">
                  <h3>{evidence.fileName}</h3>
                  <p className={`evidence-expiry-state${isExpired ? ' is-expired' : ''}`}>
                    {isExpired
                      ? `Expired ${evidence.expiryDays} ${evidence.expiryDays === 1 ? 'day' : 'days'} ago`
                      : `Expires in ${evidence.expiryDays} ${evidence.expiryDays === 1 ? 'day' : 'days'}`}
                  </p>
                  <p className="evidence-expiry-control">
                    {evidence.controlCode} · {evidence.controlName}
                  </p>
                </div>
                <div className="evidence-expiry-row-side">
                  <span className={`evidence-expiry-approval is-${evidence.approvalStatus}`}>
                    {approvalLabels[evidence.approvalStatus] || 'Unknown status'}
                  </span>
                  {!readOnly && (
                    <button
                      className="evidence-expiry-renew"
                      type="button"
                      disabled={Boolean(workingEvidenceId)}
                      onClick={() => setRenewingEvidence(evidence)}
                    >
                      Renew
                    </button>
                  )}
                </div>
              </div>
              <div className="evidence-expiry-row-actions">
                <button type="button" disabled={Boolean(workingEvidenceId)} onClick={() => void openEvidenceFile(evidence)}>
                  {workingEvidenceId === evidence.id ? 'Opening...' : 'Open'}
                </button>
                {!readOnly && (
                  <>
                    <button
                      type="button"
                      disabled={Boolean(workingEvidenceId)}
                      onClick={() => fileInputs.current.get(evidence.id)?.click()}
                    >
                      Update
                    </button>
                    <input
                      ref={(element) => {
                        if (element) fileInputs.current.set(evidence.id, element);
                        else fileInputs.current.delete(evidence.id);
                      }}
                      className="evidence-expiry-file-input"
                      type="file"
                      accept={FILE_ACCEPT}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = '';
                        if (file) {
                          setError('');
                          setPendingUpdate({ evidence, file });
                        }
                      }}
                    />
                  </>
                )}
                <span className="evidence-expiry-uploaded-by">
                  Uploaded by {evidence.uploadedBy} · {formatDate(evidence.uploadedAt)}
                </span>
                <button
                  className="evidence-expiry-history-link"
                  type="button"
                  onClick={() => onOpenHistory?.(evidence.id)}
                >
                  Show history
                </button>
              </div>
            </li>
          ))}
        </ol>
        {pageCount > 1 && (
          <nav className="evidence-expiry-pagination" aria-label="Evidence status pages">
            <span>{visibleEvidence.length} files</span>
            <div>
              <button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>
                Previous
              </button>
              {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
                <button
                  className={pageNumber === currentPage ? 'is-current' : ''}
                  type="button"
                  aria-current={pageNumber === currentPage ? 'page' : undefined}
                  key={pageNumber}
                  onClick={() => setPage(pageNumber)}
                >
                  {pageNumber}
                </button>
              ))}
              <button type="button" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>
                Next
              </button>
            </div>
          </nav>
        )}

        {renewingEvidence && (
          <EvidenceValidityDialog
            title="Renew evidence"
            saving={workingEvidenceId === renewingEvidence.id}
            error={error}
            onSet={(days) => void saveRenewal(renewingEvidence, days)}
            onSkip={(days) => void saveRenewal(renewingEvidence, days)}
          />
        )}
        {pendingUpdate && (
          <EvidenceValidityDialog
            title="Set replacement validity"
            saving={workingEvidenceId === pendingUpdate.evidence.id}
            error={error}
            onSet={(days) => void updateEvidence(pendingUpdate.evidence, pendingUpdate.file, days)}
            onSkip={(days) => void updateEvidence(pendingUpdate.evidence, pendingUpdate.file, days)}
          />
        )}
      </aside>
    </div>
  );
}