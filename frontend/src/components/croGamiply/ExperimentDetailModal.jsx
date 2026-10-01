import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { CRO_STATUS_CONFIG, CRO_BADGES } from '../../constants/cro.constants';
import { resolveImageUrl } from '../../utils/imageUrl';
import './ExperimentDetailModal.scss';

export const ExperimentDetailModal = ({
  isOpen,
  onClose,
  experiment,
  onEdit,
  canEdit
}) => {
  // 1. All hooks declared at top level unconditionally
  const [lightboxIndex, setLightboxIndex] = useState(null);

  const beforeImages = experiment?.beforeImages || [];
  const afterImages = experiment?.afterImages || [];

  // Flatten images for cohesive lightbox navigation
  const allGalleryImages = [
    ...beforeImages.map((img, i) => ({
      ...img,
      type: 'Before',
      indexLabel: `Before ${i + 1}/${beforeImages.length}`
    })),
    ...afterImages.map((img, i) => ({
      ...img,
      type: 'After',
      indexLabel: `After ${i + 1}/${afterImages.length}`
    }))
  ];

  // Lightbox keyboard controls
  const handleKeyDown = useCallback(
    (e) => {
      if (lightboxIndex === null) return;
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowLeft') {
        setLightboxIndex((prev) =>
          prev > 0 ? prev - 1 : allGalleryImages.length > 0 ? allGalleryImages.length - 1 : 0
        );
      }
      if (e.key === 'ArrowRight') {
        setLightboxIndex((prev) =>
          prev < allGalleryImages.length - 1 ? prev + 1 : 0
        );
      }
    },
    [lightboxIndex, allGalleryImages.length]
  );

  useEffect(() => {
    if (lightboxIndex !== null) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [lightboxIndex, handleKeyDown]);

  // Reset lightbox whenever modal closes or experiment changes
  useEffect(() => {
    if (!isOpen) {
      setLightboxIndex(null);
    }
  }, [isOpen, experiment]);

  // 2. Conditional check AFTER all hooks have executed
  if (!isOpen || !experiment) return null;

  const statusConfig = CRO_STATUS_CONFIG[experiment.status] || {
    label: experiment.status,
    color: '#4B5563',
    bg: '#F3F4F6',
    border: '#E5E7EB'
  };

  const score = experiment.score || {};
  const results = experiment.results || {};
  const improvements = experiment.improvements || {};
  const badges = experiment.badges || [];

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

  const formatCurrency = (val) => {
    if (val === null || val === undefined) return '—';
    return `₹${Number(val).toLocaleString('en-IN')}`;
  };

  const formatPercent = (val) => {
    if (val === null || val === undefined) return '—';
    return `${val}%`;
  };

  const openLightboxForImage = (type, index) => {
    const targetIdx =
      type === 'before' ? index : beforeImages.length + index;
    setLightboxIndex(targetIdx);
  };

  const activeLightboxImage =
    lightboxIndex !== null ? allGalleryImages[lightboxIndex] : null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="CRO Experiment Details"
        size="xl"
        className="cro-detail-modal"
      >
        <div className="cro-detail-modal-wrapper">
          <div className="cro-detail-scrollable-body">
            {/* 1. Experiment Summary */}
            <div className="detail-section summary-section">
              <div className="detail-meta-header">
                <div className="meta-left">
                  <span className="client-tag">{experiment.clientName}</span>
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

                <div className="meta-right">
                  <span className="creator-credit">
                    Created by <strong>{experiment.creatorName}</strong> on{' '}
                    {formatDate(experiment.createdAt)}
                  </span>
                </div>
              </div>

              <h2 className="detail-hypothesis-title">{experiment.hypothesisTitle}</h2>
            </div>

            {/* 2. Timeline */}
            <div className="detail-section timeline-section">
              <h4 className="section-title">Timeline</h4>
              <div className="detail-dates-bar">
                <div className="date-item">
                  <span className="label">Start Date:</span>
                  <span className="value">{formatDate(experiment.startDate)}</span>
                </div>
                <div className="date-divider">→</div>
                <div className="date-item">
                  <span className="label">End Date:</span>
                  <span className="value">{formatDate(experiment.endDate)}</span>
                </div>
                {experiment.completedAt && (
                  <>
                    <div className="date-divider">•</div>
                    <div className="date-item">
                      <span className="label">Completed At:</span>
                      <span className="value">{formatDate(experiment.completedAt)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 3. Hypothesis */}
            <div className="detail-section">
              <h4 className="section-title">Hypothesis</h4>
              <div className="hypothesis-box">
                <p>{experiment.hypothesis}</p>
              </div>
            </div>

            {/* 4. Visual Evidence (Before vs After Gallery) */}
            <div className="detail-section">
              <div className="gallery-header-row">
                <h4 className="section-title">Visual Evidence</h4>
                <span className="gallery-hint">Click any screenshot to expand fullscreen</span>
              </div>

              <div className="gallery-comparison-grid">
                {/* Before Column */}
                <div className="gallery-column">
                  <div className="column-header before">
                    <span className="col-icon">📸</span>
                    <span className="col-title">Before Screenshots ({beforeImages.length})</span>
                  </div>

                  {beforeImages.length > 0 ? (
                    <div className="thumbnails-grid">
                      {beforeImages.map((img, idx) => (
                        <div
                          key={`before-thumb-${idx}`}
                          className="thumbnail-card"
                          onClick={() => openLightboxForImage('before', idx)}
                          title="Click to view fullscreen"
                        >
                          <div className="thumb-img-box">
                            <img
                              src={resolveImageUrl(img.url)}
                              alt={img.name || `Before screenshot ${idx + 1}`}
                              loading="lazy"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.parentNode.classList.add('broken-img');
                              }}
                            />
                            <span className="type-badge before">Before</span>
                          </div>
                          <span className="thumbnail-caption">
                            {img.name || `Screenshot #${idx + 1}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="gallery-empty">No before screenshots attached.</div>
                  )}
                </div>

                {/* After Column */}
                <div className="gallery-column">
                  <div className="column-header after">
                    <span className="col-icon">✨</span>
                    <span className="col-title">After Screenshots ({afterImages.length})</span>
                  </div>

                  {afterImages.length > 0 ? (
                    <div className="thumbnails-grid">
                      {afterImages.map((img, idx) => (
                        <div
                          key={`after-thumb-${idx}`}
                          className="thumbnail-card"
                          onClick={() => openLightboxForImage('after', idx)}
                          title="Click to view fullscreen"
                        >
                          <div className="thumb-img-box">
                            <img
                              src={resolveImageUrl(img.url)}
                              alt={img.name || `After screenshot ${idx + 1}`}
                              loading="lazy"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.parentNode.classList.add('broken-img');
                              }}
                            />
                            <span className="type-badge after">After</span>
                          </div>
                          <span className="thumbnail-caption">
                            {img.name || `Screenshot #${idx + 1}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="gallery-empty">No after screenshots attached.</div>
                  )}
                </div>
              </div>
            </div>

            {/* 5. Performance Results Table */}
            <div className="detail-section">
              <h4 className="section-title">Performance & Score Breakdown</h4>
              <div className="table-responsive-container">
                <table className="results-breakdown-table">
                  <thead>
                    <tr>
                      <th className="col-metric">Metric</th>
                      <th className="col-before">Before</th>
                      <th className="col-after">After</th>
                      <th className="col-improvement">Improvement</th>
                      <th className="col-points">Points Awarded</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* 1. Sales */}
                    <tr>
                      <td className="metric-name">
                        <span className="metric-icon">💰</span> Product Sales
                      </td>
                      <td className="num-val">{formatCurrency(results.salesBefore)}</td>
                      <td className="num-val">{formatCurrency(results.salesAfter)}</td>
                      <td>
                        {results.salesBefore != null && results.salesAfter != null ? (
                          <span
                            className={`improvement-pill ${
                              improvements.salesPercent > 0 ? 'positive' : ''
                            }`}
                          >
                            {improvements.salesPercent > 0
                              ? `+${improvements.salesPercent}%`
                              : `${improvements.salesPercent}%`}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="points-cell">
                        {score.salesPoints > 0 ? `+${score.salesPoints}` : '0'} pts
                      </td>
                    </tr>

                    {/* 2. Prepaid */}
                    <tr>
                      <td className="metric-name">
                        <span className="metric-icon">💳</span> Prepaid Orders %
                      </td>
                      <td className="num-val">{formatPercent(results.prepaidBefore)}</td>
                      <td className="num-val">{formatPercent(results.prepaidAfter)}</td>
                      <td>
                        {results.prepaidBefore != null && results.prepaidAfter != null ? (
                          <span
                            className={`improvement-pill ${
                              improvements.prepaidPercentagePoints > 0 ? 'positive' : ''
                            }`}
                          >
                            {improvements.prepaidPercentagePoints > 0
                              ? `+${improvements.prepaidPercentagePoints} pp`
                              : `${improvements.prepaidPercentagePoints} pp`}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="points-cell">
                        {score.prepaidPoints > 0 ? `+${score.prepaidPoints}` : '0'} pts
                      </td>
                    </tr>

                    {/* 3. Cancellation */}
                    <tr>
                      <td className="metric-name">
                        <span className="metric-icon">📉</span> Cancellation Rate
                      </td>
                      <td className="num-val">{formatPercent(results.cancellationBefore)}</td>
                      <td className="num-val">{formatPercent(results.cancellationAfter)}</td>
                      <td>
                        {results.cancellationBefore != null &&
                        results.cancellationAfter != null ? (
                          <span
                            className={`improvement-pill ${
                              score.cancellationPoints > 0 ? 'positive' : ''
                            }`}
                          >
                            {improvements.cancellationPercentagePoints > 0
                              ? `+${improvements.cancellationPercentagePoints} pp`
                              : `${improvements.cancellationPercentagePoints} pp`}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="points-cell">
                        {score.cancellationPoints > 0 ? `+${score.cancellationPoints}` : '0'} pts
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 6. Total Points Card */}
            <div className="total-score-card">
              <div className="score-content">
                <span className="score-subtitle">TOTAL POINTS AWARDED</span>
                <span className="score-headline">+{score.totalPoints || 0} Points</span>
              </div>
              <div className="score-badge-status">
                {score.totalPoints >= 500 ? (
                  <span className="performer-pill">🌟 500+ Top Performer</span>
                ) : (
                  <span className="standard-pill">CRO Verified</span>
                )}
              </div>
            </div>

            {/* 7. Badges */}
            {badges.length > 0 && (
              <div className="detail-section">
                <h4 className="section-title">Badges & Recognition</h4>
                <div className="badges-list">
                  {badges.map((bId) => {
                    const bDef = CRO_BADGES[bId] || { name: bId, icon: '🏅', desc: '' };
                    return (
                      <div key={bId} className="badge-card">
                        <span className="badge-icon">{bDef.icon}</span>
                        <div className="badge-text">
                          <span className="badge-name">{bDef.name}</span>
                          <span className="badge-desc">{bDef.desc}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Sticky Modal Footer Actions */}
          <div className="cro-detail-footer">
            {canEdit && (
              <Button
                variant="primary"
                onClick={() => {
                  onClose();
                  onEdit(experiment);
                }}
              >
                Edit Experiment
              </Button>
            )}
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Lightbox / Fullscreen Image Preview with Previous & Next Navigation */}
      {activeLightboxImage && (
        <div className="image-lightbox-overlay" onClick={() => setLightboxIndex(null)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <div className="lightbox-header">
              <div className="header-info">
                <span className={`tag-chip ${activeLightboxImage.type.toLowerCase()}`}>
                  {activeLightboxImage.type}
                </span>
                <span className="title-text">
                  {activeLightboxImage.name || 'Screenshot'}
                </span>
                <span className="counter-text">
                  ({lightboxIndex + 1} of {allGalleryImages.length})
                </span>
              </div>

              <button
                onClick={() => setLightboxIndex(null)}
                className="lightbox-close"
                aria-label="Close fullscreen"
              >
                &times;
              </button>
            </div>

            <div className="lightbox-image-stage">
              {allGalleryImages.length > 1 && (
                <button
                  className="nav-btn prev-btn"
                  onClick={() =>
                    setLightboxIndex((prev) =>
                      prev > 0 ? prev - 1 : allGalleryImages.length - 1
                    )
                  }
                  title="Previous image (Left Arrow)"
                >
                  &#8249;
                </button>
              )}

              <div className="stage-img-wrapper">
                <img
                  src={resolveImageUrl(activeLightboxImage.url)}
                  alt={activeLightboxImage.name || 'Full preview'}
                />
              </div>

              {allGalleryImages.length > 1 && (
                <button
                  className="nav-btn next-btn"
                  onClick={() =>
                    setLightboxIndex((prev) =>
                      prev < allGalleryImages.length - 1 ? prev + 1 : 0
                    )
                  }
                  title="Next image (Right Arrow)"
                >
                  &#8250;
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
