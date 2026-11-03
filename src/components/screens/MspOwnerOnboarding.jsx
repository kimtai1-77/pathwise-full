import { useRef, useState } from 'react'
import logoMain from '@/assets/logos/logo_main_nbg.png'
import MspOnboardingCarousel from '@/components/ui/dashboard_components/MspOnboardingcarousel.jsx'
import TermsAndConditions from './TermsAndConditions.jsx'
import './MspOwnerOnboarding.css'

export default function MspOwnerOnboarding({ user, onComplete }) {
  const fileInputRef = useRef(null)
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [logoError, setLogoError] = useState('')
  const [termsOpen, setTermsOpen] = useState(false)

  function handleLogoChange(event) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setLogoError('Choose an image file.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setLogoError('Logo files must be 5 MB or smaller.')
      return
    }

    setLogoError('')
    setLogoFile(file)
    setLogoPreview((current) => {
      if (current) URL.revokeObjectURL(current)
      return URL.createObjectURL(file)
    })
  }

  function handleRemoveLogo() {
    if (logoPreview) URL.revokeObjectURL(logoPreview)
    setLogoFile(null)
    setLogoPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function completeOnboarding() {
    window.localStorage.setItem(`pathwise_msp_onboarding_complete:${user.id}`, 'true')
    onComplete()
  }

  if (termsOpen) {
    return <TermsAndConditions onClose={() => setTermsOpen(false)} />
  }

  return (
    <div className="msp-owner-wrapper">
      <main className="msp-owner-onboarding">
        <header className="msp-owner-onboarding__brand">
          <img src={logoMain} alt="Pathwise" />
        </header>
        <MspOnboardingCarousel
          user={user}
          logoFile={logoFile}
          logoPreview={logoPreview}
          logoError={logoError}
          fileInputRef={fileInputRef}
          onLogoChange={handleLogoChange}
          onRemoveLogo={handleRemoveLogo}
          onShowTerms={() => setTermsOpen(true)}
          onComplete={completeOnboarding}
        />
      </main>
    </div>
  )
}
