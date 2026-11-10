import StrategyColumn from './StrategyColumn.jsx'
import './styles/StrategyColumnFix.css'

export default function StrategyColumnFix({ strategy, role, onOpen }) {
  const pending = strategy.status === 'pending_review'
  const compliant = strategy.status === 'compliant'
  const buttonLabel = compliant ? 'View Evidence' : pending && role === 'supervisor' ? 'Review Evidence' : 'Start Fix'

  return (
    <StrategyColumn
      tone='fixes'
      title='How to Fix'
      items={strategy.fixes}
      emptyText='No remediation actions outstanding.'
    >
      <div className='column-fix-actions'>
        {pending && <small>Evidence pending review</small>}
        <button type='button' className={pending && role === 'supervisor' ? 'is-review' : ''} onClick={() => onOpen(strategy.id)}>
          {buttonLabel}<b aria-hidden='true'>›</b>
        </button>
      </div>
    </StrategyColumn>
  )
}