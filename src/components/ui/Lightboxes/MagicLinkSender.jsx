import { useEffect, useRef, useState } from 'react'
import closeIcon from '@/assets/icons/close.svg'
import dropdownArrow from '@/assets/icons/keyboard_arrow_down.svg'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock.js'
import './MagicLinkSender.css'

const expiryOptions = [
  { days: 1, label: '1 day' },
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
]

function MagicLinkDropdown({ id, label, value, options, onChange, disabled = false }) {
  const dropdownRef = useRef(null)
  const triggerRef = useRef(null)
  const [isOpen, setIsOpen] = useState(false)
  const [opensUp, setOpensUp] = useState(false)
  const selectedOption = options.find((option) => option.value === value)

  useEffect(() => {
    function closeDropdown(event) {
      if (!dropdownRef.current?.contains(event.target)) setIsOpen(false)
    }

    function closeOnEscape(event) {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('pointerdown', closeDropdown)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeDropdown)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  return (
    <div className={`magic-link-field magic-link-dropdown${opensUp ? ' is-open-up' : ''}`} ref={dropdownRef}>
      <span className="magic-link-field-label" id={`${id}-label`}>{label}</span>
      <button
        ref={triggerRef}
        className="magic-link-dropdown-trigger"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={`${id}-options`}
        aria-labelledby={`${id}-label ${id}-value`}
        disabled={disabled}
        onClick={() => {
          if (!isOpen && triggerRef.current) {
            const bounds = triggerRef.current.getBoundingClientRect()
            setOpensUp(window.innerHeight - bounds.bottom < 210)
          }
          setIsOpen((open) => !open)
        }}
      >
        <span id={`${id}-value`}>{selectedOption?.label || 'Select an option'}</span>
        <img src={dropdownArrow} alt="" aria-hidden="true" />
      </button>
      {isOpen && (
        <div className="magic-link-dropdown-options" id={`${id}-options`} role="listbox" aria-labelledby={`${id}-label`}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={value === option.value}
              className={value === option.value ? 'is-selected' : ''}
              onClick={() => {
                onChange(option.value)
                setIsOpen(false)
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function MagicLinkSender({ tenants = [], activeTenantId = '', onCancel, onSend, onPreview }) {
  const [email, setEmail] = useState('')
  const [tenantId, setTenantId] = useState(activeTenantId)
  const [expiryDays, setExpiryDays] = useState('7')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const selectedTenant = tenants.find((tenant) => tenant.id === tenantId)
  const dismissTimeoutRef = useRef(null)

  useBodyScrollLock(true)

  useEffect(() => {
    return () => window.clearTimeout(dismissTimeoutRef.current)
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    if (!selectedTenant || sending) return

    setSending(true)
    setError('')
    try {
      await onSend?.({
        email: email.trim().toLowerCase(),
        tenantId: selectedTenant.id,
        expiresInDays: Number(expiryDays),
      })
      setSent(true)
      dismissTimeoutRef.current = window.setTimeout(() => onCancel?.(), 3 * 1000)
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Unable to send the link.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      className="magic-link-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !sending) onCancel?.()
      }}
    >
      <form
        className="magic-link-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="magic-link-sender-title"
        onSubmit={handleSubmit}
      >
        <div className="magic-link-dialog-heading">
          <div>
            <p className="magic-link-eyebrow">External access</p>
            <h2 id="magic-link-sender-title">Create viewer link</h2>
          </div>
          <button className="magic-link-close" type="button" onClick={onCancel} disabled={sending} aria-label="Close">
            <img src={closeIcon} alt="" aria-hidden="true" />
          </button>
        </div>

        <label className="magic-link-field" htmlFor="magic-link-email">
          <span>Email address</span>
          <input
            id="magic-link-email"
            type="email"
            autoComplete="email"
            disabled={sent}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="viewer@example.com"
            maxLength={254}
            autoFocus
            required
          />
        </label>

        <MagicLinkDropdown
          id="magic-link-tenant"
          label="Tenant"
          value={tenantId}
          options={tenants.map((tenant) => ({ value: tenant.id, label: tenant.display_name }))}
          onChange={setTenantId}
          disabled={sent}
        />

        <MagicLinkDropdown
          id="magic-link-expiry"
          label="Access expires after"
          value={expiryDays}
          options={expiryOptions.map((option) => ({ value: String(option.days), label: option.label }))}
          onChange={setExpiryDays}
          disabled={sent}
        />

        <p className="magic-link-note">The recipient can view this tenant only. Access ends automatically at expiry.</p>
        {sent && (
          <div className="team-success-toast magic-link-sent-toast" role="status" aria-live="polite">
            Magic link sent
          </div>
        )}
        {error && <p className="magic-link-error" role="alert">{error}</p>}

        <div className="magic-link-actions">
          <button
            className="magic-link-secondary"
            type="button"
            onClick={() => onPreview?.(tenantId)}
            disabled={!selectedTenant}
          >
            View link
          </button>
          <button className="magic-link-primary" type="submit" disabled={sending || sent || !selectedTenant}>
            {sending ? 'Sending...' : sent ? 'Sent' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  )
}