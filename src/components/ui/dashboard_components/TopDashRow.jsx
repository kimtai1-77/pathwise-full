
import { OverallScoreCard } from './OverallScoreCard.jsx';
import './styles/TopDashRow.css';

export function TopDashRow({ tenantName, scores = [], activeMagicLink, onOpenMagicLink }) {
  return (
    <div className="top-row-wrapper">
      <div className="top-row-cont">
        <div className="top-row-tag">
          <span className="tag-dot" aria-hidden="true"></span>
          <p className="top-row-name">Active Compliance Scoring</p>
        </div>

        <h1 className="top-row-heading">{tenantName}</h1>

        <p className="top-row-text">
          Tracking the tenant's compliance status in real time.
        </p>
        {activeMagicLink && (
          <button
            className="top-row-magic-link-status"
            type="button"
            onClick={onOpenMagicLink}
            aria-label={`External viewer link active for ${activeMagicLink.recipient_email}. View link details.`}
          >
            External viewer link active
          </button>
        )}
      </div>

      <div className="overall-score-card-placeholder">
        <OverallScoreCard scores={scores} />
      </div>
    </div>
  );
}