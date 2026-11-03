export function DataPrivacySettings() {
  return (
    <section className="owner-settings-panel">
      <div className="owner-settings-section-heading">
        <h3>Data & Privacy</h3>
        <p>Export or permanently remove this organisation and its linked tenant data.</p>
      </div>

      <div className="owner-settings-row">
        <div><strong>Organisation data export</strong><p>Includes MSP and linked tenant data. Export status will appear here.</p></div>
        <button className="profile-settings-submit" type="button">Export data</button>
      </div>

      <div className="owner-settings-export-status">
        <span>No export in progress</span>
        <button type="button" disabled>Download</button>
      </div>

      <div className="owner-settings-danger">
        <div><strong>Remove organisation</strong><p>Permanently remove this organisation and its linked data.</p></div>
        <button type="button">Remove organisation</button>
      </div>
    </section>
  );
}
