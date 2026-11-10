import { useState } from 'react'
import pathwiseLogo from '../../assets/Pathwise_systems_inverse_logo_stacked.png'
import './styles/home.css'

const strategies = [
  {
    name: 'Application control',
    maturity: 2,
    status: 'At target',
    nextStep: 'Review the approved application list',
  },
  {
    name: 'Patch applications',
    maturity: 2,
    status: 'At target',
    nextStep: 'Confirm critical patches deploy within 48 hours',
  },
  {
    name: 'Configure Microsoft Office macro settings',
    maturity: 1,
    status: 'Gap',
    nextStep: 'Block macros from files originating on the internet',
  },
  {
    name: 'User application hardening',
    maturity: 2,
    status: 'At target',
    nextStep: 'Recheck browser and PDF reader configurations',
  },
  {
    name: 'Restrict administrative privileges',
    maturity: 1,
    status: 'Gap',
    nextStep: 'Remove standing admin rights and use separate admin accounts',
  },
  {
    name: 'Patch operating systems',
    maturity: 2,
    status: 'At target',
    nextStep: 'Validate operating system patch reporting',
  },
  {
    name: 'Multi-factor authentication',
    maturity: 2,
    status: 'At target',
    nextStep: 'Check coverage for remote and privileged access',
  },
  {
    name: 'Regular backups',
    maturity: 1,
    status: 'Gap',
    nextStep: 'Schedule and record a test restore of critical data',
  },
]

const priorityActions = [
  {
    number: '01',
    title: 'Block internet-sourced Office macros',
    detail: 'Configure macro policy centrally, then capture a policy report as evidence.',
    strategy: 'Office macro settings',
  },
  {
    number: '02',
    title: 'Remove standing administrator access',
    detail: 'Inventory privileged accounts and move daily work to standard accounts.',
    strategy: 'Admin privileges',
  },
  {
    number: '03',
    title: 'Prove backups can be restored',
    detail: 'Run a restore test, record the outcome, and retain the test evidence.',
    strategy: 'Regular backups',
  },
]

