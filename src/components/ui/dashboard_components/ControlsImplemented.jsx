
import { useState } from 'react';
import './styles/ControlsImplemented.css';

const ControlsImplemented = ({
  heading = "Control Fully Implemented & Verified",
  canReset = false,
  onReset,
}) => {
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState('');

  const handleReset = async () => {
    if (!onReset || resetting) return;
    setResetting(true);
    setError('');
    try {
      const result = await onReset();
      if (!result?.success) {
        setError(result?.error || 'Unable to reset these controls.');
        return;
      }
      setResetOpen(false);
    } catch {
      setError('Unable to reset these controls. Please try again.');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="controls-wrapper">
      <div className="controls-cont">
        <div className="controls-status-row">
          <h4 className="controls-heading">{heading}</h4>
          {canReset && (
            <div className="controls-reset-actions">
              <button
                className="controls-reset-trigger"
                type="button"
                aria-label="Reset implemented controls"
                aria-expanded={resetOpen}
                onClick={() => {
                  setError('');
                  setResetOpen((open) => !open);
                }}
              >
                <svg viewBox="0 -960 960 960" aria-hidden="true">
                  <path d="M504-480 320-664l56-56 240 240-240 240-56-56 184-184Z" />
                </svg>
              </button>
              {resetOpen && (
                <div className="controls-reset-popover" role="dialog" aria-label="Reset implemented controls">
                  <p>Return this strategy&apos;s controls to unsatisfied. Evidence and notes will remain.</p>
                  {error && <p className="controls-reset-error" role="alert">{error}</p>}
                  <div className="controls-reset-popover-actions">
                    <button type="button" className="controls-reset-cancel" onClick={() => setResetOpen(false)} disabled={resetting}>
                      Cancel
                    </button>
                    <button type="button" className="controls-reset-confirm" onClick={handleReset} disabled={resetting}>
                      {resetting ? 'Resetting...' : 'Reset controls'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ControlsImplemented;