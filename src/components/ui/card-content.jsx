
import { useState } from 'react'
import './ui_styles/card-content.css'

export function CardContent({
    label,
    type = "text",
    placeholder,
    value,
    onChange,
    name,
    autoComplete,
    required = false,
    disabled = false
}) {
    const inputId = `input-${name}`
    const [passwordVisible, setPasswordVisible] = useState(false)
    const inputType = type === 'password' && passwordVisible ? 'text' : type

    return(
        <div className='card-content'>
            <label className='subhead' htmlFor={inputId}>
                {label}
                {required && <span className="required-indicator" aria-hidden="true"> *</span>}
                {required && <span className="required-accessible-text"> (required)</span>}
            </label>
            <div className={`card-content-input-wrap${type === 'password' ? ' is-password' : ''}`}>
                <input
                    type={inputType}
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    name={name}
                    id={inputId}
                    autoComplete={autoComplete}
                    required={required}
                    disabled={disabled}
                />
                {type === 'password' && (
                    <button
                        className='card-content-password-toggle'
                        type='button'
                        aria-label={`${passwordVisible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
                        aria-controls={inputId}
                        aria-pressed={passwordVisible}
                        onClick={() => setPasswordVisible((visible) => !visible)}
                    >
                        {passwordVisible ? (
                            <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
                                <path d='M3 3l18 18' />
                                <path d='M10.6 10.6a2 2 0 0 0 2.8 2.8' />
                                <path d='M9.9 5.2A10.8 10.8 0 0 1 12 5c5.4 0 9 7 9 7a15.7 15.7 0 0 1-3.1 3.8' />
                                <path d='M6.2 6.2C3.9 7.8 3 12 3 12s3.6 7 9 7a10.7 10.7 0 0 0 4-.8' />
                            </svg>
                        ) : (
                            <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
                                <path d='M3 12s3.6-7 9-7 9 7 9 7-3.6 7-9 7-9-7-9-7Z' />
                                <circle cx='12' cy='12' r='3' />
                            </svg>
                        )}
                    </button>
                )}
            </div>
        </div>
    )
}