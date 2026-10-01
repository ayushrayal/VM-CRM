import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getCroExperiments,
  getCroLeaderboard,
  getCroStats,
  createCroExperiment,
  updateCroExperiment,
  deleteCroExperiment
} from '../../api/cro.api';
import { CRO_STATUSES, CRO_BADGES } from '../../constants/cro.constants';
import { ExperimentCard } from '../../components/croGamiply/ExperimentCard';
import { ExperimentDetailModal } from '../../components/croGamiply/ExperimentDetailModal';
import { ExperimentFormModal } from '../../components/croGamiply/ExperimentFormModal';
import { LeaderboardTable } from '../../components/croGamiply/LeaderboardTable';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Modal } from '../../components/common/Modal';
import './CROGamiplyPage.scss';

export const CROGamiplyPage = () => {
  const { user } = useAuth();

  // Primary Views: 'experiments' | 'leaderboard'
  const [activeTab, setActiveTab] = useState('experiments');

  // Experiments List State
  const [experiments, setExperiments] = useState([]);
  const [loadingExperiments, setLoadingExperiments] = useState(true);
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

  const [selectedExperiment, setSelectedExperiment] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // General Notification / Error
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (message, type = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fetch Experiments
  const fetchExperiments = useCallback(async () => {
    try {
      setLoadingExperiments(true);
      const params = {};
      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }
      if (mineOnly) {
        params.mine = 'true';
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const res = await getCroExperiments(params);
      setExperiments(res.data?.data || res.data || []);
    } catch (err) {
      showToast(err.message || 'Failed to load experiments', 'error');
    } finally {
      setLoadingExperiments(false);
    }
  }, [statusFilter, mineOnly, searchQuery]);

  // Fetch Leaderboard
  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoadingLeaderboard(true);
      const res = await getCroLeaderboard(leaderboardPeriod);
      setLeaderboard(res.data?.data || res.data || []);
    } catch (err) {
      showToast(err.message || 'Failed to load leaderboard', 'error');
    } finally {
      setLoadingLeaderboard(false);
    }
  }, [leaderboardPeriod]);

  // Fetch User & Global Stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await getCroStats();
      setStats(res.data?.data || res.data || null);
    } catch (err) {
      // Quiet fail for stats banner
    }
  }, []);

  // Initial Load
  useEffect(() => {
    fetchExperiments();
    fetchStats();
  }, [fetchExperiments, fetchStats]);

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
        await updateCroExperiment(formInitialData._id, payload);
        showToast('Experiment updated successfully!');
      } else {
        await createCroExperiment(payload);
        showToast('Experiment created successfully! Points calculated.');
      }
      setIsFormOpen(false);
      setFormInitialData(null);
      fetchExperiments();
      fetchStats();
      if (activeTab === 'leaderboard') fetchLeaderboard();
    } catch (err) {
      const fieldErrors = (err.errors || []).map((e) => e.message || `${e.field} is invalid`).join(', ');
      const msg = fieldErrors ? `Validation failed: ${fieldErrors}` : (err.message || 'Failed to save experiment');
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
      await deleteCroExperiment(deleteTarget._id);
      showToast('Experiment deleted successfully.');
      setDeleteTarget(null);
      fetchExperiments();
      fetchStats();
      if (activeTab === 'leaderboard') fetchLeaderboard();
    } catch (err) {
      showToast(err.message || 'Failed to delete experiment', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenEdit = (exp) => {
    setFormInitialData(exp);
    setIsFormOpen(true);
  };

  const handleOpenDetail = (exp) => {
    setSelectedExperiment(exp);
    setIsDetailOpen(true);
  };

  const filterTabs = [
    { id: 'ALL', label: 'All Experiments' },
    { id: CRO_STATUSES.RUNNING, label: 'Running' },
    { id: CRO_STATUSES.SUCCESSFUL, label: 'Successful' },
    { id: CRO_STATUSES.COMPLETED, label: 'Completed' },
    { id: CRO_STATUSES.NO_IMPACT, label: 'No Impact' },
    { id: CRO_STATUSES.FAILED, label: 'Failed' },
    { id: CRO_STATUSES.IDEA, label: 'Idea' }
  ];

  return (
    <div className="cro-gamiply-page">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`cro-toast-banner ${toastMessage.type}`}>
          {toastMessage.message}
        </div>
      )}

      {/* Header Banner & Gamification Summary */}
      <div className="gamiply-header">
        <div className="header-left">
          <div className="title-row">
            <span className="section-badge">GAMIPLY MODULE</span>
            <h1 className="page-title">CRO Gamiply</h1>
          </div>
          <p className="page-subtitle">
            Internal CRO experimentation & learning arena. Document hypotheses, track conversion uplifts, and rise on the leaderboard.
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
            + New Experiment
          </Button>
        </div>
      </div>

      {/* Gamification Stats Bar */}
      {stats && (
        <div className="gamiply-stats-grid">
          {/* User Score & Rank */}
          <div className="stat-card highlight">
            <div className="stat-icon">🏆</div>
            <div className="stat-content">
              <span className="stat-label">My CRO Rank</span>
              <div className="stat-value-group">
                <span className="stat-main-val">#{stats.user?.rank || 1}</span>
                <span className="stat-sub-val">
                  (+{(stats.user?.totalPoints || 0).toLocaleString()} pts)
                </span>
              </div>
            </div>
          </div>

          {/* User Experiments */}
          <div className="stat-card">
            <div className="stat-icon">🧪</div>
            <div className="stat-content">
              <span className="stat-label">My Experiments</span>
              <div className="stat-value-group">
                <span className="stat-main-val">{stats.user?.totalExperiments || 0}</span>
                <span className="stat-sub-val">
                  ({stats.user?.successfulExperiments || 0} Successful)
                </span>
              </div>
            </div>
          </div>

          {/* Badges Earned */}
          <div className="stat-card">
            <div className="stat-icon">🎖️</div>
            <div className="stat-content">
              <span className="stat-label">Badges Unlocked</span>
              <div className="badges-pills-row">
                {stats.user?.badges?.length > 0 ? (
                  stats.user.badges.map((bId) => (
                    <span
                      key={bId}
                      className="user-badge-chip"
                      title={CRO_BADGES[bId]?.name || bId}
                    >
                      {CRO_BADGES[bId]?.icon || '🏅'}
                    </span>
                  ))
                ) : (
                  <span className="empty-sub">Earn points to unlock</span>
                )}
              </div>
            </div>
          </div>

          {/* Company-Wide Milestone */}
          <div className="stat-card global-card">
            <div className="stat-icon">🌐</div>
            <div className="stat-content">
              <span className="stat-label">Team Total Impact</span>
              <div className="stat-value-group">
                <span className="stat-main-val">
                  {(stats.global?.totalPointsAwarded || 0).toLocaleString()} pts
                </span>
                <span className="stat-sub-val">
                  across {stats.global?.totalExperiments || 0} tests
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Navigation Tabs: Experiments vs Leaderboard */}
      <div className="cro-main-nav">
        <button
          className={`nav-tab-btn ${activeTab === 'experiments' ? 'active' : ''}`}
          onClick={() => setActiveTab('experiments')}
        >
          🧪 Experiments ({experiments.length})
        </button>
        <button
          className={`nav-tab-btn ${activeTab === 'leaderboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('leaderboard')}
        >
          🏆 Leaderboard
        </button>
      </div>

      {/* VIEW 1: EXPERIMENTS */}
      {activeTab === 'experiments' && (
        <div className="experiments-view-container">
          {/* Controls Bar: Filters & Search */}
          <div className="experiments-controls-bar">
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
                placeholder="Search experiments, hypotheses, clients..."
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

          {/* Experiments Grid */}
          {loadingExperiments ? (
            <div className="cro-loading-state">
              <LoadingSpinner size="lg" />
              <span>Loading CRO experiments...</span>
            </div>
          ) : experiments.length > 0 ? (
            <div className="experiments-grid">
              {experiments.map((exp) => (
                <ExperimentCard
                  key={exp._id}
                  experiment={exp}
                  currentUser={user}
                  onView={handleOpenDetail}
                  onEdit={handleOpenEdit}
                  onDelete={(e) => setDeleteTarget(e)}
                />
              ))}
            </div>
          ) : (
            <div className="cro-empty-experiments">
              <span className="empty-icon">🧪</span>
              <h3>No CRO experiments found</h3>
              <p>
                {mineOnly
                  ? "You haven't created any CRO experiments yet. Click '+ New Experiment' to document your first test!"
                  : statusFilter !== 'ALL'
                  ? `No experiments currently in status '${statusFilter}'.`
                  : 'No CRO experiments have been documented yet. Start by creating the first one!'}
              </p>
              <Button
                variant="primary"
                onClick={() => {
                  setFormInitialData(null);
                  setIsFormOpen(true);
                }}
              >
                + Create First Experiment
              </Button>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: LEADERBOARD */}
      {activeTab === 'leaderboard' && (
        <div className="leaderboard-view-container">
          {loadingLeaderboard ? (
            <div className="cro-loading-state">
              <LoadingSpinner size="lg" />
              <span>Calculating CRO rankings...</span>
            </div>
          ) : (
            <LeaderboardTable
              leaderboard={leaderboard}
              period={leaderboardPeriod}
              onPeriodChange={(newPeriod) => setLeaderboardPeriod(newPeriod)}
              currentUserId={user?._id}
            />
          )}
        </div>
      )}

      {/* Create / Edit Experiment Modal */}
      <ExperimentFormModal
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
      <ExperimentDetailModal
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedExperiment(null);
        }}
        experiment={selectedExperiment}
        onEdit={(exp) => {
          setIsDetailOpen(false);
          handleOpenEdit(exp);
        }}
        canEdit={
          user?.role === 'admin' ||
          (selectedExperiment?.creatorId?._id
            ? user?._id === selectedExperiment.creatorId._id
            : user?._id === selectedExperiment?.creatorId)
        }
      />

      {/* Admin Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Confirm Delete Experiment"
      >
        <div className="delete-confirm-box">
          <p>
            Are you sure you want to permanently delete the CRO experiment:{' '}
            <strong>"{deleteTarget?.hypothesisTitle}"</strong>?
          </p>
          <p className="delete-warning">
            ⚠️ This will remove the experiment record, associated screenshot files, and deduct its score points from the creator.
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
