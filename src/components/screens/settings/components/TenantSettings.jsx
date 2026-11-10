import { useEffect, useState } from 'react';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock.js';

export function TenantSettings({
  tenants = [],
  selectedTenantId = '',
  onAddTenant,
  canManageTenants = false,
  onRenameTenant,
  onRemoveTenant,
  tenantsLoading = false,
  tenantsError = '',
}) {
  const [expandedTenantId, setExpandedTenantId] = useState(null);
  const [renameTarget, setRenameTarget] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameError, setRenameError] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [removeError, setRemoveError] = useState('');
  const [isRemoving, setIsRemoving] = useState(false);
  useBodyScrollLock(Boolean(renameTarget || removeTarget));

  useEffect(() => {
    if (!renameTarget && !removeTarget) return undefined;
    const handleKeyDown = (event) => {
      if (event.key !== 'Escape' || isRenaming || isRemoving) return;
      setRenameTarget(null);
      setRemoveTarget(null);
      setRenameError('');
      setRemoveError('');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [renameTarget, removeTarget, isRenaming, isRemoving]);

  function beginRename(tenant, tenantName) {
    setExpandedTenantId(null);
    setRenameTarget({ id: tenant.id, name: tenantName });
    setRenameValue(tenantName);
    setRenameError('');
  }

  async function submitRename(event) {
    event.preventDefault();
    const nextDisplayName = renameValue.trim();
    if (!nextDisplayName) {
      setRenameError('Enter a display name.');
      return;
    }
    if (nextDisplayName === renameTarget.name) {
      setRenameTarget(null);
      return;
    }

    setIsRenaming(true);
    setRenameError('');
    try {
      const result = await onRenameTenant?.(renameTarget.id, nextDisplayName);
      if (!result?.success) {
        setRenameError(result?.error || 'Unable to rename this tenant.');
        return;
      }
      setRenameTarget(null);
    } catch {
      setRenameError('Unable to rename this tenant. Please try again.');
    } finally {
      setIsRenaming(false);
    }
  }

  async function confirmRemove() {
    if (!removeTarget || isRemoving) return;
    setIsRemoving(true);
    setRemoveError('');
    try {
      const result = await onRemoveTenant?.(removeTarget.id);
      if (!result?.success) {
        setRemoveError(result?.error || 'Unable to remove this tenant.');
        return;
      }
      setRemoveTarget(null);
      setExpandedTenantId(null);
    } catch {
      setRemoveError('Unable to remove this tenant. Please try again.');
    } finally {
      setIsRemoving(false);
    }
  }

  return (
    <section className="owner-settings-panel tenant-settings-panel">
      <div className="owner-settings-panel-heading">
        <div>
          <h3>Tenants</h3>
          <p>Review and manage the tenants in your organisation.</p>
        </div>
        <div className="tenant-settings-heading-actions">
          <span className="tenant-settings-count">{tenants.length} tenants</span>
          {onAddTenant && (
            <button className="profile-settings-submit" type="button" onClick={onAddTenant}>Add tenant</button>
          )}
        </div>
      </div>

      <div className="tenant-settings-list" role="list" aria-label="Tenants">
        {tenants.map((tenant, index) => {
          const tenantName = tenant.display_name?.trim() || tenant.name;
          const tenantId = tenant.id;
          const isExpanded = expandedTenantId === tenantId;
          const actionsId = `tenant-actions-${index}`;

          return (
            <div className="tenant-settings-row" key={tenantId} role="listitem">
              <div className="tenant-settings-row-heading">
                <button
                  className="tenant-settings-identity"
                  type="button"
                  aria-current={selectedTenantId === tenantId ? 'true' : undefined}
                  aria-expanded={canManageTenants && tenantId ? isExpanded : undefined}
                  aria-controls={canManageTenants && tenantId ? actionsId : undefined}
                  disabled={!canManageTenants || !tenantId}
                  onClick={() => setExpandedTenantId(isExpanded ? null : tenantId)}
                >
                  <span className="tenant-settings-initial" aria-hidden="true">
                    {tenantName.trim().charAt(0).toUpperCase()}
                  </span>
                  <span className="tenant-settings-name">{tenantName}</span>
                  {selectedTenantId === tenantId && <span className="tenant-settings-current">Current</span>}
                </button>
                {canManageTenants && tenantId && (
                  <button
                    className="tenant-settings-disclosure"
                    type="button"
                    aria-label={`${isExpanded ? 'Hide' : 'Show'} actions for ${tenantName}`}
                    aria-expanded={isExpanded}
                    aria-controls={actionsId}
                    title={`${isExpanded ? 'Hide' : 'Show'} tenant actions`}
                    onClick={() => setExpandedTenantId(isExpanded ? null : tenantId)}
                  >
                    <svg className="tenant-settings-arrow" viewBox="0 0 24 24" aria-hidden="true">
                      {isExpanded ? (
                        <path d="M7.41 15.41 12 10.83l4.59 4.58L18 14l-6-6-6 6z" />
                      ) : (
                        <path d="m7.41 8.59 4.59 4.58 4.59-4.58L18 10l-6 6-6-6z" />
                      )}
                    </svg>
                  </button>
                )}
              </div>
              <div
                className="tenant-settings-actions"
                id={actionsId}
                aria-label={`${tenantName} actions`}
                hidden={!isExpanded}
              >
                <button type="button" onClick={() => beginRename(tenant, tenantName)}>Rename</button>
                <button className="tenant-settings-remove" type="button" onClick={() => {
                  setRemoveTarget({ id: tenantId, name: tenantName });
                  setRemoveError('');
                  setExpandedTenantId(null);
                }}>Remove</button>
              </div>
            </div>
          );
        })}
      </div>

      {tenantsLoading && <p className="owner-settings-empty" role="status">Loading tenants...</p>}
      {!tenantsLoading && tenantsError && <p className="owner-settings-empty" role="alert">{tenantsError}</p>}
      {!tenantsLoading && !tenantsError && tenants.length === 0 && (
        <p className="owner-settings-empty">No tenants added yet. Add tenants from the dashboard.</p>
      )}

      {renameTarget && (
        <div className="tenant-settings-modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !isRenaming) setRenameTarget(null);
        }}>
          <form
            className="tenant-settings-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tenant-rename-title"
            onClick={(event) => event.stopPropagation()}
            onSubmit={submitRename}
          >
            <h2 id="tenant-rename-title">Rename tenant</h2>
            <label htmlFor="tenant-rename-name">Display name</label>
            <input
              id="tenant-rename-name"
              type="text"
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
              maxLength={120}
              autoFocus
              required
            />
            {renameError && <p className="tenant-settings-modal-error" role="alert">{renameError}</p>}
            <div className="tenant-settings-modal-actions">
              <button className="tenant-settings-modal-cancel" type="button" disabled={isRenaming} onClick={() => setRenameTarget(null)}>Cancel</button>
              <button className="tenant-settings-modal-submit" type="submit" disabled={isRenaming || !renameValue.trim()}>
                {isRenaming ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      {removeTarget && (
        <div className="tenant-settings-modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !isRemoving) setRemoveTarget(null);
        }}>
          <section
            className="tenant-settings-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="tenant-remove-title"
            aria-describedby="tenant-remove-description"
          >
            <h2 id="tenant-remove-title">Remove tenant?</h2>
            <p id="tenant-remove-description">This permanently removes {removeTarget.name} and its compliance data, evidence, and stored files.</p>
            {removeError && <p className="tenant-settings-modal-error" role="alert">{removeError}</p>}
            <div className="tenant-settings-modal-actions">
              <button className="tenant-settings-modal-cancel" type="button" disabled={isRemoving} onClick={() => setRemoveTarget(null)}>Keep tenant</button>
              <button className="tenant-settings-modal-danger" type="button" disabled={isRemoving} onClick={confirmRemove}>
                {isRemoving ? 'Removing...' : 'Remove tenant'}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}