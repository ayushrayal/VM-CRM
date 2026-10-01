import React from 'react';
import { CREATIVE_STATUS_CONFIG } from '../../constants/creative.constants';
import { Button } from '../common/Button';
import './CreativeCard.scss';

export const CreativeCard = ({
  creative,
  currentUser,
  onView,
  onEdit,
  onDelete
}) => {
  const isOwner =
    currentUser?._id && creative.creatorId?._id
      ? currentUser._id === creative.creatorId._id
      : currentUser?._id === creative.creatorId;

  const isAdmin = currentUser?.role === 'admin';
  const canEdit = isOwner || isAdmin;
  const canDelete = isAdmin;

  const statusConfig = CREATIVE_STATUS_CONFIG[creative.status] || {
    label: creative.status,
    color: '#4B5563',
    bg: '#F3F4F6',
    border: '#E5E7EB'
  };

  const totalPoints = creative.score?.totalPoints ?? 0;
  const roas = creative.roas ?? 0;
  const purchases = creative.purchases ?? 0;

  return (
    <div className="creative-card">
      {/* Top Client and Status */}
      <div className="card-top-row">
        <span className="client-pill">{creative.clientName}</span>
        <span
          className="status-pill"
          style={{
            color: statusConfig.color,
            backgroundColor: statusConfig.bg,
            borderColor: statusConfig.border
          }}
        >
          <span className="status-dot" style={{ backgroundColor: statusConfig.color }} />
          {statusConfig.label}
        </span>
      </div>

      {/* Ad Name */}
      <h3
        className="ad-name-title"
        onClick={() => onView(creative)}
        title="View creative details"
      >
        {creative.adName}
      </h3>

      {/* Performance Metrics: ROAS, Purchases, Points */}
      <div className="card-metrics-grid">
        <div className="metric-box">
          <span className="metric-label">ROAS</span>
          <span className="metric-value">{roas}x</span>
        </div>
        <div className="metric-box">
          <span className="metric-label">Purchases</span>
          <span className="metric-value">{purchases.toLocaleString()}</span>
        </div>
        <div className={`points-pill ${totalPoints > 0 ? 'positive' : 'zero'}`}>
          <span className="points-label">Total Score</span>
          <span className="points-text">
            {totalPoints > 0 ? `+${totalPoints} pts` : '0 pts'}
          </span>
        </div>
      </div>

      {/* Footer Creator Details & Actions */}
      <div className="card-footer">
        <div className="creator-info">
          <div className="creator-avatar">
            {(creative.creatorName || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="creator-details">
            <span className="creator-name">{creative.creatorName}</span>
            <span className="creator-role">Creator</span>
          </div>
        </div>

        <div className="card-actions">
          <Button variant="ghost" size="sm" onClick={() => onView(creative)}>
            View
          </Button>

          {canEdit && (
            <Button variant="ghost" size="sm" onClick={() => onEdit(creative)}>
              Edit
            </Button>
          )}

          {canDelete && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => onDelete(creative)}
              title="Delete creative (Admin only)"
            >
              Delete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