export default function Home({ user, onSignOut }) {
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState('')
  const [isBrandTheme, setIsBrandTheme] = useState(false)
  const email = user?.email ?? 'Signed-in user'
  const initials = email.slice(0, 1).toUpperCase()

  const handleSignOut = async () => {
    setIsSigningOut(true)
    setSignOutError('')

    try {
      await onSignOut()
    } catch {
      setSignOutError('Sign out failed. Please try again.')
      setIsSigningOut(false)
    }
  }

  return (
    <div className={`home-shell${isBrandTheme ? ' theme-brand' : ''}`}>
      <aside className='home-sidebar' aria-label='Workspace navigation'>
        <a className='home-brand' href='#overview' aria-label='Pathwise home'>
          <img src={pathwiseLogo} alt='Pathwise Systems' />
        </a>

        <div className='home-workspace'>
          <span className='home-overline'>WORKSPACE</span>
          <strong>Northstar Services</strong>
          <span>Essential Eight program</span>
        </div>

        <nav className='home-nav'>
          <a className='is-active' href='#overview' aria-current='page'>Overview</a>
          <a href='#assessment'>Control assessment</a>
          <a href='#actions'>Remediation plan</a>
          <a href='#evidence'>Evidence &amp; review</a>
        </nav>

        <div className='home-sidebar-note'>
          <span className='home-status-dot' aria-hidden='true' />
          <span>Assessment in progress</span>
        </div>
      </aside>

      <div className='home-main'>
        <header className='home-topbar'>
          <div className='home-breadcrumb'>Security assurance <span>/</span> Overview</div>
          <div className='home-topbar-actions'>
            <button
              className='home-theme-toggle'
              type='button'
              role='switch'
              aria-label='Yellow and black theme'
              aria-checked={isBrandTheme}
              onClick={() => setIsBrandTheme((enabled) => !enabled)}
            >
              <span className='home-theme-track' aria-hidden='true'><span /></span>
              <span className='home-theme-label'>Brand theme</span>
            </button>
            <div className='home-account'>
              <span className='home-avatar' aria-hidden='true'>{initials}</span>
              <span className='home-account-email'>{email}</span>
              <button className='home-signout' type='button' onClick={handleSignOut} disabled={isSigningOut}>
                {isSigningOut ? 'Signing out...' : 'Sign out'}
              </button>
            </div>
          </div>
        </header>

        <main className='home-content' id='overview'>
          <section className='home-page-heading' aria-labelledby='home-title'>
            <div>
              <span className='home-overline'>TENANT OVERVIEW</span>
              <h1 id='home-title'>Security posture</h1>
              <p>A clear view of your Essential Eight maturity, outstanding gaps, and next steps.</p>
            </div>
            <div className='home-assessment-meta'>
              <span>ASSESSMENT PROFILE</span>
              <strong>Essential Eight <span>·</span> Target ML2</strong>
              <small>Snapshot updated 9 October 2026</small>
            </div>
          </section>

          <section className='home-summary' aria-label='Maturity summary'>
            <article className='home-summary-primary'>
              <div className='home-summary-label'>CURRENT OVERALL MATURITY</div>
              <div className='home-maturity-value'>ML1 <span>of ML2 target</span></div>
              <p>Three strategies are below the selected target.</p>
              <div className='home-progress' role='img' aria-label='Five of eight strategies meet the target maturity level'>
                <span />
              </div>
              <div className='home-progress-caption'><strong>5 of 8</strong> strategies at target</div>
            </article>

            <article className='home-summary-stat'>
              <span className='home-overline'>TARGET MATURITY</span>
              <strong>Level 2</strong>
              <p>Defined, consistently applied security controls.</p>
            </article>

            <article className='home-summary-stat home-summary-gap'>
              <span className='home-overline'>OPEN GAPS</span>
              <strong>03</strong>
              <p>Across macros, admin privileges, and backups.</p>
            </article>
          </section>

          <section className='home-section home-assessment' id='assessment' aria-labelledby='assessment-title'>
            <div className='home-section-heading'>
              <div>
                <span className='home-overline'>MATURITY BREAKDOWN</span>
                <h2 id='assessment-title'>Eight strategy assessment</h2>
              </div>
              <span className='home-table-note'>Current maturity against target ML2</span>
            </div>

            <div className='home-table-wrap'>
              <table className='home-strategy-table'>
                <thead>
                  <tr>
                    <th scope='col'>Essential Eight strategy</th>
                    <th scope='col'>Current</th>
                    <th scope='col'>Target</th>
                    <th scope='col'>Assessment</th>
                    <th scope='col'>Recommended next step</th>
                  </tr>
                </thead>
                <tbody>
                  {strategies.map((strategy) => (
                    <tr key={strategy.name} className={strategy.status === 'Gap' ? 'is-gap' : ''}>
                      <th scope='row'>{strategy.name}</th>
                      <td>ML{strategy.maturity}</td>
                      <td>ML2</td>
                      <td>
                        <span className={`home-assessment-status ${strategy.status === 'Gap' ? 'is-gap' : ''}`}>
                          {strategy.status}
                        </span>
                      </td>
                      <td className='home-next-step'>{strategy.nextStep}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className='home-method-note'>Overall maturity reflects the lowest strategy maturity achieved. This sample assessment is illustrative and should be validated against current ACSC guidance.</p>
          </section>

          <section className='home-bottom-grid'>
            <div className='home-section home-actions' id='actions' aria-labelledby='actions-title'>
              <div className='home-section-heading'>
                <div>
                  <span className='home-overline'>CLOSE THE GAPS</span>
                  <h2 id='actions-title'>Recommended next actions</h2>
                </div>
                <span className='home-priority-label'>3 priorities</span>
              </div>
              <ol className='home-action-list'>
                {priorityActions.map((action) => (
                  <li key={action.number}>
                    <span className='home-action-number'>{action.number}</span>
                    <div className='home-action-copy'>
                      <h3>{action.title}</h3>
                      <p>{action.detail}</p>
                    </div>
                    <span className='home-action-tag'>{action.strategy}</span>
                  </li>
                ))}
              </ol>
            </div>

            <aside className='home-section home-evidence' id='evidence' aria-labelledby='evidence-title'>
              <span className='home-overline'>ASSESSMENT RECORD</span>
              <h2 id='evidence-title'>Evidence &amp; review</h2>
              <dl className='home-evidence-list'>
                <div><dt>Last reviewed</dt><dd>9 October 2026</dd></div>
                <div><dt>Next review due</dt><dd>9 January 2027</dd></div>
                <div><dt>Evidence coverage</dt><dd>5 of 8 strategies</dd></div>
                <div><dt>Assessment owner</dt><dd>Not assigned</dd></div>
              </dl>
              <p className='home-evidence-note'>Keep dated evidence for each assessed control to support review and audit.</p>
            </aside>
          </section>

          {signOutError && <p className='home-signout-error' role='alert'>{signOutError}</p>}
          <footer className='home-footer'>Pathwise <span>·</span> Essential Eight readiness overview <span>·</span> Sample data</footer>
        </main>
      </div>
    </div>
  )
}