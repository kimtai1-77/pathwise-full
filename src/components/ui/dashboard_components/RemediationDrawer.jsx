import { useEffect } from 'react'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock.js'
import CommandReference from './CommandReference.jsx'
import DrawerStatus from './DrawerStatus.jsx'
import EvidenceCard from './EvidenceCard.jsx'
import EvidenceReviewActions from './EvidenceReviewActions.jsx'
import EvidenceUpload from './EvidenceUpload.jsx'
import RemediationChecklist from './RemediationChecklist.jsx'
import './styles/RemediationDrawer.css'

export default function RemediationDrawer({ strategy, role, file, note, rejection, rejecting, onClose, onFileChange, onNoteChange, onSubmit, onCopy, onRejectStart, onRejectChange, onRejectCancel, onRejectConfirm, onApprove }) {
  useBodyScrollLock(Boolean(strategy))

  useEffect(() => {
    if (!strategy) return undefined
    const escape = (event) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', escape)
    return () => document.removeEventListener('keydown', escape)
  }, [strategy, onClose])

  if (!strategy) return null
  return (
    <div className='pcd-drawer-layer'>
      <button className='pcd-drawer-backdrop' type='button' aria-label='Close remediation drawer' onClick={onClose} />
      <aside className='pcd-drawer' role='dialog' aria-modal='true' aria-labelledby='pcd-drawer-title'>
        <header className='pcd-drawer-header'><div><span className='pcd-kicker'>{strategy.code} · LEVEL 1 REQUIREMENT</span><h2 id='pcd-drawer-title'>{strategy.name}</h2><p>{strategy.category}</p></div><button type='button' aria-label='Close drawer' onClick={onClose}>×</button></header>
        <div className='pcd-drawer-content'>
          <DrawerStatus strategy={strategy} />
          <RemediationChecklist steps={strategy.fixes} />
          <CommandReference command={strategy.command} onCopy={onCopy} />
          <EvidenceCard evidence={strategy.evidence} />
          <EvidenceUpload hasEvidence={Boolean(strategy.evidence)} file={file} note={note} onFileChange={onFileChange} onNoteChange={onNoteChange} onSubmit={onSubmit} />
        </div>
        <footer className='pcd-drawer-footer'><EvidenceReviewActions role={role} status={strategy.status} evidence={strategy.evidence} rejecting={rejecting} rejection={rejection} onRejectStart={onRejectStart} onRejectChange={onRejectChange} onRejectCancel={onRejectCancel} onRejectConfirm={onRejectConfirm} onApprove={onApprove} /></footer>
      </aside>
    </div>
  )
}