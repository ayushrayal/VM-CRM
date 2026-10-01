import React from 'react';
import { CRO_STATUS_CONFIG } from '../../constants/cro.constants';
import { Button } from '../common/Button';
import './ExperimentCard.scss';

export const ExperimentCard = ({
  experiment,
  currentUser,
  onView,
  onEdit,
  onDelete
}) => {
  const isOwner =
    currentUser?._id && experiment.creatorId?._id
      ? currentUser._id === experiment.creatorId._id
      : currentUser?._id === experiment.creatorId;

  const isAdmin = currentUser?.role === 'admin';
  const canEdit = isOwner || isAdmin;
  const canDelete = isAdmin;

  const statusConfig = CRO_STATUS_CONFIG[experiment.status] || {
    label: experiment.status,
    color: '#4B5563',
    bg: '#F3F4F6',
    border: '#E5E7EB'
  };

  const totalPoints = experiment.score?.totalPoints || 0;
  const beforeCount = experiment.beforeImages?.length || 0;
  const afterCount = experiment.afterImages?.length || 0;

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="cro-experiment-card">
      {/* Top Client and Status */}
      <div className="card-top-row">
        <span className="client-pill">{experiment.clientName}</span>
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

      {/* Hypothesis Title */}
      <h3 className="hypothesis-title" onClick={() => onView(experiment)} title="View experiment details">
        {experiment.hypothesisTitle}
      </h3>

      {/* Hypothesis Snippet */}
      <p className="hypothesis-snippet">
        {experiment.hypothesis?.length > 130
          ? `${experiment.hypothesis.substring(0, 130)}...`
          : experiment.hypothesis}
      </p>

      {/* Media Screenshot Indicators & Prominent Points Pill */}
      <div className="card-metrics-row">
        <div className="card-screenshots-info">
          <span className={`media-chip ${beforeCount > 0 ? 'has-media' : ''}`}>
            📸 Before: {beforeCount}
          </span>
          <span className={`media-chip ${afterCount > 0 ? 'has-media' : ''}`}>
            ✨ After: {afterCount}
          </span>
        </div>

        <div className={`points-pill ${totalPoints > 0 ? 'positive' : 'zero'}`}>
          <span className="points-text">
            {totalPoints > 0 ? `+${totalPoints} pts` : '0 pts'}
          </span>
        </div>
      </div>

      {/* Footer Creator Details & Actions */}
      <div className="card-footer">
        <div className="creator-info">
          <div className="creator-avatar">
            {(experiment.creatorName || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="creator-details">
            <span className="creator-name">{experiment.creatorName}</span>
            <span className="dates-range">
              {formatDate(experiment.startDate)}
              {experiment.endDate ? ` → ${formatDate(experiment.endDate)}` : ''}
            </span>
          </div>
        </div>

        <div className="card-actions">
          <Button variant="ghost" size="sm" onClick={() => onView(experiment)}>
            View
          </Button>

          {canEdit && (
            <Button variant="ghost" size="sm" onClick={() => onEdit(experiment)}>
              Edit
            </Button>
          )}

          {canDelete && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => onDelete(experiment)}
              title="Delete experiment (Admin only)"
            >
              Delete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
