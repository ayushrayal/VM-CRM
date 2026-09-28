import React from 'react';
import './Input.scss';

export const Input = ({
  label,
  error,
  helperText,
  id,
  type = 'text',
  className = '',
  required = false,
  ...props
}) => {
  const inputId = id || props.name;

  return (
    <div className={`input-group ${className}`}>
      {label && (
        <label htmlFor={inputId} className="input-label">
          {label} {required && <span className="required-asterisk">*</span>}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        className={`input-field ${error ? 'input-error' : ''}`}
        {...props}
      />
      {error && <span className="input-error-message">{error}</span>}
      {!error && helperText && <span className="input-helper-text">{helperText}</span>}
    </div>
  );
};
