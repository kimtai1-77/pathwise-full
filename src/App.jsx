import { useEffect, useState } from 'react'
import LoginForm from "@/components/logging_in/LoginForm.jsx"
import SignUpForm from "@/components/logging_in/sign-up-form.jsx"
import InviteeLoginForm from '@/components/logging_in/InviteeLoginForm.jsx'
import ForgotPasswordForm from '@/components/logging_in/forgotPasswordForm.jsx'
import UpdatePasswordForm from '@/components/logging_in/updatePasswordForm.jsx'
import MspDashboard from '@/components/screens/MspDashboard.jsx'
import MspOwnerOnboarding from '@/components/screens/MspOwnerOnboarding.jsx'
// import MspDash from '@/components/screens/MspDash.jsx'
import { safeNextPath } from '@/lib/safe-next-path.js'
import { supabase } from '@/lib/supabaseClient.js'
import './App.css'

function App() {
  const onboardingPreview = new URLSearchParams(window.location.search).get('onboarding') === '1'
  const inviteePreview = new URLSearchParams(window.location.search).get('invitee') === '1'
  const invitationLink = new URLSearchParams(window.location.search).get('auth') === 'invitee'
  const [view, setView] = useState(() => {
    const auth = new URLSearchParams(window.location.search).get('auth')
    if (auth === 'confirmed') return 'sign-in'
    if (auth === 'update-password' || window.location.pathname === '/update-password') return 'update-password'
    return 'sign-up'
  })
  const [user, setUser] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [onboardingComplete, setOnboardingComplete] = useState(false)
  const [inviteeSetupComplete, setInviteeSetupComplete] = useState(false)

  useEffect(() => {
    const url = new URL(window.location.href)
    if (url.searchParams.get('auth') === 'confirmed') {
      url.searchParams.delete('auth')
      window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
      supabase.auth.signOut()
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && !invitationLink) setView('update-password')
      if (event === 'SIGNED_OUT') setView('sign-in')
      const nextUser = session?.user ?? null
      setUser(nextUser)
      setOnboardingComplete(nextUser
        ? window.localStorage.getItem(`pathwise_msp_onboarding_complete:${nextUser.id}`) === 'true'
        : false)
      setInviteeSetupComplete(nextUser
        ? window.localStorage.getItem(`pathwise_invitee_setup_complete:${nextUser.id}`) === 'true'
        : false)
      setAuthReady(true)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLoginSuccess = (userData) => {
    const next = new URLSearchParams(window.location.search).get('next')
    if (next) {
      window.location.href = safeNextPath(next, '/')
      return
    }
    setUser(userData)
  }

  const handlePasswordUpdated = (userData) => {
    window.history.replaceState(null, '', window.location.pathname)
    setUser(userData)
    setView('sign-in')
  }

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut({ scope: 'local' })
    if (error) throw error
    setUser(null)
    setOnboardingComplete(false)
    setInviteeSetupComplete(false)
    setView('sign-in')
  }

  return (
      <div className='app-cont'>
        {onboardingPreview ? (
          <MspOwnerOnboarding
            user={{
              id: 'onboarding-preview',
              user_metadata: { msp_name: 'Acme Managed Services' },
            }}
            onComplete={() => {
              window.history.replaceState(null, '', '/')
              window.location.reload()
            }}
          />
        ) : inviteePreview ? (
          <InviteeLoginForm
            invitation={{ invitation: true, msp_name: 'Acme Managed Services', msp_id: 'preview', role: 'technician' }}
            onComplete={() => undefined}
          />
        ) : !authReady ? (
          <p role='status'>Loading your workspace...</p>
        ) : view === 'update-password' ? (
          <UpdatePasswordForm
            onPasswordUpdated={handlePasswordUpdated}
            onSignInClick={(event) => {
              event.preventDefault()
              setView('sign-in')
            }}
          />
        ) : user && !inviteeSetupComplete && (invitationLink || user.user_metadata?.invitation === true) ? (
          <InviteeLoginForm
            user={user}
            onComplete={(completedUser) => {
              window.localStorage.setItem(`pathwise_invitee_setup_complete:${completedUser.id}`, 'true')
              setInviteeSetupComplete(true)
              setUser(completedUser)
            }}
            onSignInClick={(event) => {
              event.preventDefault()
              void supabase.auth.signOut()
            }}
          />
        ) : user && inviteeSetupComplete && (invitationLink || user.user_metadata?.invitation === true) ? (
          <MspDashboard user={user} onSignOut={handleSignOut} />
        ) : user && !onboardingComplete ? (
          <MspOwnerOnboarding
            user={user}
            onComplete={() => setOnboardingComplete(true)}
          />
        ) : user ? (
          <MspDashboard user={user} onSignOut={handleSignOut} />
        ) : view === 'forgot-password' ? (
          <ForgotPasswordForm onSignInClick={(event) => {
            event.preventDefault()
            setView('sign-in')
          }} />
        ) : view === 'sign-in' ? (
          <LoginForm
            onLoginSuccess={handleLoginSuccess}
            onForgotPasswordClick={(event) => {
              event.preventDefault()
              setView('forgot-password')
            }}
            onSignUpClick={(event) => {
              event.preventDefault()
              setView('sign-up')
            }}
          />
        ) : (
          <SignUpForm onSignInClick={(event) => {
            event.preventDefault()
            setView('sign-in')
          }} />
        )}
      </div>
    )
}

export default App
