
import { useState } from 'react';

import { BtnMain } from '@/components/ui/buttons/btn-main';
import arrowDown from '@/assets/icons/keyboard_arrow_down.svg';
import arrowUp from '@/assets/icons/keyboard_arrow_up.svg';
import uploadFileIcon from '@/assets/icons/upload_file.svg';
import './StartFixDrawer.css';

export function StartFixDrawer({ control, onClose, onSubmitEvidence }) {
  const [file, setFile] = useState(null);
  const [expandedControlId, setExpandedControlId] = useState(null);
  const showControl = control && expandedControlId === control.id;

  if (!control) return null;

  const handleClose = () => {
    setExpandedControlId(null);
    onClose?.();
  };

  return (
    <div className="start-fix-drawer-overlay" onClick={handleClose}>
      <div className="start-fix-drawer" onClick={(event) => event.stopPropagation()}>
        
        {/* Top Header Section */}
        <div className="strategy-name-write">
          <div className="control-code-wrapper">
            <span className="control-code">{control.control_code}</span>
            <span className="level-badge">LEVEL 1 REQ</span>
          </div>
          <div className="strategy-header-row">
            <h2 className="strategy-name">{control.strategy}</h2>
            <button className="close-btn" onClick={handleClose} aria-label="Close drawer">
              <svg 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
                >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Compliance State Section */}
        <div className="compliance-state-cont">
          <div className="compliance-state-wrapper">
            <div className="compliance-state-header">STRATEGY COMPLIANCE STATE</div>
            <div className="compliance-state">
              <span className="compliance-status-text">
                {control.status === 'unsatisfactory' ? 'Unsatisfactory / Non Compliant' : 'Non Compliant'}
              </span>
              <span className="evidence-flag">No Evidence</span>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <div className="upload-cont">
          <div className="control-disclosure">
            <button
              type="button"
              className="control-disclosure-toggle"
              aria-expanded={showControl}
              aria-controls="control-name-panel"
              onClick={() => setExpandedControlId(showControl ? null : control.id)}
            >
              <span>Show control</span>
              <img src={showControl ? arrowUp : arrowDown} alt="" aria-hidden="true" />
            </button>
            <div id="control-name-panel" className="control-name" hidden={!showControl}>
              {control.name}
            </div>
          </div>
          <div className="upload-heading">UPLOAD EVIDENCE FILE</div>
          <div className="upload-wrapper">
            <div className="upload-img">
              <div className="upload-icon-box">
                <img src={uploadFileIcon} alt="" aria-hidden="true" />
              </div>
              <div className="upload-text">Drag & drop exported report or screenshot here</div>
              <div className="upload-subtext">Supports exports from NinjaOne, Datto, M365 (Max 50MB)</div>
              {file && <div className="file-selected-name">Selected: {file.name}</div>}
              <input 
                type="file" 
                className="file-hidden-input" 
                onChange={(e) => setFile(e.target.files[0])} 
              />
            </div>
          </div>
        </div>

        {/* Action Button Footer */}
        <div className="drawer-actions">
          <BtnMain
            onClick={() => onSubmitEvidence?.(file)}
            disabled={!file}
          >
            Submit Evidence
          </BtnMain>
        </div>

      </div>
    </div>
  );
}