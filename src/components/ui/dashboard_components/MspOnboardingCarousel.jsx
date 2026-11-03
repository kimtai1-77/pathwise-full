
import { useEffect, useRef, useState } from 'react'
import deleteIcon from '@/assets/icons/delete_forever.svg'
import { OrgAddingForm } from '@/components/ui/drawers/OrgAddingForm.jsx'
import { supabase } from '@/lib/supabaseClient.js'
import './styles/MspOnboardingCarousel.css'

const steps = [
  { id: 'logo', title: 'Add your MSP logo' },
  { id: 'tenants', title: 'Add your tenants' },
  { id: 'staff', title: 'Invite your staff' },
]

export default function MspOnboardingCarousel({
  user,
  logoPreview,
  logoError,
  fileInputRef,
  onLogoChange,
  onRemoveLogo,
  onShowTerms,
  onComplete,
}) {
  const [currentStep, setCurrentStep] = useState(0)
  const [staffError, setStaffError] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [tenantDialogOpen, setTenantDialogOpen] = useState(false)
  const [tenantAdded, setTenantAdded] = useState(false)
  const [tenantError, setTenantError] = useState('')
  const [invitations, setInvitations] = useState([
    { id: 1, email: '', role: '' },
    { id: 2, email: '', role: '' },
    { id: 3, email: '', role: '' },
  ])
  const nextInvitationId = useRef(4)
  const csvInputRef = useRef(null)
  const stepPanelRef = useRef(null)
  const roleMenusRef = useRef(null)
  const [openRoleIndex, setOpenRoleIndex] = useState(null)

  useEffect(() => {
    function closeRoleMenu(event) {
      if (!roleMenusRef.current?.contains(event.target)) setOpenRoleIndex(null)
    }

    document.addEventListener('pointerdown', closeRoleMenu)
    return () => document.removeEventListener('pointerdown', closeRoleMenu)
  }, [])

  const step = steps[currentStep]
  const mspName = user?.user_metadata?.msp_name || 'Your MSP'

  function goToStep(nextStep) {
    setCurrentStep(nextStep)
    window.requestAnimationFrame(() => stepPanelRef.current?.focus())
  }

  function handleInvitationChange(index, field, value) {
    setInvitations((current) => current.map((invitation, invitationIndex) =>
      invitationIndex === index ? { ...invitation, [field]: value } : invitation))
    setStaffError('')
  }

  function removeInvitation(index) {
    if (index === 0) return
    setOpenRoleIndex((current) => current === index ? null : current > index ? current - 1 : current)
    setInvitations((current) => current.filter((_, invitationIndex) => invitationIndex !== index))
  }

  function handleFinish() {
    const occupiedRows = invitations.filter((invitation) => invitation.email.trim())
    if (occupiedRows.some((invitation) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invitation.email.trim()))) {
      setStaffError('Enter a valid email address for each invitation.')
      return
    }

    setStaffError('')
    onComplete()
  }

  async function handleTenantAdded(tenantName) {
    const trimmedName = tenantName.trim()
    if (!trimmedName) {
      setTenantError('Enter a tenant name.')
      return
    }

    const { error } = await supabase
      .from('tenants')
      .insert({ msp_id: user.id, name: trimmedName })

    if (error) {
      setTenantError(error.code === '23505' ? 'A tenant with this name already exists.' : 'Unable to add tenant.')
      return
    }

    setTenantAdded(true)
    setTenantError('')
    setTenantDialogOpen(false)
  }

  return (
    <section className="msp-onboarding" aria-labelledby="msp-onboarding-title">

      <div className="msp-onboarding__panel" ref={stepPanelRef} tabIndex="-1">
        <header className="msp-onboarding__heading">
          <h1>{mspName}</h1>
          <h4 id="msp-onboarding-title">{step.title}</h4>
        </header>

        {step.id === 'logo' && (
          <div className="msp-onboarding__logo-step">
            <label className="msp-onboarding__logo-picker">
              <input
                ref={fileInputRef}
                className="msp-onboarding__file-input"
                type="file"
                accept="image/png,image/jpeg,image/svg+xml"
                onChange={onLogoChange}
              />
              {logoPreview ? (
                <img src={logoPreview} alt="MSP logo preview" />
              ) : (
                <>
                  <strong>Choose a logo</strong>
                  <span>PNG, JPG or SVG · Maximum 5 MB</span>
                </>
              )}
            </label>
            {logoPreview && (
              <button className="msp-onboarding__text-button" type="button" onClick={onRemoveLogo}>Remove logo</button>
            )}
            {logoError && <p className="msp-onboarding__error" role="alert">{logoError}</p>}
            <p className="msp-onboarding__optional">Optional. You can add or replace the logo later.</p>
          </div>
        )}

        {step.id === 'tenants' && (
          <div className="msp-onboarding__information">
            <p>You can load tenants one by one using ABN lookup or batch upload using CSV.</p>
            <div className="msp-onboarding__tenant-actions">
              <button className="msp-onboarding__primary" type="button" onClick={() => setTenantDialogOpen(true)}>
                {tenantAdded ? 'Add another tenant' : 'Lookup ABN'}
              </button>
              <button className="msp-onboarding__secondary" type="button" onClick={() => csvInputRef.current?.click()}>
                Upload CSV
              </button>
              <input
                ref={csvInputRef}
                className="msp-onboarding__file-input"
                type="file"
                accept=".csv,text/csv"
                onChange={() => undefined}
              />
            </div>
            <p className="msp-onboarding__optional">You can also skip this and add tenants from the dashboard later.</p>
              <div className="action-btns-cont">
                <button className="msp-onboarding__text-button" type="button" onClick={() => goToStep(currentStep + 1)}>Done</button>
                <button className="msp-onboarding__skip" type="button" onClick={() => goToStep(currentStep + 1)}>Skip</button>
              </div>
          </div>
        )}

        {step.id === 'staff' && (
          <div className="msp-onboarding__staff-step">
            <div className="msp-onboarding__invitation-columns" aria-hidden="true">
              <span>Email address</span>
              <span>
                Role
                <span className="msp-onboarding__role-info" tabIndex="0" aria-label="Role descriptions">
                  i
                  <span className="msp-onboarding__role-tooltip" role="tooltip">
                    <strong>Technician</strong>
                    <span>Runs daily operations and submits compliance evidence, but cannot approve it.</span>
                    <strong>MSP Admin</strong>
                    <span>Oversees technicians and approves evidence submitted by technicians or through API integrations.</span>
                  </span>
                </span>
              </span>
            </div>
            <div className="msp-onboarding__invitation-list" ref={roleMenusRef}>
              {invitations.map((invitation, index) => (
                <div className="msp-onboarding__invitation-row" key={invitation.id}>
                  <input
                    type="email"
                    value={invitation.email}
                    onChange={(event) => handleInvitationChange(index, 'email', event.target.value)}
                    placeholder="staff@example.com"
                    aria-label={`Email address for invitation ${index + 1}`}
                  />
                  <div className="msp-onboarding__role-menu">
                    <button
                      className="msp-onboarding__role-button"
                      type="button"
                      aria-haspopup="listbox"
                      aria-expanded={openRoleIndex === index}
                      onClick={(event) => {
                        event.stopPropagation()
                        setOpenRoleIndex((current) => current === index ? null : index)
                      }}
                    >
                      <span>{invitation.role || ''}</span>
                      <span className="msp-onboarding__role-chevron" aria-hidden="true" />
                    </button>
                    {openRoleIndex === index && (
                      <div className="msp-onboarding__role-options" role="listbox">
                        <button type="button" role="option" aria-selected={invitation.role === 'msp_admin'} onClick={() => { handleInvitationChange(index, 'role', 'msp_admin'); setOpenRoleIndex(null) }}>msp_admin</button>
                        <button type="button" role="option" aria-selected={invitation.role === 'technician'} onClick={() => { handleInvitationChange(index, 'role', 'technician'); setOpenRoleIndex(null) }}>technician</button>
                      </div>
                    )}
                  </div>
                  {index > 0 && (
                    <button
                      className="msp-onboarding__remove-invitation"
                      type="button"
                      onClick={() => removeInvitation(index)}
                      aria-label={`Remove invitation ${index + 1}`}
                      title="Remove invitation"
                    >
                      <img src={deleteIcon} alt="" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="msp-onboarding__invitation-add">
              <button
                className="msp-onboarding__add-invitation"
                type="button"
                onClick={() => {
                  const id = nextInvitationId.current++
                  setInvitations((current) => [...current, { id, email: '', role: '' }])
                }}
              >
                Add another invitation
              </button>
            </div>
            <div className="msp-onboarding__invitation-submit">
              <button className="msp-onboarding__primary" type="button" onClick={() => undefined}>Invite</button>
            </div>
            {staffError && <p className="msp-onboarding__error" role="alert">{staffError}</p>}
            <div className="msp-onboarding__consent">
              <label className="msp-onboarding__terms">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(event) => setTermsAccepted(event.target.checked)}
                />
                <span>I agree to the <button type="button" onClick={onShowTerms}>Terms and Conditions</button></span>
              </label>
            </div>
          </div>
        )}
      </div>

      <div className="msp-onboarding__progress" aria-label={`Step ${currentStep + 1} of ${steps.length}`}>
        <span>Step {currentStep + 1} of {steps.length}</span>
        <div className="msp-onboarding__progress-track" aria-hidden="true">
          <span style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }} />
        </div>
      </div>

      <div className="msp-onboarding__actions">
        {currentStep > 0 && (
          <button className="msp-onboarding__secondary" type="button" onClick={() => goToStep(currentStep - 1)}>Back</button>
        )}
        {currentStep < steps.length - 1 ? (
          <>
            <button className="msp-onboarding__skip" type="button" onClick={() => goToStep(currentStep + 1)}>Skip</button>
            <button className="msp-onboarding__primary" type="button" onClick={() => goToStep(currentStep + 1)}>Continue</button>
          </>
        ) : (
          <>
            <button className="msp-onboarding__skip" type="button" onClick={onComplete}>Skip for now</button>
            <button className="msp-onboarding__primary" type="button" onClick={handleFinish} disabled={!termsAccepted}>Enter dashboard</button>
          </>
        )}
      </div>

      {tenantDialogOpen && (
        <OrgAddingForm
          onClose={() => {
            setTenantError('')
            setTenantDialogOpen(false)
          }}
          onSubmit={handleTenantAdded}
          error={tenantError}
          onClearError={() => setTenantError('')}
        />
      )}
    </section>
  )
}
