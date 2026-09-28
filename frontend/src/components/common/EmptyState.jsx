import React from 'react';
import './EmptyState.scss';

export const EmptyState = ({ title = 'No data found', description = '' }) => {
  return (
    <div className="empty-state-card">
      <div className="empty-state-icon">✓</div>
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-description">{description}</p>}
    </div>
  );
};
