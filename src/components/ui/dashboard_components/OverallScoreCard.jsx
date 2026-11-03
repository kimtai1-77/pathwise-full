
import './styles/OverallScoreCard.css'
import OverallScore from './OverallScore.jsx'

export function OverallScoreCard({ scores = [] }) {
  return (
    <div className="overall-scorecard-cont">
      <OverallScore scores={scores} />
      
      <div className="overall-score-info">
        <h6 className="maturity-heading">CURRENT MATURITY</h6>
        
        <div className="maturity-level">
          <b>Level 1</b>
          <small> / 3</small>
        </div>

      </div>
    </div>
  )
}