import './styles/OverallScore.css';

export default function OverallScore({ scores = [] }) {
  const score = scores.length
    ? Math.round(scores.reduce((total, value) => total + value, 0) / scores.length)
    : 0;
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const scoreClass = score >= 80 ? 'score-green' : score >= 50 ? 'score-orange' : 'score-red';

  return (
    <div className={`overall-score ${scoreClass}`} role="img" aria-label={`${score}% overall score`}>
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle
          className="overall-score-progress"
          cx="60"
          cy="60"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
        />
      </svg>
      <span>
        <b>{score}%</b>
        <small>Compliant</small>
      </span>
    </div>
  );
}