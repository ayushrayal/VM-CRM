import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getCreatives,
  getCreativeLeaderboard,
  getCreativeStats,
  createCreative,
  updateCreative,
  deleteCreative
} from '../../api/creative.api';
import { CREATIVE_STATUSES } from '../../constants/creative.constants';
import { CreativeCard } from '../../components/creativeGamiply/CreativeCard';
import { CreativeDetailModal } from '../../components/creativeGamiply/CreativeDetailModal';
import { CreativeFormModal } from '../../components/creativeGamiply/CreativeFormModal';
import { CreativeLeaderboardTable } from '../../components/creativeGamiply/CreativeLeaderboardTable';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Modal } from '../../components/common/Modal';
import './CreativeGamiplyPage.scss';

export const CreativeGamiplyPage = () => {
  const { user } = useAuth();

  // Primary Views: 'creatives' | 'leaderboard'
  const [activeTab, setActiveTab] = useState('creatives');

  // Creatives List State
  const [creatives, setCreatives] = useState([]);
  const [loadingCreatives, setLoadingCreatives] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [mineOnly, setMineOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Leaderboard State
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardPeriod, setLeaderboardPeriod] = useState('all_time');
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  // User & Global Stats
  const [stats, setStats] = useState(null);

  // Modals State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formInitialData, setFormInitialData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedCreative, setSelectedCreative] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // General Notification / Error
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (message, type = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fetch Creatives
  const fetchCreatives = useCallback(async () => {
    try {
      setLoadingCreatives(true);
      const params = {};
      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }
      if (mineOnly && user?._id) {
        params.creatorId = user._id;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const res = await getCreatives(params);
      setCreatives(res.data?.data || res.data || []);
    } catch (err) {
      showToast(err.message || 'Failed to load creatives', 'error');
    } finally {
      setLoadingCreatives(false);
    }
  }, [statusFilter, mineOnly, searchQuery, user?._id]);

  // Fetch Leaderboard
  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoadingLeaderboard(true);
      const res = await getCreativeLeaderboard(leaderboardPeriod);
      setLeaderboard(res.data?.data || res.data || []);
    } catch (err) {
      showToast(err.message || 'Failed to load leaderboard', 'error');
    } finally {
      setLoadingLeaderboard(false);
    }
  }, [leaderboardPeriod]);

  // Fetch Stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await getCreativeStats();
      setStats(res.data?.data || res.data || null);
    } catch {
      // Quiet fail for stats bar
    }
  }, []);

  // Initial Load
  useEffect(() => {
    fetchCreatives();
    fetchStats();
  }, [fetchCreatives, fetchStats]);

  // When switching to leaderboard or period changes
  useEffect(() => {
    if (activeTab === 'leaderboard') {
      fetchLeaderboard();
    }
  }, [activeTab, fetchLeaderboard]);

  // Handle Form Submit (Create / Edit)
  const handleFormSubmit = async (payload) => {
    try {
      setIsSubmitting(true);
      if (formInitialData?._id) {
        await updateCreative(formInitialData._id, payload);
        showToast('Creative updated successfully!');
      } else {
        await createCreative(payload);
        showToast('Creative created successfully! Points calculated.');
      }
      setIsFormOpen(false);
      setFormInitialData(null);
      fetchCreatives();
      fetchStats();
      if (activeTab === 'leaderboard') fetchLeaderboard();
    } catch (err) {
      const fieldErrors = (err.errors || []).map((e) => e.message || `${e.field} is invalid`).join(', ');
      const msg = fieldErrors ? `Validation failed: ${fieldErrors}` : (err.message || 'Failed to save creative');
      showToast(msg, 'error');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      await deleteCreative(deleteTarget._id);
      showToast('Creative deleted successfully.');
      setDeleteTarget(null);
      fetchCreatives();
      fetchStats();
      if (activeTab === 'leaderboard') fetchLeaderboard();
    } catch (err) {
      showToast(err.message || 'Failed to delete creative', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenEdit = (creative) => {
    setFormInitialData(creative);
    setIsFormOpen(true);
  };

  const handleOpenDetail = (creative) => {
    setSelectedCreative(creative);
    setIsDetailOpen(true);
  };

  const filterTabs = [
    { id: 'ALL', label: 'All Creatives' },
    { id: CREATIVE_STATUSES.WINNER, label: '🏆 Winners' },
    { id: CREATIVE_STATUSES.LIVE, label: 'Live' },
    { id: CREATIVE_STATUSES.TESTING, label: 'Testing' },
    { id: CREATIVE_STATUSES.READY, label: 'Ready' },
    { id: CREATIVE_STATUSES.IN_PRODUCTION, label: 'In Production' },
    { id: CREATIVE_STATUSES.IDEA, label: 'Idea' },
    { id: CREATIVE_STATUSES.AVERAGE, label: 'Average' },
    { id: CREATIVE_STATUSES.LOSER, label: 'Loser' },
    { id: CREATIVE_STATUSES.PAUSED, label: 'Paused' }
  ];

  return (
    <div className="creative-gamiply-page">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`creative-toast-banner ${toastMessage.type}`}>
          {toastMessage.message}
        </div>
      )}

      {/* Header Banner */}
      <div className="gamiply-header">
        <div className="header-left">
          <div className="title-row">
            <span className="section-badge">CREATIVE PERFORMANCE</span>
            <h1 className="page-title">Creative Performance</h1>
          </div>
          <p className="page-subtitle">
            Internal creative performance gamification arena. Submit your ad performance, accumulate ROAS & purchase points, and compete on the leaderboard.
          </p>
        </div>

        <div className="header-actions">
          <Button
            variant="primary"
            size="lg"
            onClick={() => {
              setFormInitialData(null);
              setIsFormOpen(true);
            }}
          >
            + Add Creative
          </Button>
        </div>
      </div>

      {/* Personal & Global Stats Bar (No badges) */}
      {stats && (
        <div className="gamiply-stats-grid">
          {/* User Rank */}
          <div className="stat-card highlight">
            <div className="stat-icon">🏆</div>
            <div className="stat-content">
              <span className="stat-label">My Creative Rank</span>
              <div className="stat-value-group">
                <span className="stat-main-val">#{stats.user?.rank || 1}</span>
                <span className="stat-sub-val">
                  (+{(stats.user?.totalPoints || 0).toLocaleString()} pts)
                </span>
              </div>
            </div>
          </div>

          {/* User Creatives */}
          <div className="stat-card">
            <div className="stat-icon">🎨</div>
            <div className="stat-content">
              <span className="stat-label">My Creatives</span>
              <div className="stat-value-group">
                <span className="stat-main-val">{stats.user?.creatives || 0}</span>
                <span className="stat-sub-val">
                  ({stats.user?.winners || 0} Winners)
                </span>
              </div>
            </div>
          </div>

          {/* User Average Score */}
          <div className="stat-card">
            <div className="stat-icon">⚡</div>
            <div className="stat-content">
              <span className="stat-label">Average Score</span>
              <div className="stat-value-group">
                <span className="stat-main-val">{stats.user?.averageScore || 0}</span>
                <span className="stat-sub-val">pts / entry</span>
              </div>
            </div>
          </div>

          {/* Global Milestone */}
          <div className="stat-card global-card">
            <div className="stat-icon">🌐</div>
            <div className="stat-content">
              <span className="stat-label">Team Total Impact</span>
              <div className="stat-value-group">
                <span className="stat-main-val">
                  {(stats.global?.totalPointsAwarded || 0).toLocaleString()} pts
                </span>
                <span className="stat-sub-val">
                  across {stats.global?.totalCreatives || 0} creatives
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Navigation Tabs: Creatives vs Leaderboard */}
      <div className="creative-main-nav">
        <button
          className={`nav-tab-btn ${activeTab === 'creatives' ? 'active' : ''}`}
          onClick={() => setActiveTab('creatives')}
        >
          🎨 Creatives ({creatives.length})
        </button>
        <button
          className={`nav-tab-btn ${activeTab === 'leaderboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('leaderboard')}
        >
          🏆 Leaderboard
        </button>
      </div>

      {/* VIEW 1: CREATIVES */}
      {activeTab === 'creatives' && (
        <div className="creatives-view-container">
          {/* Controls Bar: Filters & Search */}
          <div className="creatives-controls-bar">
            {/* Status Tabs */}
            <div className="status-filters">
              <button
                className={`filter-pill ${mineOnly ? 'active-mine' : ''}`}
                onClick={() => setMineOnly(!mineOnly)}
              >
                👤 Mine Only
              </button>

              <div className="filters-divider" />

              {filterTabs.map((tab) => (
                <button
                  key={tab.id}
                  className={`filter-pill ${statusFilter === tab.id ? 'active' : ''}`}
                  onClick={() => setStatusFilter(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="search-box">
              <input
                type="text"
                placeholder="Search ad name, client, creator..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
                  &times;
                </button>
              )}
            </div>
          </div>

          {/* Creatives Grid */}
          {loadingCreatives ? (
            <div className="creative-loading-state">
              <LoadingSpinner size="lg" />
              <span>Loading creative entries...</span>
            </div>
          ) : creatives.length > 0 ? (
            <div className="creatives-grid">
              {creatives.map((c) => (
                <CreativeCard
                  key={c._id}
                  creative={c}
                  currentUser={user}
                  onView={handleOpenDetail}
                  onEdit={handleOpenEdit}
                  onDelete={(target) => setDeleteTarget(target)}
                />
              ))}
            </div>
          ) : (
            <div className="creative-empty-state">
              <span className="empty-icon">🎨</span>
              <h3>No creative performance entries found</h3>
              <p>
                {mineOnly
                  ? "You haven't submitted any creative performance entries yet. Click '+ Add Creative' to get started!"
                  : statusFilter !== 'ALL'
                  ? `No creatives currently in status '${statusFilter}'.`
                  : 'No creatives submitted yet. Be the first to add your creative performance!'}
              </p>
              <Button
                variant="primary"
                onClick={() => {
                  setFormInitialData(null);
                  setIsFormOpen(true);
                }}
              >
                + Add First Creative
              </Button>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: LEADERBOARD */}
      {activeTab === 'leaderboard' && (
        <div className="leaderboard-view-container">
          {loadingLeaderboard ? (
            <div className="creative-loading-state">
              <LoadingSpinner size="lg" />
              <span>Calculating creative rankings...</span>
            </div>
          ) : (
            <CreativeLeaderboardTable
              leaderboard={leaderboard}
              period={leaderboardPeriod}
              onPeriodChange={(newPeriod) => setLeaderboardPeriod(newPeriod)}
              currentUserId={user?._id}
            />
          )}
        </div>
      )}

      {/* Create / Edit Creative Modal */}
      <CreativeFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setFormInitialData(null);
        }}
        onSubmit={handleFormSubmit}
        initialData={formInitialData}
        isSubmitting={isSubmitting}
      />

      {/* Detail Modal */}
      <CreativeDetailModal
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedCreative(null);
        }}
        creative={selectedCreative}
        onEdit={(c) => {
          setIsDetailOpen(false);
          handleOpenEdit(c);
        }}
        canEdit={
          user?.role === 'admin' ||
          (selectedCreative?.creatorId?._id
            ? user?._id === selectedCreative.creatorId._id
            : user?._id === selectedCreative?.creatorId)
        }
      />

      {/* Admin Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Confirm Delete Creative"
      >
        <div className="delete-confirm-box">
          <p>
            Are you sure you want to permanently delete creative:{' '}
            <strong>"{deleteTarget?.adName}"</strong> ({deleteTarget?.clientName})?
          </p>
          <p className="delete-warning">
            ⚠️ This will remove the creative record and deduct {deleteTarget?.score?.totalPoints || 0} score points from the creator.
          </p>

          <div className="delete-actions">
            <Button
              variant="ghost"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Permanently Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
