import './styles/DashboardHeader.css'

export default function DashboardHeader({ user, role, onRoleChange, onSignOut, signingOut }) {
  const fullName = user?.user_metadata?.full_name || 'Signed-in user'
  const mspName = user?.user_metadata?.display_name || user?.user_metadata?.msp_name || 'Your company'

  return (
    <header className='dash-header'>
      <div className='dash-header-inner'>
        <a className='dash-brand' href='#overview' aria-label={`${mspName} overview`}>
          <span>{mspName}</span>
        </a>
        <p className='dash-title'>ACSC Essential Eight Compliance Engine</p>
        <div className='dash-profile' id='account-settings'>
          <button className='dash-profile-role' type='button' title='Switch demo role' onClick={onRoleChange}>Role: {role === 'supervisor' ? 'Supervisor' : 'Tech'}</button>
          <span className='dash-profile-name'>{fullName}</span>
          <button className='dash-signout' type='button' onClick={onSignOut} disabled={signingOut}>{signingOut ? 'Signing out...' : 'Sign out'}</button>
        </div>
      </div>
    </header>
  )
}