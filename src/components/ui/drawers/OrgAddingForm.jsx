
import { useState } from 'react';
import { abnFiller } from '@/utils/abnFiller.js';
import './OrgAddingForm.css';

export const OrgAddingForm = ({ onClose, onSubmit, error: tenantError, onClearError }) => {
  const [abn, setAbn] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    entityType: '',
    abnStatus: '',
  });

  const handleSearchClick = async () => {
    setError(null);
    setFormData({ name: '', entityType: '', abnStatus: '' });
    setIsLoading(true);

    try {
      const result = await abnFiller(abn);

      if (result.error) {
        setError(result.error);
      } else {
        setFormData({
          name: result.data.name,
          entityType: result.data.entityType,
          abnStatus: result.data.abnStatus,
        });
      }
    } catch (err) {
      console.error('ABN lookup error:', err);
      setError('An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(formData.name);
  };

  const handleClose = () => {
    onClearError?.();
    onClose?.();
  };

  return (
    <div className="org-add-overlay" onClick={handleClose}>
      <section
        className="org-add-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="org-add-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="org-add-header">
          <div>
            <span className="org-add-eyebrow">TENANT SETUP</span>
            <h2 id="org-add-title">Add Tenant</h2>
          </div>
          <button className="org-add-close" type="button" onClick={handleClose} aria-label="Close dialog">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <form className="org-add-form" onSubmit={handleSubmit}>
          <div className="org-add-form-group">
            <label htmlFor="org-add-abn">ABN</label>
            <div className="org-add-input-row">
              <input
                id="org-add-abn"
                type="text"
                value={abn}
                onChange={(event) => {
                  setAbn(event.target.value);
                  setError(null);
                  setFormData({ name: '', entityType: '', abnStatus: '' });
                  onClearError?.();
                }}
                placeholder="Enter 11-digit ABN"
                autoFocus
              />
              <button
                className="org-add-lookup"
                type="button"
                onClick={handleSearchClick}
                disabled={isLoading}
              >
                {isLoading ? 'Searching...' : 'Lookup ABN'}
              </button>
            </div>
          </div>

          {error && <p className="org-add-error" role="alert">{error}</p>}
          {tenantError && <p className="org-add-error" role="alert">{tenantError}</p>}

          <div className="org-add-form-group">
            <label htmlFor="org-add-name">Business Name</label>
            <input
              id="org-add-name"
              type="text"
              value={formData.name}
              disabled
              placeholder="Populated automatically"
            />
          </div>

          <div className="org-add-form-group">
            <label htmlFor="org-add-entity-type">Entity Type</label>
            <input
              id="org-add-entity-type"
              type="text"
              value={formData.entityType}
              disabled
              placeholder="Populated automatically"
            />
          </div>

          <div className="org-add-form-group">
            <label htmlFor="org-add-abn-status">ABN Status</label>
            <input
              id="org-add-abn-status"
              type="text"
              value={formData.abnStatus}
              disabled
              placeholder="Populated automatically"
            />
          </div>

          <footer className="org-add-actions">
            <button className="org-add-cancel" type="button" onClick={handleClose}>Cancel</button>
            <button className="org-add-submit" type="submit" disabled={isLoading || !formData.name}>
              Add Tenant
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
};