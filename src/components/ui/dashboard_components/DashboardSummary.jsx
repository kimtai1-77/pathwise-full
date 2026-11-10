import OverallScoreGauge from './OverallScore.jsx'
import './styles/DashboardSummary.css'

export default function DashboardSummary({ score }) {
  return (
    <section className='dash-summary'>
      <div className='dash-summary-left'>
        <span className='workspace-title'><i />Active Assessment Workspace</span>
        <h1>Security Maturity Scorecard</h1>
        <p>Continuous monitoring against the Essential Eight cybersecurity framework. Track gap analyses, remediation steps, and operational posture in real time.</p>
      </div>
      <div className='dash-scorecard'>
        <OverallScoreGauge score={score} />
        <div className='overall-maturity'>
          <span className='maturity-title'>Current maturity</span>
          <strong className='maturity-level'>Level 1 <small>/ 3</small></strong>
          <p className='maturity-copy'>Enforcing Maturity Level 1 mitigation policies across endpoints.</p>
        </div>
      </div>
    </section>
  )
}