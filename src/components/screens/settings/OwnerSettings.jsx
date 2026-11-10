import { useState } from 'react';
import { OrganisationSettings } from './components/OrganisationSettings.jsx';
import { TeamSettings } from './components/TeamSettings.jsx';
import { TenantSettings } from './components/TenantSettings.jsx';
import { ComplianceSettings } from './components/ComplianceSettings.jsx';
import { DataPrivacySettings } from './components/DataPrivacySettings.jsx';
import './OwnerSettings.css';

const sections = [
  { id: 'organisation', label: 'Organisation' },
  { id: 'team', label: 'Team' },
  { id: 'tenants', label: 'Tenants' },
  { id: 'compliance', label: 'Compliance' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'security', label: 'Security' },
  { id: 'billing', label: 'Billing' },
  { id: 'data', label: 'Data & Privacy' },
];

export function OwnerSettings({
  user,
  onClose,
  tenants,
  selectedTenant,
  tenantsLoading,
  tenantsError,
}) {
  const [activeSection, setActiveSection] = useState('organisation');

  return (
    <main className="owner-settings-screen" id="owner-settings">
      <header className="owner-settings-header">
        <div>
          <span className="owner-settings-eyebrow">Owner settings</span>
          <h1>Settings</h1>
        </div>
        <button className="owner-settings-close" type="button" onClick={onClose}>Done</button>
      </header>

      <div className="owner-settings-layout">
        <nav className="owner-settings-nav" aria-label="Settings sections">
          {sections.map((section) => (
            <button
              key={section.id}
              className={activeSection === section.id ? 'is-active' : ''}
              type="button"
              onClick={() => setActiveSection(section.id)}
            >
              {section.label}
            </button>
          ))}
        </nav>

        <div className="owner-settings-content">
          {activeSection === 'organisation' && <OrganisationSettings user={user} />}
          {activeSection === 'team' && <TeamSettings user={user} />}
          {activeSection === 'tenants' && (
            <TenantSettings
              tenants={tenants}
              selectedTenant={selectedTenant}
              tenantsLoading={tenantsLoading}
              tenantsError={tenantsError}
            />
          )}
          {activeSection === 'compliance' && <ComplianceSettings />}
          {activeSection === 'notifications' && <SimpleSettings section="Notifications" />}
          {activeSection === 'security' && <SimpleSettings section="Security" />}
          {activeSection === 'billing' && <SimpleSettings section="Billing" />}
          {activeSection === 'data' && <DataPrivacySettings />}
        </div>
      </div>
    </main>
  );
}

function SimpleSettings({ section }) {
  const isNotifications = section === 'Notifications';
  const isSecurity = section === 'Security';
  const isBilling = section === 'Billing';

  return (
    <section className="settings-section">
      <div className="settings-section-heading">
        <h2>{section}</h2>
        <p>
          {isNotifications && 'Choose when Pathwise should notify your team.'}
          {isSecurity && 'Manage sign-in protection for your organisation.'}
          {isBilling && 'Review your current plan and billing details.'}
        </p>
      </div>

      {isNotifications && (
        <div className="settings-list">
          <ToggleRow label="Compliance deadlines" description="Upcoming and overdue compliance reminders." defaultChecked />
          <ToggleRow label="Evidence reviews" description="Updates when evidence is ready for review." defaultChecked />
          <ToggleRow label="Weekly summary" description="A weekly overview of compliance activity." />
          <ToggleRow label="Security alerts" description="Important sign-in and account activity." defaultChecked />
        </div>
      )}

      {isSecurity && (
        <div className="settings-list">
          <ToggleRow label="Multi-factor authentication" description="Require a second verification step at sign-in." />
          <div className="settings-row">
            <div><strong>Password</strong><p>Last changed over 90 days ago.</p></div>
            <button className="button-secondary" type="button">Reset password</button>
          </div>
          <div className="settings-row">
            <div><strong>Active sessions</strong><p>Review devices currently signed in.</p></div>
            <button className="button-secondary" type="button">View sessions</button>
          </div>
        </div>
      )}

      {isBilling && (
        <div className="settings-list">
          <div className="settings-row"><div><strong>Current plan</strong><p>Business plan</p></div><button className="button-secondary" type="button">Manage plan</button></div>
          <div className="settings-row"><div><strong>Payment method</strong><p>Visa ending in 4242</p></div><button className="button-secondary" type="button">Update</button></div>
          <div className="settings-row"><div><strong>Next invoice</strong><p>1 December 2026</p></div><button className="button-secondary" type="button">View invoices</button></div>
        </div>
      )}
    </section>
  );
}

function ToggleRow({ label, description, defaultChecked = false }) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <div className="settings-row">
      <div><strong>{label}</strong><p>{description}</p></div>
      <label className="settings-toggle">
        <input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} />
        <span aria-hidden="true" />
        <span className="sr-only">{label}</span>
      </label>
    </div>
  );
}
