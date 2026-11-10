
import { calculateStrategyScore } from '@/utils/calculateStrategyScore';
import './styles/StrategyScoreCard.css';

export function StrategyScoreCard({  
  strategyName,
  complianceStatus = 'low', // 'high' (green), 'medium' (yellow), or 'low' (red)
  maxControls = 0,
  missingItems = 0,
  satisfiedControlsCount = 0,
  onOpenSatisfiedControls,
}) {
  const score = calculateStrategyScore(maxControls, missingItems) ?? 0;

  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className={`strategy-score-card ${complianceStatus}`}>
      {/* Left Column: Strategy Score Ring */}
      <div className="strategy-score">
        <div className="progress-ring-container">
          <svg className="progress-ring" width="90" height="90">
            <circle
              className="progress-ring-bg"
              strokeWidth="8"
              stroke="transparent"
              fill="transparent"
              r={radius}
              cx="45"
              cy="45"
            />
            <circle
              className={`progress-ring-fill ${complianceStatus}`}
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              //strokeLinecap="round"
              fill="transparent"
              r={radius}
              cx="45"
              cy="45"
            />
          </svg>
          <div className="strategy-score-value">{score}%</div>
        </div>
      </div>

      {/* Right Column: Content Container */}
      <div className="strategy-card-cont">
        <h5 className="strategy-name">{strategyName}</h5>
        <div className="strategy-card-heading">
          {satisfiedControlsCount > 0 ? (
            <button
              className="badge satisfied-controls-toggle"
              type="button"
              aria-label={`View ${satisfiedControlsCount} satisfied controls for ${strategyName}`}
              onClick={onOpenSatisfiedControls}
            >
              Compliant controls: {satisfiedControlsCount}
            </button>
          ) : (
            <span className="badge satisfied-controls-toggle is-empty">
              Compliant controls: 0
            </span>
          )}
        </div>
      </div>
    </div>
  );
}