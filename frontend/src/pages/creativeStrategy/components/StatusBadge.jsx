import React from 'react';
import './StatusBadge.scss';

export const StatusBadge = ({ status, type = 'workflow', record = null }) => {
  if (!status) return <span className="status-badge empty">—</span>;

  let label = status;
  let variant = 'default';

  // Check if creative is launched and within 72h observation
  if (type === 'workflow') {
    if (status === 'LAUNCHED' && record?.launchedAt) {
      const elapsedHours = (Date.now() - new Date(record.launchedAt).getTime()) / (1000 * 60 * 60);
      if (elapsedHours < 72) {
        return (
          <span className="status-badge status-amber" title={`72h Observation: ~${Math.ceil(72 - elapsedHours)}h remaining`}>
            WAITING 72H
          </span>
        );
      }
    }

    switch (status) {
      case 'PENDING_LAUNCH':
        label = 'PENDING';
        variant = 'warning';
        break;
      case 'LAUNCHED':
        label = 'LAUNCHED';
        variant = 'info';
        break;
      case 'REPORT_SUBMITTED':
        label = 'REPORT READY';
        variant = 'primary';
        break;
      case 'LEARNINGS_SUBMITTED':
        label = 'BRIEF PENDING';
        variant = 'secondary';
        break;
      case 'BRIEF_SUBMITTED':
        label = 'BRIEF SUBMITTED';
        variant = 'purple';
        break;
      case 'BRIEF_APPROVED':
        label = 'BRIEF APPROVED';
        variant = 'teal';
        break;
      case 'PRODUCTION':
        label = 'IN PRODUCTION';
        variant = 'amber';
        break;
      case 'INTERNAL_REVIEW':
        label = 'IN REVIEW';
        variant = 'orange';
        break;
      case 'CLIENT_REVIEW':
        label = 'FINAL APPROVAL';
        variant = 'blue';
        break;
      case 'CLIENT_APPROVED':
      case 'READY_TO_LAUNCH':
        label = 'READY TO LAUNCH';
        variant = 'yellow';
        break;
      case 'REVISION_REQUESTED':
        label = 'REVISION';
        variant = 'danger';
        break;
      case 'HANDOFF':
        label = 'READY TO LAUNCH';
        variant = 'yellow';
        break;
      case 'COMPLETED':
        label = 'COMPLETED';
        variant = 'success';
        break;
      case 'PAUSED':
        label = 'PAUSED';
        variant = 'muted';
        break;
      default:
        label = status.replace(/_/g, ' ');
        variant = 'default';
    }
  } else if (type === 'decision') {
    switch (status) {
      case 'PENDING':
        label = 'PENDING';
        variant = 'warning';
        break;
      case 'APPROVED':
        label = 'APPROVED';
        variant = 'success';
        break;
      case 'REJECTED':
        label = 'REJECTED';
        variant = 'danger';
        break;
      case 'REVISE':
      case 'REVISION_REQUESTED':
        label = 'REVISION';
        variant = 'danger';
        break;
      default:
        label = status;
        variant = 'default';
    }
  } else if (type === 'urgency') {
    switch (status) {
      case 'overdue':
        label = 'OVERDUE';
        variant = 'danger';
        break;
      case 'due-soon':
        label = 'DUE SOON';
        variant = 'warning';
        break;
      case 'upcoming':
        label = 'UPCOMING';
        variant = 'info';
        break;
      case 'completed':
        label = 'DONE';
        variant = 'success';
        break;
      default:
        return null;
    }
  }

  return <span className={`status-badge status-${variant}`}>{label}</span>;
};
