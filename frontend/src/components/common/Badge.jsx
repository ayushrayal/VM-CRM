import React from 'react';
import './Badge.scss';

export const Badge = ({
  children,
  variant = 'pending',
  withDot = false,
  className = ''
}) => {
  // variants: 'active', 'pending', 'rejected', 'admin', 'team', 'warning', 'info', 'success', 'danger'
  return (
    <span className={`badge badge-${variant} ${className}`}>
      {withDot && <span className="badge-dot" />}
      {children}
    </span>
  );
};
