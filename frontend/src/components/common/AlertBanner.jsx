import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import './AlertBanner.scss';

export const AlertBanner = ({ type = 'success', message, onClose, className = '' }) => {
  if (!message) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={16} />;
      case 'error':
      case 'danger':
        return <AlertCircle size={16} />;
      case 'warning':
        return <AlertTriangle size={16} />;
      case 'info':
      default:
        return <Info size={16} />;
    }
  };

  return (
    <div className={`alert-banner alert-${type} ${className}`}>
      <span className="alert-icon">{getIcon()}</span>
      <span className="alert-message">{message}</span>
      {onClose && (
        <button className="alert-close" onClick={onClose} aria-label="Dismiss message">
          <X size={14} />
        </button>
      )}
    </div>
  );
};
