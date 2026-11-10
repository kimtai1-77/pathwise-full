import { useEffect, useState } from 'react';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock.js';
import { TeamSettings } from '@/components/screens/settings/components/TeamSettings.jsx';
import { TenantSettings } from '@/components/screens/settings/components/TenantSettings.jsx';
import { OrgControlSettings } from '@/components/screens/settings/components/OrgControlSettings.jsx';
import { DataPrivacySettings } from '@/components/screens/settings/components/DataPrivacySettings.jsx';
import { OrgLogoSettings } from '@/components/screens/settings/components/OrgLogoSettings.jsx';
import { OrgDisplayNameSettings } from '@/components/screens/settings/components/OrgDisplayNameSettings.jsx';
import './styles/OwnerProfileSettingsDialog.css';
import './styles/OrgSettings.css';

export function OrgSettings({
  user,
  role,
  mspId,
  mspName,
  displayName,
  onClose,
  onAddTenant,
  onDisplayNameUpdated,
  onLogoUpdated,
  tenants,
  selectedTenantId,
  onRenameTenant,
  onRemoveTenant,
  tenantsLoading,
  tenantsError,
}) {
  useBodyScrollLock(true);

  const isOwner = role?.toLowerCase() === 'owner';
  const canManageTeam = isOwner || role?.toLowerCase() === 'msp_admin';
  const [activeTab, setActiveTab] = useState(isOwner ? 'organization' : 'team');
  const tabs = canManageTeam ? [
    { id: 'organization', label: 'Organization', ownerOnly: true },
    { id: 'team', label: 'Team' },
    { id: 'tenants', label: 'Tenants' },
    { id: 'compliance', label: 'Compliance' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'billing', label: 'Billing', ownerOnly: true },
    { id: 'data', label: 'Data & Privacy', ownerOnly: true },
  ] : [];

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  return (
    <div className="profile-settings-overlay" onClick={onClose}>
      <section
        className="profile-settings-dialog is-owner"
        role="dialog"
        aria-modal="true"
        aria-labelledby="org-settings-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="profile-settings-header">
          <div>
            <span className="profile-settings-eyebrow">ORGANIZATION</span>
            <h2 id="org-settings-title">Organization settings</h2>
          </div>
          <button className="profile-settings-close" type="button" onClick={onClose} aria-label="Close settings">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        <div className="profile-settings-tabs" role="tablist" aria-label="Organization settings">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              id={`org-settings-tab-${tab.id}`}
              className={activeTab === tab.id ? 'is-active' : ''}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls="org-settings-panel"
              disabled={tab.ownerOnly && !isOwner}
              aria-disabled={tab.ownerOnly && !isOwner}
              title={tab.ownerOnly && !isOwner ? 'Only the MSP owner can manage this section.' : undefined}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div
          className="profile-settings-content"
          id="org-settings-panel"
          role="tabpanel"
          aria-labelledby={`org-settings-tab-${activeTab}`}
        >
          {activeTab === 'organization' && isOwner && (
            <div className="org-settings-identity-content">
              <OrgDisplayNameSettings
                mspId={mspId}
                displayName={displayName || mspName}
                onDisplayNameUpdated={onDisplayNameUpdated}
              />
              <OrgLogoSettings mspId={mspId} mspName={displayName || mspName} onLogoUpdated={onLogoUpdated} />
            </div>
          )}
          {activeTab === 'team' && canManageTeam && <TeamSettings user={user} role={role?.toLowerCase()} />}
          {activeTab === 'tenants' && canManageTeam && (
            <TenantSettings
              tenants={tenants}
              selectedTenantId={selectedTenantId}
              onAddTenant={onAddTenant}
              canManageTenants={isOwner}
              onRenameTenant={onRenameTenant}
              onRemoveTenant={onRemoveTenant}
              tenantsLoading={tenantsLoading}
              tenantsError={tenantsError}
            />
          )}
          {['compliance', 'notifications'].includes(activeTab) && canManageTeam && (
            <OrgControlSettings section={activeTab[0].toUpperCase() + activeTab.slice(1)} />
          )}
          {activeTab === 'billing' && isOwner && <OrgControlSettings section="Billing" />}
          {activeTab === 'data' && isOwner && <DataPrivacySettings />}
        </div>
      </section>
    </div>
  );
}