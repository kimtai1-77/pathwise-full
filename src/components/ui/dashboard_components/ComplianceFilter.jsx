
import { useState, useRef, useEffect } from 'react'
import './styles/ComplianceFilter.css'

export function ComplianceFilter({ selectedStatus, onStatusChange }) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  const statuses = [
    'All Statuses',
    'In Review',
    'Compliant',
    'Non-Compliant'
  ]

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="compliance-filter-cont" ref={dropdownRef}>
      <button 
        type="button" 
        className="filter-toggle-btn"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
      >
        <span>{selectedStatus || 'All Statuses'}</span>
        <span className="dropdown-chevron">▼</span>
      </button>

      {isOpen && (
        <div className="filter-dropdown-menu">
          {statuses.map((status) => {
            const isSelected = (selectedStatus || 'All Statuses') === status
            return (
              <button
                key={status}
                type="button"
                className={`filter-option-btn ${isSelected ? 'is-selected' : ''}`}
                onClick={() => {
                  onStatusChange(status)
                  setIsOpen(false)
                }}
              >
                <span className="check-icon">{isSelected ? '✓' : ''}</span>
                <span className="option-text">{status}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}