import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient.js';
import './styles/OrgDisplayNameSettings.css';

export function OrgDisplayNameSettings({ mspId, displayName, onDisplayNameUpdated }) {
  const [name, setName] = useState(displayName || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  async function saveDisplayName(event) {
    event.preventDefault();
    setError('');
    setStatus('');

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Enter a company display name.');
      return;
    }
    if (!mspId) {
      setError('Unable to determine your organization.');
      return;
    }

    setIsSaving(true);
    const { data, error: saveError } = await supabase
      .from('msps')
      .update({ display_name: trimmedName })
      .eq('id', mspId)
      .select('display_name')
      .single();
    setIsSaving(false);

    if (saveError) {
      setError('Unable to update the company display name.');
      return;
    }

    setName(data.display_name);
    onDisplayNameUpdated?.(data.display_name);
    setStatus('Company display name updated.');
  }

  return (
    <section className="owner-settings-panel org-display-name-settings">
      <div className="owner-settings-section-heading">
        <h3>Company name</h3>
        <p>Change the name shown across your Pathwise workspace.</p>
      </div>

      <form className="org-display-name-form" onSubmit={saveDisplayName}>
        <label className="profile-settings-field" htmlFor="org-display-name">
          <span>Display name</span>
          <input
            id="org-display-name"
            type="text"
            autoComplete="organization"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError('');
              setStatus('');
            }}
            maxLength={120}
            required
          />
        </label>
        <p className="profile-settings-help">Your original registered business name remains unchanged.</p>
        {error && <p className="profile-settings-message is-error" role="alert">{error}</p>}
        {status && <p className="profile-settings-message is-success" role="status">{status}</p>}
        <footer className="profile-settings-actions">
          <button className="profile-settings-submit" type="submit" disabled={isSaving || !name.trim()}>
            {isSaving ? 'Saving...' : 'Save name'}
          </button>
        </footer>
      </form>
    </section>
  );
}