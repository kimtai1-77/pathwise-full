import { useState } from 'react';
import './EvidenceValidityDialog.css';

export function EvidenceValidityDialog({ title = 'Set evidence validity', saving = false, error = '', onSet, onSkip, onClose }) {
  const [periodDays, setPeriodDays] = useState('30');
  const parsedDays = Number.parseInt(periodDays, 10);
  const isValid = Number.isInteger(parsedDays) && parsedDays > 0 && String(parsedDays) === periodDays;

  return (
    <div className="evidence-validity-overlay">
      <form
        className="evidence-validity-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="evidence-validity-title"
        onSubmit={(event) => {
          event.preventDefault();
          if (isValid) onSet?.(parsedDays);
        }}
      >
        <button className="evidence-validity-close" type="button" onClick={onClose} disabled={saving} aria-label="Close dialog">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path strokeLinecap="round" d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>
        <h2 id="evidence-validity-title">{title}</h2>
        <label htmlFor="evidence-validity-days">Validity period</label>
        <div className="evidence-validity-input-wrap">
          <input
            id="evidence-validity-days"
            type="number"
            min="1"
            step="1"
            value={periodDays}
            onChange={(event) => setPeriodDays(event.target.value)}
            autoFocus
            required
          />
          <span>days</span>
        </div>
        <p>If you skip, 30 days is the default.</p>
        {error && <p className="evidence-validity-error" role="alert">{error}</p>}
        <div className="evidence-validity-actions">
          <button type="button" disabled={saving} onClick={() => onSkip?.(30)}>Skip</button>
          <button type="submit" disabled={saving || !isValid}>Set</button>
        </div>
      </form>
    </div>
  );
}