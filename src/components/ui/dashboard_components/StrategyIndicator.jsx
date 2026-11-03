import StrategyGauge from './StrategyGauge.jsx'
import ComplianceStatus from '../complianceStatus.jsx'
import './styles/StrategyIndicator.css'

export default function StrategyIndicator({ strategy }) {
  return (
    <div className='strategy-name-section'>
      <StrategyGauge score={strategy.score} status={strategy.status} />
      <div className='strategy-name'>
        <span className='strategy-name-label'>LEVEL 1 REQ</span>
        <h3>{strategy.name}</h3>
        <ComplianceStatus status={strategy.status} />
      </div>
    </div>
  )
}