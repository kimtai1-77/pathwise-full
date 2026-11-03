
import { OverallScoreCard } from './OverallScoreCard.jsx';
import './styles/TopDashRow.css';

export default function TopDashRow({ tenantName, scores = [] }) {
  return (
    <div className="top-row-wrapper">
      <div className="top-row-cont">
        <div className="top-row-tag">
          <span className="tag-dot" aria-hidden="true"></span>
          <p className="top-row-name">Active Compliance Scoring</p>
        </div>

        <h1 className="top-row-heading">{tenantName}</h1>

        <p className="top-row-text">
          Tracking the tenant's risk posture in real time.
        </p>
      </div>

      <div className="overall-score-card-placeholder">
        <OverallScoreCard scores={scores} />
      </div>
    </div>
  );
}