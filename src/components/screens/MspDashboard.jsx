
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient.js';
import { StrategyRow } from '@/components/ui/dashboard_components/StrategyRow.jsx';
import { OrgAddingForm } from '@/components/ui/drawers/OrgAddingForm.jsx';
import { DashNavbar } from '@/components/ui/dashboard_components/DashNavbar.jsx';
import { OwnerProfileSettingsDialog } from '@/components/ui/dashboard_components/OwnerProfileSettingsDialog.jsx';
import { MaturityLevelGuardDialog } from '@/components/ui/dashboard_components/MaturityLevelGuardDialog.jsx';
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
  const [selectedTenant, setSelectedTenant] = useState('');
  const [strategyScores, setStrategyScores] = useState({});
  const [activeMaturityLevel, setActiveMaturityLevel] = useState(1);
  const [blockedMaturityLevel, setBlockedMaturityLevel] = useState(null);
  const [tenantsCollapsed, setTenantsCollapsed] = useState(true);
  const [tenantSearch, setTenantSearch] = useState('');
  const [tenantFormOpen, setTenantFormOpen] = useState(false);
  const [tenantError, setTenantError] = useState('');
  const [profileSettingsOpen, setProfileSettingsOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState('');
  const [profileRole, setProfileRole] = useState('');
  const [profileName, setProfileName] = useState('');
  const [tenantsLoading, setTenantsLoading] = useState(false);
  const [tenantsError, setTenantsError] = useState('');

  useEffect(() => {
    if (!user?.id) return;

    let isCancelled = false;

    async function fetchProfileRole() {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', user.id)
        .single();

      if (!isCancelled) {
        setProfileRole(error ? '' : data?.role || '');
        setProfileName(error ? '' : data?.full_name || '');
      }
    }

    fetchProfileRole();

    return () => {
      isCancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    let isCancelled = false;

    async function fetchTenants() {
      setTenantsLoading(true);
      setTenantsError('');

      const { data, error } = await supabase
        .from('tenants')
        .select('name')
        .eq('msp_id', user.id)
        .order('created_at', { ascending: true });

      if (isCancelled) return;

      if (error) {
        setTenants([]);
        setSelectedTenant('');
        setTenantsError('Unable to load tenants.');
      } else {
        const tenantNames = (data || []).map((tenant) => tenant.name);
        setTenants(tenantNames);
        setSelectedTenant((currentTenant) => tenantNames.includes(currentTenant) ? currentTenant : tenantNames[0] || '');
      }
      setTenantsLoading(false);
    }

    fetchTenants();

    return () => {
      isCancelled = true;
    };
  }, [user?.id]);

  const handleStrategyScoreChange = useCallback((strategyName, score, maturityLevel) => {
    setStrategyScores((tenantScores) => ({
      ...tenantScores,
      [selectedTenant]: {
        ...tenantScores[selectedTenant],
        [maturityLevel]: {
          ...tenantScores[selectedTenant]?.[maturityLevel],
          [strategyName]: score,
        },
      },
    }));
  }, [selectedTenant]);

  const handleMaturityLevelSelect = useCallback((requestedLevel) => {
    if (requestedLevel === 1) {
      setActiveMaturityLevel(1);
      return;
    }

    const prerequisiteLevel = requestedLevel - 1;
    const prerequisiteScores = strategyScores[selectedTenant]?.[prerequisiteLevel] || {};
    const isReady = strategyNames.every((strategyName) => prerequisiteScores[strategyName] === 100);

    if (isReady) setActiveMaturityLevel(requestedLevel);
    else setBlockedMaturityLevel(requestedLevel);
  }, [selectedTenant, strategyScores]);

  const selectedTenantScores = strategyScores[selectedTenant]?.[activeMaturityLevel] || {};
  const normalizedTenantSearch = tenantSearch.trim().toLowerCase();
  const visibleTenants = tenantsCollapsed
    ? tenants.filter((tenant) => tenant === selectedTenant)
    : tenants.filter((tenant) => tenant.toLowerCase().includes(normalizedTenantSearch));

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

  function selectTenant(tenant) {
    setSelectedTenant(tenant);
    setTenantSearch('');
    setTenantsCollapsed(true);
  }

  async function addTenant(tenantName) {
    const trimmedName = tenantName.trim();
    if (!trimmedName) {
      setTenantError('Enter a tenant name.');
      return;
    }

    const existingTenant = tenants.find(
      (tenant) => tenant.toLowerCase() === trimmedName.toLowerCase()
    );

    if (existingTenant) {
      selectTenant(existingTenant);
      setTenantError('A tenant with this name already exists.');
      return;
    }

    const { error } = await supabase
      .from('tenants')
      .insert({ msp_id: user.id, name: trimmedName });

    if (error) {
      setTenantError(error.code === '23505' ? 'A tenant with this name already exists.' : 'Unable to add tenant.');
      return;
    }

    setTenants((currentTenants) => [...currentTenants, trimmedName]);
    selectTenant(trimmedName);
    setTenantError('');
    setTenantFormOpen(false);
  }

  return (
    <div className="msp-dashboard">
      <DashNavbar
        activeLevel={activeMaturityLevel}
        onLevelSelect={handleMaturityLevelSelect}
        mspName={user?.user_metadata?.display_name || user?.user_metadata?.msp_name || 'MSP'}
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
                className={`msp-dashboard-tenants-item${selectedTenant === tenant ? ' is-selected' : ''}`}
                key={tenant}
                type="button"
                aria-current={selectedTenant === tenant ? 'true' : undefined}
                aria-label={tenant}
                title={tenant}
                onClick={() => selectTenant(tenant)}
              >
                <span className="msp-dashboard-tenants-item-initial" aria-hidden="true">
                  {tenant.trim().charAt(0).toUpperCase()}
                </span>
                <span className="msp-dashboard-tenants-item-name">{tenant}</span>
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
            tenantName={selectedTenant}
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
                onScoreChange={handleStrategyScoreChange}
              />

              <StrategyRow
                key="strategy-2"
                strategyName="Patch Operating Systems"
                maturityLevel={activeMaturityLevel}
                onScoreChange={handleStrategyScoreChange}
              />

              <StrategyRow
                key="strategy-3"
                strategyName="Regular Backups"
                maturityLevel={activeMaturityLevel}
                onScoreChange={handleStrategyScoreChange}
              />

              <StrategyRow
                key="strategy-4"
                strategyName="Application Control"
                maturityLevel={activeMaturityLevel}
                onScoreChange={handleStrategyScoreChange}
              />

              <StrategyRow
                key="strategy-5"
                strategyName="Multi-Factor Authentication"
                maturityLevel={activeMaturityLevel}
                onScoreChange={handleStrategyScoreChange}
              />

              <StrategyRow
                key="strategy-6"
                strategyName="Restrict Administrative Privileges"
                maturityLevel={activeMaturityLevel}
                onScoreChange={handleStrategyScoreChange}
              />

              <StrategyRow
                key="strategy-7"
                strategyName="Restrict Microsoft Office Macros"
                maturityLevel={activeMaturityLevel}
                onScoreChange={handleStrategyScoreChange}
              />

              <StrategyRow
                key="strategy-8"
                strategyName="User Application Hardening"
                maturityLevel={activeMaturityLevel}
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
        <OrgAddingForm
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
          role={profileRole}
          onClose={() => setProfileSettingsOpen(false)}
          onProfileSaved={({ fullName }) => setProfileName(fullName)}
        />
      )}
    </div>
  );
}