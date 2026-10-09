import React from 'react';
import './PageHeader.scss';

export const PageHeader = ({
  title,
  description,
  actions,
  badge,
  className = ''
}) => {
  return (
    <header className={`page-header-container ${className}`}>
      <div className="header-text-group">
        <div className="header-title-row">
          <h1 className="header-title">{title}</h1>
          {badge && <div className="header-badge">{badge}</div>}
        </div>
        {description && <p className="header-description">{description}</p>}
      </div>

      {actions && <div className="header-actions-group">{actions}</div>}
    </header>
  );
};
