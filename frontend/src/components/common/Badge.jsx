import React from 'react';
import './Badge.scss';

export const Badge = ({ children, variant = 'pending', className = '' }) => {
  // variants: 'active', 'pending', 'rejected', 'admin', 'team'
  return (
    <span className={`badge badge-${variant} ${className}`}>
      <span className="badge-dot" />
      {children}
    </span>
  );
};
