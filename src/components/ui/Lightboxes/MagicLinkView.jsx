import { useState } from 'react'
import closeIcon from '@/assets/icons/close.svg'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock.js'
import './MagicLinkView.css'

function formatDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Unavailable' : date.toLocaleString()
}

export function MagicLinkView({ link, onClose, onRevoke, onPreview }) {
  const [revoking, setRevoking] = useState(false)
  const [confirmingRevoke, setConfirmingRevoke] = useState(false)
  const [revoked, setRevoked] = useState(Boolean(link.revoked_at))
  const [error, setError] = useState('')

  useBodyScrollLock(true)

  async function handleConfirmRevoke() {
    if (revoking) return
    setRevoking(true)
    setError('')
    try {
      await onRevoke?.(link.id)
      setRevoked(true)
      setConfirmingRevoke(false)
    } catch (revokeError) {
      setError(revokeError instanceof Error ? revokeError.message : 'Unable to revoke this link.')
    } finally {
      setRevoking(false)
    }
  }

  const sender = link.sender?.full_name?.trim() || link.sender?.email || 'Unavailable'

  return (
    <div
      className="magic-link-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !revoking) onClose?.()
      }}
    >
      <section
        className="magic-link-dialog magic-link-view-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="magic-link-view-title"
      >
        <div className="magic-link-dialog-heading">
          <div>
            <p className="magic-link-eyebrow">External access</p>
            <h2 id="magic-link-view-title">Viewer link details</h2>
          </div>
          <button className="magic-link-view-close" type="button" onClick={onClose} disabled={revoking} aria-label="Close viewer link details">
            <img src={closeIcon} alt="" aria-hidden="true" />
          </button>
        </div>

        <dl className="magic-link-details">
          <div>
            <dt>Tenant</dt>
            <dd>{link.tenantName}</dd>
          </div>
          <div>
            <dt>Sent to</dt>
            <dd>{link.recipient_email}</dd>
          </div>
          <div>
            <dt>Sent by</dt>
            <dd>{sender}</dd>
          </div>
          <div>
            <dt>Sent</dt>
            <dd><time dateTime={link.created_at}>{formatDate(link.created_at)}</time></dd>
          </div>
          <div>
            <dt>Expires</dt>
            <dd><time dateTime={link.expires_at}>{formatDate(link.expires_at)}</time></dd>
          </div>
        </dl>

        {error && <p className="magic-link-error" role="alert">{error}</p>}
        {revoked && (
          <p className="magic-link-revoked-message" role="status" aria-live="polite">
            This viewer link has been revoked. The recipient can no longer access this tenant with it.
          </p>
        )}

        <div className="magic-link-actions">
          {revoked ? (
            <button className="magic-link-secondary" type="button" onClick={onClose}>OK</button>
          ) : (
            <>
              <button className="magic-link-secondary" type="button" onClick={() => onPreview?.(link.tenant_id)}>
                View link
              </button>
              <button className="magic-link-revoke" type="button" onClick={() => setConfirmingRevoke(true)}>
                Revoke link
              </button>
            </>
          )}
        </div>
      </section>

      {confirmingRevoke && (
        <div
          className="magic-link-confirmation-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !revoking) setConfirmingRevoke(false)
          }}
        >
          <section
            className="magic-link-confirmation-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="magic-link-revoke-title"
            aria-describedby="magic-link-revoke-description"
          >
            <h3 id="magic-link-revoke-title">Revoke viewer link?</h3>
            <p id="magic-link-revoke-description">
              This will immediately deactivate the link. The recipient will lose access to this tenant, even if they already opened it.
            </p>
            {error && <p className="magic-link-error" role="alert">{error}</p>}
            <div className="magic-link-confirmation-actions">
              <button type="button" onClick={() => setConfirmingRevoke(false)} disabled={revoking}>
                Cancel
              </button>
              <button className="magic-link-confirm-revoke" type="button" onClick={handleConfirmRevoke} disabled={revoking}>
                {revoking ? 'Revoking...' : 'OK'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}