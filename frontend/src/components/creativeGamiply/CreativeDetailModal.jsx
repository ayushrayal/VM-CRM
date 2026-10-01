import React from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { CREATIVE_STATUS_CONFIG } from '../../constants/creative.constants';
import './CreativeDetailModal.scss';

export const CreativeDetailModal = ({
  isOpen,
  onClose,
  creative,
  onEdit,
  canEdit
}) => {
  if (!creative) return null;

  const statusConfig = CREATIVE_STATUS_CONFIG[creative.status] || {
    label: creative.status,
    color: '#4B5563',
    bg: '#F3F4F6',
    border: '#E5E7EB'
  };

  const roas = creative.roas ?? 0;
  const purchases = creative.purchases ?? 0;
  const roasPoints = creative.score?.roasPoints ?? 0;
  const purchasePoints = creative.score?.purchasePoints ?? 0;
  const totalPoints = creative.score?.totalPoints ?? 0;

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Creative Performance Details"
      size="md"
      className="creative-detail-modal"
    >
      <div className="creative-detail-content">
        {/* Top Header: Client & Status */}
        <div className="detail-top-row">
          <div className="client-badge">{creative.clientName}</div>
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
        <div className="detail-ad-box">
          <label className="section-label">Ad Name</label>
          <h2 className="ad-name-heading">{creative.adName}</h2>
        </div>

        {/* Creator Info */}
        <div className="detail-creator-row">
          <div className="creator-avatar">
            {(creative.creatorName || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="creator-text">
            <span className="creator-name">{creative.creatorName}</span>
            <span className="created-at">Submitted on {formatDate(creative.createdAt)}</span>
          </div>
        </div>

        {/* Raw Performance Metrics */}
        <div className="detail-section">
          <h4 className="section-title">Performance Metrics</h4>
          <div className="metrics-grid">
            <div className="metric-card">
              <span className="metric-name">ROAS</span>
              <span className="metric-val">{roas}x</span>
              <span className="metric-sub">Return on Ad Spend</span>
            </div>
            <div className="metric-card">
              <span className="metric-name">Purchases</span>
              <span className="metric-val">{purchases.toLocaleString()}</span>
              <span className="metric-sub">Confirmed Orders</span>
            </div>
          </div>
        </div>

        {/* Official Server Score Breakdown */}
        <div className="detail-section">
          <h4 className="section-title">Official Score Breakdown</h4>
          <div className="score-breakdown-card">
            <div className="breakdown-row">
              <div className="breakdown-label-group">
                <span className="breakdown-name">ROAS Points</span>
                <span className="breakdown-math">{roas} × 10</span>
              </div>
              <span className="breakdown-points">+{roasPoints} pts</span>
            </div>

            <div className="breakdown-divider" />

            <div className="breakdown-row">
              <div className="breakdown-label-group">
                <span className="breakdown-name">Purchase Points</span>
                <span className="breakdown-math">{purchases} × 10</span>
              </div>
              <span className="breakdown-points">+{purchasePoints} pts</span>
            </div>

            <div className="breakdown-divider total-divider" />

            <div className="breakdown-row total-row">
              <div className="breakdown-label-group">
                <span className="breakdown-name total-name">Total Creative Score</span>
                <span className="breakdown-math">Combined Leaderboard Points</span>
              </div>
              <span className="breakdown-points total-points">+{totalPoints} pts</span>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="detail-footer-actions">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          {canEdit && (
            <Button
              variant="primary"
              onClick={() => {
                onClose();
                onEdit(creative);
              }}
            >
              Edit Creative
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
