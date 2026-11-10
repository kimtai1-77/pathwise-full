import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient.js';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock.js';
import './styles/OwnerProfileSettingsDialog.css';

export function OwnerProfileSettingsDialog({
  user,
  onClose,
  onProfileSaved,
}) {
  const [activeTab, setActiveTab] = useState('profile');
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || user?.user_metadata?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [isRevokingSessions, setIsRevokingSessions] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  useBodyScrollLock(true);

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  function clearFeedback() {
    setError('');
    setStatus('');
  }

  async function handleProfileSave(event) {
    event.preventDefault();
    clearFeedback();

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName) {
      setError('Enter your name.');
      return;
    }

    setIsSavingProfile(true);
    try {
      const emailChanged = trimmedEmail.toLowerCase() !== user?.email?.toLowerCase();
      const { data: authData, error: updateError } = await supabase.auth.updateUser({
        data: {
          ...user?.user_metadata,
          full_name: trimmedName,
        },
        ...(emailChanged ? { email: trimmedEmail } : {}),
      });
      if (updateError) throw updateError;

      const profileId = authData.user?.id || user?.id;
      if (!profileId) throw new Error('Could not identify your profile.');

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: trimmedName,
          ...(emailChanged ? { email: trimmedEmail } : {}),
        })
        .eq('id', profileId);
      if (profileError) throw profileError;

      onProfileSaved?.({
        fullName: trimmedName,
        ...(emailChanged ? { email: trimmedEmail } : {}),
      });
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save your profile.');
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handlePasswordReset() {
    clearFeedback();
    setIsSendingReset(true);
    try {
      const redirectTo = `${window.location.origin}/?auth=update-password`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(user.email, { redirectTo });
      if (resetError) throw resetError;
      setStatus(`Password reset instructions sent to ${user.email}.`);
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'Could not send password reset instructions.');
    } finally {
      setIsSendingReset(false);
    }
  }

  async function handleRevokeSessions() {
    clearFeedback();
    setIsRevokingSessions(true);
    try {
      const { error: signOutError } = await supabase.auth.signOut({ scope: 'others' });
      if (signOutError) throw signOutError;
      setStatus('Other signed-in sessions have been signed out.');
    } catch (sessionError) {
      setError(sessionError instanceof Error ? sessionError.message : 'Could not sign out other sessions.');
    } finally {
      setIsRevokingSessions(false);
    }
  }

  return (
    <div className="profile-settings-overlay" onClick={onClose}>
      <section
        className="profile-settings-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-settings-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="profile-settings-header">
          <div>
            <span className="profile-settings-eyebrow">ACCOUNT</span>
            <h2 id="profile-settings-title">Profile settings</h2>
          </div>
          <button className="profile-settings-close" type="button" onClick={onClose} aria-label="Close settings">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        <div className="profile-settings-tabs" role="tablist" aria-label="Profile settings">
          {['profile', 'security'].map((tab) => (
            <button
              key={tab}
              id={`profile-settings-tab-${tab}`}
              className={activeTab === tab ? 'is-active' : ''}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              aria-controls="profile-settings-panel"
              onClick={() => { setActiveTab(tab); clearFeedback(); }}
            >
              {tab === 'profile' ? 'Profile' : 'Security'}
            </button>
          ))}
        </div>

        <div
          className="profile-settings-content"
          id="profile-settings-panel"
          role="tabpanel"
          aria-labelledby={`profile-settings-tab-${activeTab}`}
        >
          {activeTab === 'profile' ? (
            <form className="profile-settings-form" onSubmit={handleProfileSave}>
              <div className="profile-settings-section-heading">
                <h3>Personal details</h3>
                <p>Update the name and email associated with your account.</p>
              </div>

              <label className="profile-settings-field" htmlFor="profile-settings-name">
                <span>Full name</span>
                <input
                  id="profile-settings-name"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(event) => {
                    setFullName(event.target.value);
                    clearFeedback();
                  }}
                  required
                />
              </label>

              <label className="profile-settings-field" htmlFor="profile-settings-email">
                <span>Email address</span>
                <input
                  id="profile-settings-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    clearFeedback();
                  }}
                  required
                />
              </label>

              <p className="profile-settings-help">Email changes take effect after you confirm them from your inbox.</p>

              {error && <p className="profile-settings-message is-error" role="alert">{error}</p>}
              {status && <p className="profile-settings-message is-success" role="status">{status}</p>}

              <footer className="profile-settings-actions">
                <button className="profile-settings-cancel" type="button" onClick={onClose}>Close</button>
                <button className="profile-settings-submit" type="submit" disabled={isSavingProfile}>
                  {isSavingProfile ? 'Saving...' : 'Save changes'}
                </button>
              </footer>
            </form>
          ) : (
            <div className="profile-settings-security">
              <div className="profile-settings-section-heading">
                <h3>Password</h3>
                <p>Send a secure password reset link to your account email.</p>
              </div>
              <button
                className="profile-settings-security-action"
                type="button"
                onClick={handlePasswordReset}
                disabled={isSendingReset || !user?.email}
              >
                {isSendingReset ? 'Sending...' : 'Send password reset email'}
              </button>

              <div className="profile-settings-security-divider" />

              <div className="profile-settings-section-heading">
                <h3>Active sessions</h3>
                <p>Sign out every other device while keeping this session active.</p>
              </div>
              <button
                className="profile-settings-security-action is-secondary"
                type="button"
                onClick={handleRevokeSessions}
                disabled={isRevokingSessions}
              >
                {isRevokingSessions ? 'Signing out...' : 'Sign out other sessions'}
              </button>

              {error && <p className="profile-settings-message is-error" role="alert">{error}</p>}
              {status && <p className="profile-settings-message is-success" role="status">{status}</p>}

              <footer className="profile-settings-actions">
                <button className="profile-settings-cancel" type="button" onClick={onClose}>Close</button>
              </footer>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}