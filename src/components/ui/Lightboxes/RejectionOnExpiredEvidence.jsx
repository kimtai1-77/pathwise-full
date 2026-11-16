import './RejectionOnExpiredEvidence.css';

export function RejectionOnExpiredEvidence({ evidenceFileName, onGoToFile, onCancel }) {
  return (
    <div className="expired-evidence-rejection-overlay" onClick={onCancel}>
      <section
        className="expired-evidence-rejection-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="expired-evidence-rejection-title"
        onClick={(event) => event.stopPropagation()}
      >
        <span className="expired-evidence-rejection-eyebrow">EXPIRED EVIDENCE</span>
        <h2 id="expired-evidence-rejection-title">Control cannot be satisfied with one or more expired evidence files.</h2>
        {evidenceFileName && <p>{evidenceFileName}</p>}
        <div className="expired-evidence-rejection-actions">
          <button type="button" onClick={onCancel}>Cancel</button>
          <button type="button" onClick={onGoToFile}>Go to file</button>
        </div>
      </section>
    </div>
  );
}