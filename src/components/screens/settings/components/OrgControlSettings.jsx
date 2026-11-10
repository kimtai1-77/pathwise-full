import { useEffect, useRef, useState } from 'react';
import dropdownArrow from '@/assets/icons/keyboard_arrow_down.svg';
import './styles/OrgControlSettings.css';

export function OrgControlSettings({ section }) {
  if (section === 'Compliance') {
    return (
      <section className="owner-settings-panel">
        <div className="owner-settings-section-heading"><h3>Compliance</h3><p>Configure your Essential Eight compliance workspace.</p></div>
        <div className="org-control-fields">
          <div className="org-control-field">
            <span className="org-control-label">Framework</span>
            <div className="org-control-static" aria-disabled="true">Essential Eight</div>
          </div>
          <OrgDropdown
            id="assessment-scope"
            label="Assessment scope"
            value="All tenants"
            options={['All tenants', 'Selected tenants']}
          />
          <OrgDropdown
            id="reporting-period"
            label="Reporting period"
            value="Monthly"
            options={['Monthly', 'Quarterly']}
          />
        </div>
      </section>
    );
  }

  if (section === 'Notifications') {
    return (
      <section className="owner-settings-panel">
        <div className="owner-settings-section-heading"><h3>Notifications</h3><p>Choose when Pathwise should notify your team.</p></div>
        <OrgToggle label="Compliance deadlines" description="Upcoming and overdue compliance reminders." checked />
        <OrgToggle label="Evidence reviews" description="Updates when evidence is ready for review." checked />
        <OrgToggle label="Weekly summary" description="A weekly overview of compliance activity." />
        <OrgToggle label="Security alerts" description="Important sign-in and account activity." checked />
      </section>
    );
  }

  if (section === 'Billing') {
    return (
      <section className="owner-settings-panel">
        <div className="owner-settings-section-heading"><h3>Billing</h3><p>Review your plan and billing details.</p></div>
        <div className="owner-settings-row"><div><strong>Current plan</strong><p>Business plan</p></div><button className="profile-settings-cancel" type="button">Manage plan</button></div>
        <div className="owner-settings-row"><div><strong>Payment method</strong><p>Visa ending in 4242</p></div><button className="profile-settings-cancel" type="button">Update</button></div>
        <div className="owner-settings-row"><div><strong>Next invoice</strong><p>1 December 2026</p></div><button className="profile-settings-cancel" type="button">View invoices</button></div>
      </section>
    );
  }

  return null;
}

function OrgDropdown({ id, label, value, options }) {
  const dropdownRef = useRef(null);
  const [selectedValue, setSelectedValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    function closeDropdown(event) {
      if (!dropdownRef.current?.contains(event.target)) setIsOpen(false);
    }

    function closeOnEscape(event) {
      if (event.key === 'Escape') setIsOpen(false);
    }

    document.addEventListener('pointerdown', closeDropdown);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeDropdown);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  return (
    <div className="org-control-field" ref={dropdownRef}>
      <span className="org-control-label" id={`${id}-label`}>{label}</span>
      <button
        className="org-control-dropdown-trigger"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={`${id}-options`}
        aria-labelledby={`${id}-label ${id}-value`}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span id={`${id}-value`}>{selectedValue}</span>
        <img src={dropdownArrow} alt="" aria-hidden="true" />
      </button>
      {isOpen && (
        <div className="org-control-dropdown-options" id={`${id}-options`} role="listbox" aria-labelledby={`${id}-label`}>
          {options.map((option) => (
            <button
              key={option}
              type="button"
              role="option"
              aria-selected={selectedValue === option}
              className={selectedValue === option ? 'is-selected' : ''}
              onClick={() => {
                setSelectedValue(option);
                setIsOpen(false);
              }}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function OrgToggle({ label, description, checked = false }) {
  return (
    <label className="owner-settings-row owner-settings-toggle-row">
      <span><strong>{label}</strong><p>{description}</p></span>
      <input type="checkbox" defaultChecked={checked} />
    </label>
  );
}