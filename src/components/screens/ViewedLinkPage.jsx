import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient.js'
import { DashNavbar } from '@/components/ui/dashboard_components/DashNavbar.jsx'
import { TopDashRow } from '@/components/ui/dashboard_components/TopDashRow.jsx'
import { StrategyRow } from '@/components/ui/dashboard_components/StrategyRow.jsx'
import { MaturityLevelGuardDialog } from '@/components/ui/Lightboxes/MaturityLevelGuard.jsx'
import './ViewedLinkPage.css'

const strategyNames = [
  'Patch Applications',
  'Patch Operating Systems',
  'Regular Backups',
  'Application Control',
  'Multi-Factor Authentication',
  'Restrict Administrative Privileges',
  'Restrict Microsoft Office Macros',
  'User Application Hardening',
]

export default function ViewedLinkPage({ user, onSignOut, tenantId, isPreview = false }) {
  const [tenant, setTenant] = useState(null)
  const [loading, setLoading] = useState(Boolean(tenantId))
  const [loadError, setLoadError] = useState('')
  const [activeMaturityLevel, setActiveMaturityLevel] = useState(1)
  const [strategyScores, setStrategyScores] = useState({})
  const [blockedMaturityLevel, setBlockedMaturityLevel] = useState(null)
  const [signingOut, setSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState('')

  useEffect(() => {
    if (!tenantId) return undefined

    let isCancelled = false

    async function fetchTenant() {
      setLoading(true)
      setLoadError('')

      const { data, error } = await supabase
        .from('tenants')
        .select('id, name, display_name, msp_id')
        .eq('id', tenantId)
        .maybeSingle()

      if (isCancelled) return

      if (error || !data) {
        setTenant(null)
        setLoadError(isPreview
          ? 'This tenant cannot be previewed with your current access.'
          : 'This viewer link has expired, been revoked, or is unavailable.')
      } else {
        setTenant({
          ...data,
          display_name: data.display_name?.trim() || data.name,
        })
      }
      setLoading(false)
    }

    fetchTenant()
    return () => { isCancelled = true }
  }, [isPreview, tenantId])

  const handleScoreChange = useCallback((strategyName, score, maturityLevel) => {
    setStrategyScores((currentScores) => ({
      ...currentScores,
      [maturityLevel]: {
        ...currentScores[maturityLevel],
        [strategyName]: score,
      },
    }))
  }, [])

  function handleMaturityLevelSelect(requestedLevel) {
    if (requestedLevel === 1) {
      setActiveMaturityLevel(1)
      return
    }

    const prerequisiteScores = strategyScores[requestedLevel - 1] || {}
    const isReady = strategyNames.every((strategyName) => prerequisiteScores[strategyName] === 100)
    if (isReady) setActiveMaturityLevel(requestedLevel)
    else setBlockedMaturityLevel(requestedLevel)
  }

  async function handleSignOut() {
    if (!onSignOut || signingOut) return
    setSigningOut(true)
    setSignOutError('')
    try {
      await onSignOut()
    } catch {
      setSignOutError('Sign out failed. Please try again.')
    } finally {
      setSigningOut(false)
    }
  }

  const pageError = loadError || (!tenantId
    ? isPreview ? 'Select a tenant to preview.' : 'This viewer link is unavailable.'
    : '')

  return (
    <div className="viewed-link-page">
      <DashNavbar
        activeLevel={activeMaturityLevel}
        onLevelSelect={handleMaturityLevelSelect}
        mspName="Shared dashboard"
        onSignOut={handleSignOut}
        signingOut={signingOut}
        signOutError={signOutError}
        userProfile={{
          name: user?.email || 'External viewer',
          email: user?.email,
          role: 'external_viewer',
        }}
      />

      <main className="viewed-link-main">
        {loading ? (
          <p className="viewed-link-message" role="status">Loading shared dashboard...</p>
        ) : pageError ? (
          <p className="viewed-link-message is-error" role="alert">{pageError}</p>
        ) : tenant && (
          <>
            <TopDashRow
              tenantName={tenant.display_name}
              scores={Object.values(strategyScores[activeMaturityLevel] || {})}
            />

            <section className="viewed-link-strategies" aria-labelledby="viewed-link-strategies-title">
              <div className="viewed-link-strategies-heading">
                <h1 id="viewed-link-strategies-title">Strategies</h1>
                <span>8 strategies</span>
              </div>
              <div className="viewed-link-strategies-list">
                {strategyNames.map((strategyName) => (
                  <StrategyRow
                    key={strategyName}
                    strategyName={strategyName}
                    maturityLevel={activeMaturityLevel}
                    tenantId={tenant.id}
                    mspId={tenant.msp_id}
                    userId={user?.id}
                    reviewerRole="external_viewer"
                    readOnly
                    onScoreChange={handleScoreChange}
                  />
                ))}
              </div>
            </section>
          </>
        )}
      </main>

      <footer className="viewed-link-footer">
        <span>Pathwise Systems</span>
        <span>Essential Eight compliance monitoring</span>
      </footer>

      {blockedMaturityLevel && (
        <MaturityLevelGuardDialog
          requiredLevel={blockedMaturityLevel}
          onClose={() => setBlockedMaturityLevel(null)}
        />
      )}
    </div>
  )
}