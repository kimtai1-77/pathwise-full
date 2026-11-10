
import { useEffect, useRef } from 'react';
import './styles/DashNavbar.css';

export function DashNavbar ({
  activeLevel = 1,
  mspName = '',
  mspLogoUrl = '',
  onLevelSelect,
  onOrgSettings,
  onProfileEdit,
  onSignOut,
  signingOut = false,
  signOutError = '',
  userProfile = {
    name: '',
    role: 'Supervisor'
  }
}) {
  const profileMenuRef = useRef(null);

  useEffect(() => {
    const closeProfileMenu = (event) => {
      if (!profileMenuRef.current?.contains(event.target)) {
        profileMenuRef.current.open = false;
      }
    };

    const closeProfileMenuOnEscape = (event) => {
      if (event.key === 'Escape' && profileMenuRef.current?.open) {
        profileMenuRef.current.open = false;
        profileMenuRef.current.querySelector('summary')?.focus();
      }
    };

    document.addEventListener('pointerdown', closeProfileMenu);
    document.addEventListener('keydown', closeProfileMenuOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeProfileMenu);
      document.removeEventListener('keydown', closeProfileMenuOnEscape);
    };
  }, []);

  const handleLevelClick = (level) => {
    if (onLevelSelect) onLevelSelect(level);
  };

  return (
    <header className="dash-navbar">
      {/* Left Section: Branding & Logo */}
      <div className="name-wrapper">
        <div className={`logo-cont${mspLogoUrl ? ' has-company-logo' : ''}`}>
          {mspLogoUrl ? (
            <img src={mspLogoUrl} alt="" />
          ) : (
            <svg
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 -960 960 960" 
            >
            <path d="m438-338 226-226-57-57-169 169-84-84-57 57 141 141Zm42 258q-139-35-229.5-159.5T160-516v-244l320-120 320 120v244q0 152-90.5 276.5T480-80Zm0-84q104-33 172-132t68-220v-189l-240-90-240 90v189q0 121 68 220t172 132Zm0-316Z"/>
          </svg>
          )}
        </div>
        
        <div className="msp-name">
          {onOrgSettings ? (
            <button className="brand-title brand-title-button" type="button" onClick={onOrgSettings}>
              {mspName}
            </button>
          ) : (
            <h5 className="brand-title">{mspName}</h5>
          )}
          <span className="acsc-text">ACSC Essential Eight Compliance</span>
        </div>
      </div>

      {/* Center Section: Maturity Level Switcher */}
      <div className="level-wrapper">
        <button
          className={`level-cont ${activeLevel === 1 ? 'active' : ''}`}
          onClick={() => handleLevelClick(1)}
          type="button"
        >
          Level 1 Baseline
        </button>

        <button
          className={`level-cont ${activeLevel === 2 ? 'active' : ''}`}
          onClick={() => handleLevelClick(2)}
          type="button"
        >
          Level 2 Intermediate
        </button>

        <button
          className={`level-cont ${activeLevel === 3 ? 'active' : ''}`}
          onClick={() => handleLevelClick(3)}
          type="button"
        >
          Level 3 Advanced
        </button>
      </div>

      {/* Right Section: Sketched Profile Layout with SVG Icon */}
      <div className="profile-wrapper">
        <div className="profile-name-group">
          <span className="profile-name">{userProfile.name}</span>
          <span className="profile-role">
            <span className="role-label">Role:</span>{' '}{userProfile.role === 'owner' ? 'Owner' : userProfile.role === 'msp_admin' ? 'Admin' : userProfile.role === 'technician' ? 'Technician' : userProfile.role}
          </span>
        </div>

        <details className="profile-menu" ref={profileMenuRef}>
          <summary className="profile-cont" aria-label="Open user menu">
            <div className="profile-img">
              <svg className="user-icon" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <svg className="profile-menu-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m7 10 5 5 5-5" />
            </svg>
          </summary>

          <div className="profile-menu-panel">
            <div className="profile-menu-identity">
              <span className="profile-menu-name">{userProfile.name}</span>
              {/*{userProfile.email && <span className="profile-menu-email">{userProfile.email}</span>}*/}
              <span className="profile-menu-role">{userProfile.role}</span>
            </div>

            <button
              className="profile-menu-item"
              type="button"
              onClick={() => {
                onProfileEdit?.();
                profileMenuRef.current.open = false;
              }}
              disabled={!onProfileEdit}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />
                <path d="m19.4 15 .1.1a1.8 1.8 0 0 1-2.5 2.5l-.1-.1a1.8 1.8 0 0 0-3 .8v.2a1.8 1.8 0 0 1-3.6 0v-.2a1.8 1.8 0 0 0-3-.8l-.1.1a1.8 1.8 0 0 1-2.5-2.5l.1-.1a1.8 1.8 0 0 0-.8-3h-.2a1.8 1.8 0 0 1 0-3.6h.2a1.8 1.8 0 0 0 .8-3l-.1-.1a1.8 1.8 0 0 1 2.5-2.5l.1.1a1.8 1.8 0 0 0 3-.8v-.2a1.8 1.8 0 0 1 3.6 0v.2a1.8 1.8 0 0 0 3 .8l.1-.1a1.8 1.8 0 0 1 2.5 2.5l-.1.1a1.8 1.8 0 0 0 .8 3h.2a1.8 1.8 0 0 1 0 3.6H20a1.8 1.8 0 0 0-.6 3Z" />
              </svg>
              <span>Settings</span>
              {!onProfileEdit && <span className="profile-menu-hint">Coming soon</span>}
            </button>

            {signOutError && <p className="dash-navbar-signout-error" role="alert">{signOutError}</p>}

            <button
              className="profile-menu-item profile-menu-signout"
              onClick={onSignOut}
              type="button"
              disabled={signingOut || !onSignOut}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M10 17l5-5-5-5" />
                <path d="M15 12H3" />
                <path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
              </svg>
              <span>{signingOut ? 'Signing out...' : 'Sign out'}</span>
            </button>
          </div>
        </details>
      </div>
    </header>
  );
};