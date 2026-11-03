export function OwnerControlsSettings({ section }) {
  if (section === 'Compliance') {
    return (
      <section className="owner-settings-panel">
        <div className="owner-settings-section-heading"><h3>Compliance</h3><p>Configure the organisation&apos;s compliance workspace.</p></div>
        <label className="owner-settings-field">Framework<select defaultValue="Essential Eight"><option>Essential Eight</option><option>ISO 27001</option><option>Custom framework</option></select></label>
        <label className="owner-settings-field">Assessment scope<select defaultValue="All tenants"><option>All tenants</option><option>Selected tenants</option></select></label>
        <label className="owner-settings-field">Reporting period<select defaultValue="Monthly"><option>Monthly</option><option>Quarterly</option></select></label>
      </section>
    );
  }

  if (section === 'Notifications') {
    return (
      <section className="owner-settings-panel">
        <div className="owner-settings-section-heading"><h3>Notifications</h3><p>Choose when Pathwise should notify your team.</p></div>
        <OwnerToggle label="Compliance deadlines" description="Upcoming and overdue compliance reminders." checked />
        <OwnerToggle label="Evidence reviews" description="Updates when evidence is ready for review." checked />
        <OwnerToggle label="Weekly summary" description="A weekly overview of compliance activity." />
        <OwnerToggle label="Security alerts" description="Important sign-in and account activity." checked />
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

function OwnerToggle({ label, description, checked = false }) {
  return (
    <label className="owner-settings-row owner-settings-toggle-row">
      <span><strong>{label}</strong><p>{description}</p></span>
      <input type="checkbox" defaultChecked={checked} />
    </label>
  );
}
