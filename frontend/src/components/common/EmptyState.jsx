import React from 'react';
import { Inbox } from 'lucide-react';
import './EmptyState.scss';

export const EmptyState = ({
  icon = null,
  title = 'No data found',
  description = '',
  action = null
}) => {
  return (
    <div className="empty-state-card">
      <div className="empty-state-icon-wrap">
        {icon || <Inbox size={28} strokeWidth={1.5} />}
      </div>
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-description">{description}</p>}
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
};
