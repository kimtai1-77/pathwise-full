
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient.js';
import { StrategyRow } from '@/components/ui/dashboard_components/StrategyRow.jsx';
import { TenantAddingForm } from '@/components/ui/drawers/TenantAddingForm.jsx';
import { DashNavbar } from '@/components/ui/dashboard_components/DashNavbar.jsx';
import { OrgSettings } from '@/components/ui/dashboard_components/OrgSettings.jsx';
import { OnboardingLightbox } from '@/components/ui/dashboard_components/OnboardingLightbox.jsx';
import { OwnerProfileSettingsDialog } from '@/components/ui/dashboard_components/OwnerProfileSettingsDialog.jsx';
import { MaturityLevelGuardDialog } from '@/components/ui/dashboard_components/MaturityLevelGuardDialog.jsx';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock.js';
import TopDashRow from '@/components/ui/dashboard_components/TopDashRow.jsx';
import './MspDashboard.css';

const strategyNames = [
  'Patch Applications',
  'Patch Operating Systems',
  'Regular Backups',
  'Application Control',
  'Multi-Factor Authentication',
  'Restrict Administrative Privileges',
  'Restrict Microsoft Office Macros',
  'User Application Hardening',
];

export default function MspDashboard({ user, onSignOut }) {
  const [tenants, setTenants] = useState([]);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [strategyScores, setStrategyScores] = useState({});
  const [activeMaturityLevel, setActiveMaturityLevel] = useState(1);
  const [blockedMaturityLevel, setBlockedMaturityLevel] = useState(null);
  const [tenantsCollapsed, setTenantsCollapsed] = useState(true);
  const [tenantSearch, setTenantSearch] = useState('');
  const [tenantFormOpen, setTenantFormOpen] = useState(false);
  const [tenantError, setTenantError] = useState('');
  const [profileSettingsOpen, setProfileSettingsOpen] = useState(false);
  const [orgSettingsOpen, setOrgSettingsOpen] = useState(false);
  const [mspLogoUrl, setMspLogoUrl] = useState('');
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState('');
  const [profileRole, setProfileRole] = useState('');
  const [profileName, setProfileName] = useState('');
  const [profileMspId, setProfileMspId] = useState('');
  const [mspDisplayName, setMspDisplayName] = useState('');
  const [tenantsLoading, setTenantsLoading] = useState(false);
  const [tenantsLoaded, setTenantsLoaded] = useState(false);
  const [tenantsError, setTenantsError] = useState('');
  const showTenantSetupLightbox = profileRole === 'owner'
    && tenantsLoaded
    && !tenantsLoading
    && !tenantsError
    && tenants.length === 0;

  useBodyScrollLock(showTenantSetupLightbox);

  useEffect(() => {
    if (!user?.id) return;

    let isCancelled = false;

    async function fetchProfileRole() {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, role, msp_id')
        .eq('id', user.id)
        .single();

      if (!isCancelled) {
        setProfileRole(error ? '' : data?.role || '');
        setProfileName(error ? '' : data?.full_name || '');
        setProfileMspId(error ? '' : data?.msp_id || '');
      }
    }

    fetchProfileRole();

    return () => {
      isCancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!profileMspId) return;

    let isCancelled = false;

    async function fetchTenants() {
      setTenantsLoading(true);
      setTenantsLoaded(false);
      setTenantsError('');

      const { data, error } = await supabase
        .from('tenants')
        .select('id, name, display_name')
        .eq('msp_id', profileMspId)
        .order('created_at', { ascending: true });

      if (isCancelled) return;

      if (error) {
        setTenants([]);
        setSelectedTenantId('');
        setTenantsError('Unable to load tenants.');
      } else {
        const tenantRecords = (data || []).map((tenant) => ({
          ...tenant,
          display_name: tenant.display_name?.trim() || tenant.name,
        }));
        setTenants(tenantRecords);
        setSelectedTenantId((currentTenantId) => (
          tenantRecords.some((tenant) => tenant.id === currentTenantId)
            ? currentTenantId
            : tenantRecords[0]?.id || ''
        ));
      }
      setTenantsLoaded(true);
      setTenantsLoading(false);
    }

    fetchTenants();

    return () => {
      isCancelled = true;
    };
  }, [profileMspId]);

  useEffect(() => {
    if (!profileMspId) return;

    let isCancelled = false;

    async function fetchMspLogo() {
      const { data: logo, error } = await supabase
        .from('logos')
        .select('file_path')
        .eq('msp_id', profileMspId)
        .maybeSingle();

      if (isCancelled) return;
      if (error || !logo?.file_path) {
        setMspLogoUrl('');
        return;
      }

      const { data: signedLogo, error: signedUrlError } = await supabase.storage
        .from('logos')
        .createSignedUrl(logo.file_path, 60 * 60);

      if (!isCancelled) setMspLogoUrl(signedUrlError ? '' : signedLogo.signedUrl);
    }

    fetchMspLogo();
    return () => { isCancelled = true; };
  }, [profileMspId]);

  useEffect(() => {
    if (!profileMspId) return;

    let isCancelled = false;
    const fallbackName = user?.user_metadata?.display_name || user?.user_metadata?.msp_name || 'MSP';

    async function fetchMspDisplayName() {
      const { data, error } = await supabase
        .from('msps')
        .select('display_name, msp_name')
        .eq('id', profileMspId)
        .single();

      if (isCancelled) return;
      setMspDisplayName(error ? fallbackName : data?.display_name?.trim() || data?.msp_name || fallbackName);
    }

    fetchMspDisplayName();
    return () => { isCancelled = true; };
  }, [profileMspId, user?.user_metadata?.display_name, user?.user_metadata?.msp_name]);

  const handleStrategyScoreChange = useCallback((strategyName, score, maturityLevel) => {
    setStrategyScores((tenantScores) => ({
      ...tenantScores,
      [selectedTenantId]: {
        ...tenantScores[selectedTenantId],
        [maturityLevel]: {
          ...tenantScores[selectedTenantId]?.[maturityLevel],
          [strategyName]: score,
        },
      },
    }));
  }, [selectedTenantId]);

  const handleMaturityLevelSelect = useCallback((requestedLevel) => {
    if (requestedLevel === 1) {
      setActiveMaturityLevel(1);
      return;
    }

    const prerequisiteLevel = requestedLevel - 1;
    const prerequisiteScores = strategyScores[selectedTenantId]?.[prerequisiteLevel] || {};
    const isReady = strategyNames.every((strategyName) => prerequisiteScores[strategyName] === 100);

    if (isReady) setActiveMaturityLevel(requestedLevel);
    else setBlockedMaturityLevel(requestedLevel);
  }, [selectedTenantId, strategyScores]);

  const selectedTenant = tenants.find((tenant) => tenant.id === selectedTenantId);
  const selectedTenantDisplayName = selectedTenant?.display_name || selectedTenant?.name || '';
  const selectedTenantScores = strategyScores[selectedTenantId]?.[activeMaturityLevel] || {};
  const normalizedTenantSearch = tenantSearch.trim().toLowerCase();
  const visibleTenants = tenantsCollapsed
    ? tenants.filter((tenant) => tenant.id === selectedTenantId)
    : tenants.filter((tenant) => tenant.display_name.toLowerCase().includes(normalizedTenantSearch));

  async function handleSignOut() {
    if (!onSignOut || signingOut) return;

    setSigningOut(true);
    setSignOutError('');
    try {
      await onSignOut();
    } catch {
      setSignOutError('Sign out failed. Please try again.');
    } finally {
      setSigningOut(false);
    }
  }

  function selectTenant(tenantId) {
    setSelectedTenantId(tenantId);
    setTenantSearch('');
    setTenantsCollapsed(true);
  }

  async function addTenant(tenantName, tenantAbn = null) {
    const trimmedName = tenantName.trim();
    const cleanAbn = tenantAbn?.replace(/[\s-]/g, '') || null;
    if (!trimmedName) {
      setTenantError('Enter a tenant name.');
      return;
    }
    if (cleanAbn && !/^\d{11}$/.test(cleanAbn)) {
      setTenantError('Enter a valid 11-digit ABN, or leave it blank.');
      return;
    }

    const existingTenant = tenants.find((tenant) => (
      tenant.name.toLowerCase() === trimmedName.toLowerCase()
    ));

    if (existingTenant) {
      selectTenant(existingTenant.id);
      setTenantError('A tenant with this name already exists.');
      return;
    }

    if (!profileMspId) {
      setTenantError('Unable to determine your MSP.');
      return;
    }

    const { data, error } = await supabase
      .from('tenants')
      .insert({ msp_id: profileMspId, name: trimmedName, display_name: trimmedName, abn: cleanAbn })
      .select('id, name, display_name')
      .single();

    if (error) {
      if (error.code === '42501') {
        setTenantError("Sorry, only admins can add a tenant.");
      } else if (error.code === '23505') {
        setTenantError('A tenant with this name already exists.');
      } else {
        setTenantError('Unable to add tenant.');
      }
      return;
    }

    const newTenant = {
      id: data.id,
      name: data.name,
      display_name: data.display_name?.trim() || data.name,
    };
    setTenants((currentTenants) => [...currentTenants, newTenant]);
    selectTenant(newTenant.id);
    setTenantError('');
    setTenantFormOpen(false);
  }

  async function renameTenant(tenantId, requestedDisplayName) {
    if (profileRole !== 'owner') {
      return { success: false, error: 'Only MSP owners can rename tenants.' };
    }

    const nextDisplayName = requestedDisplayName.trim();
    if (!tenantId || !profileMspId || !nextDisplayName) {
      return { success: false, error: 'Enter a display name.' };
    }

    const { data, error } = await supabase
      .from('tenants')
      .update({ display_name: nextDisplayName })
      .eq('id', tenantId)
      .eq('msp_id', profileMspId)
      .select('id, display_name')
      .maybeSingle();

    if (error) {
      return {
        success: false,
        error: error.code === '23505'
          ? 'A tenant with this display name already exists.'
          : 'Unable to rename this tenant.',
      };
    }
    if (!data) return { success: false, error: 'Tenant not found or you do not have permission.' };

    setTenants((currentTenants) => currentTenants.map((tenant) => (
      tenant.id === tenantId ? { ...tenant, display_name: data.display_name } : tenant
    )));
    return { success: true };
  }

  async function removeTenant(tenantId) {
    if (profileRole !== 'owner') {
      return { success: false, error: 'Only MSP owners can remove tenants.' };
    }
    if (!tenantId || !profileMspId) {
      return { success: false, error: 'Unable to identify this tenant.' };
    }

    const { data, error } = await supabase.functions.invoke('delete-tenant', {
      body: { tenant_id: tenantId },
    });

    if (error) {
      let message = error.message || 'Unable to remove this tenant.';
      if (error.context?.json) {
        const details = await error.context.json().catch(() => null);
        message = details?.error || message;
      }
      return { success: false, error: message };
    }
    if (!data?.ok) return { success: false, error: data?.error || 'Unable to remove this tenant.' };

    const remainingTenants = tenants.filter((tenant) => tenant.id !== tenantId);
    setTenants(remainingTenants);
    setSelectedTenantId((currentTenantId) => (
      currentTenantId === tenantId ? remainingTenants[0]?.id || '' : currentTenantId
    ));
    setStrategyScores((currentScores) => {
      const nextScores = { ...currentScores };
      delete nextScores[tenantId];
      return nextScores;
    });
    setTenantSearch('');
    setTenantsCollapsed(true);
    setTenantError('');
    if (remainingTenants.length === 0) setOrgSettingsOpen(false);
    return { success: true };
  }

  return (
    <div className="msp-dashboard">
      <DashNavbar
        activeLevel={activeMaturityLevel}
        onLevelSelect={handleMaturityLevelSelect}
        mspName={mspDisplayName || user?.user_metadata?.display_name || user?.user_metadata?.msp_name || 'MSP'}
        mspLogoUrl={mspLogoUrl}
        onOrgSettings={['owner', 'msp_admin'].includes(profileRole) ? () => setOrgSettingsOpen(true) : undefined}
        onProfileEdit={() => setProfileSettingsOpen(true)}
        onSignOut={handleSignOut}
        signingOut={signingOut}
        signOutError={signOutError}
        userProfile={{
          name: profileName || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || 'Admin',
          email: user?.email,
          role: profileRole || 'Loading...'
        }}
      />

      <main className={`msp-dashboard-main${tenantsCollapsed ? ' is-sidebar-collapsed' : ''}`} id="dashboard">
        <aside
          className={`msp-dashboard-tenants-panel${tenantsCollapsed ? ' is-collapsed' : ''}`}
          id="msp-dashboard-tenants-panel"
          aria-labelledby="msp-dashboard-tenants-title"
        >
          <div className="msp-dashboard-tenants-heading">
            <div className="msp-dashboard-tenants-heading-copy">
              <h1 className="msp-dashboard-tenants-title" id="msp-dashboard-tenants-title">
                Tenants
              </h1>
              <p className="msp-dashboard-tenants-count">{tenants.length} tenants</p>
            </div>
            <button
              className="msp-dashboard-sidebar-toggle"
              type="button"
              aria-label={tenantsCollapsed ? 'Open sidebar' : 'Close sidebar'}
              aria-expanded={!tenantsCollapsed}
              aria-controls="msp-dashboard-tenants-panel"
              onClick={() => setTenantsCollapsed((collapsed) => !collapsed)}
              data-tooltip={tenantsCollapsed ? 'Open sidebar' : 'Close sidebar'}
            >
              <svg viewBox="0 -960 960 960" aria-hidden="true" focusable="false">
                <path d={tenantsCollapsed
                  ? 'M504-480 320-664l56-56 240 240-240 240-56-56 184-184Z'
                  : 'M560-240 320-480l240-240 56 56-184 184 184 184-56 56Z'} />
              </svg>
            </button>
          </div>

          {!tenantsCollapsed && (
            <div className="msp-dashboard-tenants-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                id="msp-dashboard-tenants-search"
                type="search"
                value={tenantSearch}
                onChange={(event) => setTenantSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape' && tenantSearch) {
                    setTenantSearch('');
                  }
                }}
                placeholder="Search tenant"
                autoComplete="off"
              />
              {tenantSearch && (
                <svg
                  className="msp-dashboard-tenants-search-clear"
                  viewBox="0 0 24 24"
                  aria-label="Clear tenant search"
                  role="img"
                  onClick={() => setTenantSearch('')}
                >
                  <path d="M6 6 18 18M18 6 6 18" />
                </svg>
              )}
            </div>
          )}

          <div className="msp-dashboard-tenants-form">
            <button
              className="msp-dashboard-tenants-add"
              type="button"
              onClick={() => {
                setTenantError('');
                setTenantFormOpen(true);
              }}
              aria-label="Add tenant"
              title="Add tenant"
            >
              <span className="msp-dashboard-tenants-add-label">Add tenant</span>
              <span className="msp-dashboard-tenants-add-icon" aria-hidden="true">+</span>
            </button>
          </div>

          <nav className="msp-dashboard-tenants-list" aria-label="Tenants">
            {visibleTenants.map((tenant) => (
              <button
                className={`msp-dashboard-tenants-item${selectedTenantId === tenant.id ? ' is-selected' : ''}`}
                key={tenant.id}
                type="button"
                aria-current={selectedTenantId === tenant.id ? 'true' : undefined}
                aria-label={tenant.display_name}
                title={tenant.display_name}
                onClick={() => selectTenant(tenant.id)}
              >
                <span className="msp-dashboard-tenants-item-initial" aria-hidden="true">
                  {tenant.display_name.trim().charAt(0).toUpperCase()}
                </span>
                <span className="msp-dashboard-tenants-item-name">{tenant.display_name}</span>
              </button>
            ))}
            {!tenantsCollapsed && tenantsLoading && (
              <p className="msp-dashboard-tenants-empty">Loading tenants...</p>
            )}
            {!tenantsCollapsed && !tenantsLoading && tenantsError && (
              <p className="msp-dashboard-tenants-empty" role="alert">{tenantsError}</p>
            )}
            {!tenantsCollapsed && !tenantsLoading && !tenantsError && visibleTenants.length === 0 && (
              <p className="msp-dashboard-tenants-empty">{tenantSearch ? 'No tenant found.' : 'No tenants added yet.'}</p>
            )}
          </nav>
        </aside>

        <section className="msp-dashboard-workspace" aria-label="Compliance overview">
          <TopDashRow
            tenantName={selectedTenantDisplayName}
            scores={Object.values(selectedTenantScores)}
          />

          <section className="msp-dashboard-strategies" aria-labelledby="msp-dashboard-strategies-title">
            <div className="msp-dashboard-strategies-heading">
              <div>
                <h2 className="msp-dashboard-strategies-title" id="msp-dashboard-strategies-title">
                  Strategies
                </h2>
              </div>
              <span className="msp-dashboard-strategies-count">8 strategies</span>
            </div>

            <div className="msp-dashboard-strategies-list">
              <StrategyRow
                key="strategy-1"
                strategyName="Patch Applications"
                maturityLevel={activeMaturityLevel}
                tenantId={selectedTenantId}
                mspId={profileMspId}
                userId={user?.id}
                reviewerRole={profileRole}
                onScoreChange={handleStrategyScoreChange}
              />

              <StrategyRow
                key="strategy-2"
                strategyName="Patch Operating Systems"
                maturityLevel={activeMaturityLevel}
                tenantId={selectedTenantId}
                mspId={profileMspId}
                userId={user?.id}
                reviewerRole={profileRole}
                onScoreChange={handleStrategyScoreChange}
              />

              <StrategyRow
                key="strategy-3"
                strategyName="Regular Backups"
                maturityLevel={activeMaturityLevel}
                tenantId={selectedTenantId}
                mspId={profileMspId}
                userId={user?.id}
                reviewerRole={profileRole}
                onScoreChange={handleStrategyScoreChange}
              />

              <StrategyRow
                key="strategy-4"
                strategyName="Application Control"
                maturityLevel={activeMaturityLevel}
                tenantId={selectedTenantId}
                mspId={profileMspId}
                userId={user?.id}
                reviewerRole={profileRole}
                onScoreChange={handleStrategyScoreChange}
              />

              <StrategyRow
                key="strategy-5"
                strategyName="Multi-Factor Authentication"
                maturityLevel={activeMaturityLevel}
                tenantId={selectedTenantId}
                mspId={profileMspId}
                userId={user?.id}
                reviewerRole={profileRole}
                onScoreChange={handleStrategyScoreChange}
              />

              <StrategyRow
                key="strategy-6"
                strategyName="Restrict Administrative Privileges"
                maturityLevel={activeMaturityLevel}
                tenantId={selectedTenantId}
                mspId={profileMspId}
                userId={user?.id}
                reviewerRole={profileRole}
                onScoreChange={handleStrategyScoreChange}
              />

              <StrategyRow
                key="strategy-7"
                strategyName="Restrict Microsoft Office Macros"
                maturityLevel={activeMaturityLevel}
                tenantId={selectedTenantId}
                mspId={profileMspId}
                userId={user?.id}
                reviewerRole={profileRole}
                onScoreChange={handleStrategyScoreChange}
              />

              <StrategyRow
                key="strategy-8"
                strategyName="User Application Hardening"
                maturityLevel={activeMaturityLevel}
                tenantId={selectedTenantId}
                mspId={profileMspId}
                userId={user?.id}
                reviewerRole={profileRole}
                onScoreChange={handleStrategyScoreChange}
              />
            </div>
          </section>
        </section>
      </main>

      <footer className="msp-dashboard-footer">
        <div className="msp-dashboard-footer-wrapper">
          <span className="msp-dashboard-footer-brand">Pathwise Systems</span>
          <span className="msp-dashboard-footer-copy">Essential Eight compliance Monitoring</span>
        </div>
      </footer>

      {tenantFormOpen && (
        <TenantAddingForm
          onClose={() => {
            setTenantFormOpen(false);
            setTenantError('');
          }}
          onSubmit={addTenant}
          error={tenantError}
          onClearError={() => setTenantError('')}
        />
      )}

      {blockedMaturityLevel && (
        <MaturityLevelGuardDialog
          requiredLevel={blockedMaturityLevel}
          onClose={() => setBlockedMaturityLevel(null)}
        />
      )}

      {profileSettingsOpen && (
        <OwnerProfileSettingsDialog
          user={user}
          onClose={() => setProfileSettingsOpen(false)}
          onProfileSaved={({ fullName }) => setProfileName(fullName)}
        />
      )}

      {orgSettingsOpen && (
        <OrgSettings
          user={user}
          role={profileRole}
          mspId={profileMspId}
          mspName={mspDisplayName || user?.user_metadata?.display_name || user?.user_metadata?.msp_name || 'MSP'}
          displayName={mspDisplayName}
          onClose={() => setOrgSettingsOpen(false)}
          onDisplayNameUpdated={setMspDisplayName}
          onAddTenant={() => {
            setTenantError('');
            setTenantFormOpen(true);
          }}
          onLogoUpdated={setMspLogoUrl}
          tenants={tenants}
          selectedTenantId={selectedTenantId}
          onRenameTenant={renameTenant}
          onRemoveTenant={removeTenant}
          tenantsLoading={tenantsLoading}
          tenantsError={tenantsError}
        />
      )}

      {showTenantSetupLightbox && (
        <OnboardingLightbox
          onAddTenant={() => {
            setTenantError('');
            setTenantFormOpen(true);
          }}
        />
      )}
    </div>
  );
}