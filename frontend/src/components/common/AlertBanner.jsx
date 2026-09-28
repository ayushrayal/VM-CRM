import React from 'react';
import './AlertBanner.scss';

export const AlertBanner = ({ type = 'success', message, onClose, className = '' }) => {
  // type: 'success', 'error', 'warning', 'info'
  if (!message) return null;

  return (
    <div className={`alert-banner alert-${type} ${className}`}>
      <span className="alert-message">{message}</span>
      {onClose && (
        <button className="alert-close" onClick={onClose} aria-label="Dismiss message">
          &times;
        </button>
      )}
    </div>
  );
};
