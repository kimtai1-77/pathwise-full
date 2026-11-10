import { BtnMain } from '@/components/ui/buttons/btn-main.jsx'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock.js'
import './styles/MaturityLevelGuardDialog.css'

export function MaturityLevelGuardDialog({ requiredLevel, onClose }) {
  useBodyScrollLock(true)

  const isLevelThree = requiredLevel === 3
  const title = `Level ${requiredLevel} compliance unavailable`
  const message = isLevelThree
    ? 'Level 3 compliance can only be targeted when all controls for Level 2 are at 100%.'
    : 'Level 2 compliance can only be targeted when all controls for Level 1 are at 100%.'

  return (
    <div className="maturity-level-lightbox-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className="maturity-level-lightbox" role="dialog" aria-modal="true" aria-labelledby="maturity-level-lightbox-title">
        <div className="maturity-level-lightbox-icon" aria-hidden="true">!</div>
        <h2 id="maturity-level-lightbox-title">{title}</h2>
        <p>{message}</p>
        <BtnMain type="button" onClick={onClose}>Return to compliance</BtnMain>
      </section>
    </div>
  )
}
