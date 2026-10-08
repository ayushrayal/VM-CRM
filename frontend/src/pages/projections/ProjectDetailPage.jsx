import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getProjectionById,
  updateProjection,
  addDailyTracking,
  updateDailyTracking,
  deleteDailyTracking,
  deleteProjection
} from '../../api/projection.api';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
  getMonthName,
  formatCurrency,
  formatROAS,
  formatPercent
} from '../../utils/formatUtils';
import './ProjectDetailPage.scss';

export const ProjectDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [projection, setProjection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Quick Daily Budget Inline Edit State
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetInputValue, setBudgetInputValue] = useState('');
  const [isSavingBudget, setIsSavingBudget] = useState(false);

  // Add / Edit Daily Actual Record Modal
  const [isDailyModalOpen, setIsDailyModalOpen] = useState(false);
  const [editingDailyId, setEditingDailyId] = useState(null);
  const [dailyFormData, setDailyFormData] = useState({
    date: '',
    actualSpend: '',
    actualRevenue: '',
    notes: ''
  });
  const [dailyFormErrors, setDailyFormErrors] = useState({});
  const [isSavingDaily, setIsSavingDaily] = useState(false);

  // Edit Targets Modal
  const [isEditTargetsOpen, setIsEditTargetsOpen] = useState(false);
  const [targetsFormData, setTargetsFormData] = useState({
    targetSpend: '',
    targetRevenue: '',
    targetROAS: '',
    notes: ''
  });
  const [isSavingTargets, setIsSavingTargets] = useState(false);

  // Budget History Modal
  const [isBudgetHistoryOpen, setIsBudgetHistoryOpen] = useState(false);

  // Delete Confirm Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchProjection = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getProjectionById(id);
      const data = res?.data ?? res;
      setProjection(data);
      setBudgetInputValue(String(data.currentDailyBudget || ''));
    } catch (err) {
      showToast(err.message || 'Failed to load project projection', 'error');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProjection();
  }, [fetchProjection]);

  // Update Current Daily Budget
  const handleSaveBudget = async () => {
    const num = Number(budgetInputValue);
    if (isNaN(num) || num < 0) {
      showToast('Daily budget must be a positive number', 'error');
      return;
    }
    try {
      setIsSavingBudget(true);
      await updateProjection(id, { currentDailyBudget: num });
      showToast(`Current daily budget updated to ${formatCurrency(num)}/day`);
      setIsEditingBudget(false);
      fetchProjection();
    } catch (err) {
      showToast(err.message || 'Failed to update daily budget', 'error');
    } finally {
      setIsSavingBudget(false);
    }
  };

  // Open modal to add daily actual entry
  const handleOpenAddDaily = () => {
    // Default to today's date if in this month, or projection year-month-01
    const pad = (n) => String(n).padStart(2, '0');
    const today = new Date();
    let defaultDate = `${projection.year}-${pad(projection.month)}-01`;
    if (
      today.getFullYear() === projection.year &&
      today.getMonth() + 1 === projection.month
    ) {
      defaultDate = `${projection.year}-${pad(projection.month)}-${pad(today.getDate())}`;
    }

    setDailyFormData({
      date: defaultDate,
      actualSpend: '',
      actualRevenue: '',
      notes: ''
    });
    setEditingDailyId(null);
    setDailyFormErrors({});
    setIsDailyModalOpen(true);
  };

  // Open modal to edit existing daily actual entry
  const handleOpenEditDaily = (entry) => {
    setDailyFormData({
      date: entry.date,
      actualSpend: String(entry.actualSpend ?? ''),
      actualRevenue: String(entry.actualRevenue ?? ''),
      notes: entry.notes || ''
    });
    setEditingDailyId(entry._id);
    setDailyFormErrors({});
    setIsDailyModalOpen(true);
  };

  // Submit Daily Actual Entry
  const handleDailySubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!dailyFormData.date) errors.date = 'Date is required';
    if (dailyFormData.actualSpend === '' || Number(dailyFormData.actualSpend) < 0) {
      errors.actualSpend = 'Actual spend cannot be negative';
    }
    if (dailyFormData.actualRevenue === '' || Number(dailyFormData.actualRevenue) < 0) {
      errors.actualRevenue = 'Actual revenue cannot be negative';
    }

    if (Object.keys(errors).length > 0) {
      setDailyFormErrors(errors);
      return;
    }

    try {
      setIsSavingDaily(true);
      if (editingDailyId) {
        // Editing specific entry
        await updateDailyTracking(id, editingDailyId, {
          actualSpend: Number(dailyFormData.actualSpend),
          actualRevenue: Number(dailyFormData.actualRevenue),
          notes: dailyFormData.notes
        });
        showToast(`Performance for ${dailyFormData.date} updated`);
      } else {
        // Adding or upserting daily entry
        await addDailyTracking(id, {
          date: dailyFormData.date,
          actualSpend: Number(dailyFormData.actualSpend),
          actualRevenue: Number(dailyFormData.actualRevenue),
          notes: dailyFormData.notes
        });
        showToast(`Actual performance for ${dailyFormData.date} saved`);
      }
      setIsDailyModalOpen(false);
      fetchProjection();
    } catch (err) {
      showToast(err.message || 'Failed to save daily performance', 'error');
    } finally {
      setIsSavingDaily(false);
    }
  };

  // Delete daily tracking entry
  const handleDeleteDaily = async (dailyId, date) => {
    if (!window.confirm(`Delete actual performance entry for ${date}?`)) return;
    try {
      await deleteDailyTracking(id, dailyId);
      showToast(`Removed entry for ${date}`);
      fetchProjection();
    } catch (err) {
      showToast(err.message || 'Failed to delete daily entry', 'error');
    }
  };

  // Open edit targets modal
  const handleOpenEditTargets = () => {
    setTargetsFormData({
      targetSpend: String(projection.targetSpend || ''),
      targetRevenue: String(projection.targetRevenue || ''),
      targetROAS: String(projection.targetROAS || ''),
      notes: projection.notes || ''
    });
    setIsEditTargetsOpen(true);
  };

  // Submit edit targets
  const handleTargetsSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSavingTargets(true);
      await updateProjection(id, {
        targetSpend: Number(targetsFormData.targetSpend),
        targetRevenue: Number(targetsFormData.targetRevenue),
        targetROAS: Number(targetsFormData.targetROAS),
        notes: targetsFormData.notes
      });
      showToast('Targets updated successfully');
      setIsEditTargetsOpen(false);
      fetchProjection();
    } catch (err) {
      showToast(err.message || 'Failed to update targets', 'error');
    } finally {
      setIsSavingTargets(false);
    }
  };

  // Delete projection
  const handleDeleteProjectionSubmit = async () => {
    try {
      setIsDeleting(true);
      await deleteProjection(id);
      showToast('Projection deleted successfully');
      navigate('/projections');
    } catch (err) {
      showToast(err.message || 'Failed to delete projection', 'error');
      setIsDeleting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ON TRACK':
        return <Badge variant="active">ON TRACK</Badge>;
      case 'AT RISK':
        return <Badge variant="pending">AT RISK</Badge>;
      case 'BELOW TARGET':
      case 'OVER BUDGET':
        return <Badge variant="rejected">{status}</Badge>;
      default:
        return <Badge variant="team">{status || 'NEW'}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="project-detail-loading">
        <LoadingSpinner size="lg" />
        <p>Loading project projection details...</p>
      </div>
    );
  }

  if (!projection) {
    return (
      <div className="project-detail-container">
        <Button variant="ghost" size="sm" onClick={() => navigate('/projections')}>
          ← Back to Projections
        </Button>
        <p style={{ marginTop: '24px' }}>Projection not found or removed.</p>
      </div>
    );
  }

  const calc = projection.calculations || {};
  const clientName = projection.client?.name || projection.client?.clientName || 'Client Project';
  const clientCode = projection.client?.code;
  const periodTitle = `${getMonthName(projection.month)} ${projection.year}`;

  return (
    <div className="project-detail-container">
      {/* Toast Banner */}
      {toast && (
        <div className={`detail-toast-banner ${toast.type}`}>
          <span>{toast.type === 'success' ? '✓' : '⚠'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Navigation Breadcrumb & Page Header */}
      <div className="detail-header">
        <div className="breadcrumb-row">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/projections')}
            className="back-btn"
          >
            ← Back to All Projections
          </Button>
          <span className="breadcrumb-divider">/</span>
          <span className="breadcrumb-current">{clientName}</span>
        </div>

        <div className="header-title-bar">
          <div className="title-left">
            <div className="client-heading-row">
              <h1 className="project-title">{clientName}</h1>
              {clientCode && <span className="client-code-badge">{clientCode}</span>}
              <span className="period-badge">{periodTitle}</span>
              {getStatusBadge(calc.overallStatus)}
            </div>
            {projection.notes && <p className="projection-notes-text">{projection.notes}</p>}
          </div>

          <div className="title-actions">
            <Button variant="secondary" size="sm" onClick={handleOpenEditTargets}>
              Edit Targets
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsBudgetHistoryOpen(true)}
            >
              Budget History ({projection.budgetHistory?.length || 1})
            </Button>
            {isAdmin && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setIsDeleteModalOpen(true)}
              >
                Delete
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 4 CORE METRIC CARDS (Sections A, B, C, D) */}
      <div className="metric-blocks-grid">
        {/* A. TARGET METRICS */}
        <div className="metric-block-card target-card">
          <div className="block-header">
            <span className="block-tag">A. TARGET</span>
            <h3 className="block-title">Monthly Targets</h3>
          </div>
          <div className="block-content">
            <div className="metric-item">
              <span className="metric-label">Target Ad Spend</span>
              <span className="metric-value">{formatCurrency(projection.targetSpend)}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Target Revenue</span>
              <span className="metric-value">{formatCurrency(projection.targetRevenue)}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Target ROAS</span>
              <span className="metric-value roas-value">{formatROAS(projection.targetROAS)}</span>
            </div>
          </div>
        </div>

        {/* B. CURRENT ACTUAL METRICS + DAILY BUDGET EDIT */}
        <div className="metric-block-card current-card">
          <div className="block-header">
            <span className="block-tag">B. CURRENT ACTUALS</span>
            <h3 className="block-title">Actual Performance</h3>
          </div>
          <div className="block-content">
            {/* Prominent Current Daily Budget with immediate inline edit */}
            <div className="daily-budget-box">
              <div className="budget-box-top">
                <span className="budget-box-label">CURRENT DAILY BUDGET</span>
                {!isEditingBudget && (
                  <button
                    className="edit-budget-btn"
                    onClick={() => {
                      setBudgetInputValue(String(projection.currentDailyBudget || ''));
                      setIsEditingBudget(true);
                    }}
                  >
                    Change
                  </button>
                )}
              </div>

              {isEditingBudget ? (
                <div className="budget-inline-edit">
                  <div className="input-prefix-wrapper">
                    <span className="rupee-symbol">₹</span>
                    <input
                      type="number"
                      className="inline-budget-input"
                      value={budgetInputValue}
                      onChange={(e) => setBudgetInputValue(e.target.value)}
                      placeholder="e.g. 35000"
                      autoFocus
                    />
                  </div>
                  <div className="inline-budget-actions">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleSaveBudget}
                      disabled={isSavingBudget}
                    >
                      {isSavingBudget ? '...' : 'Save'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditingBudget(false)}
                      disabled={isSavingBudget}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="budget-box-value">
                  {formatCurrency(projection.currentDailyBudget)}
                  <span className="per-day">/ day</span>
                </div>
              )}
            </div>

            <div className="metric-item">
              <span className="metric-label">Actual Spend To Date</span>
              <span className="metric-value highlight">{formatCurrency(calc.totalActualSpend)}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Actual Revenue To Date</span>
              <span className="metric-value highlight">{formatCurrency(calc.totalActualRevenue)}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Actual ROAS</span>
              <span className="metric-value roas-value highlight">
                {formatROAS(calc.actualROAS)}
              </span>
            </div>
          </div>
        </div>

        {/* C. FORECAST METRICS */}
        <div className="metric-block-card forecast-card">
          <div className="block-header">
            <span className="block-tag">C. FORECAST</span>
            <h3 className="block-title">Monthly Forecast</h3>
          </div>
          <div className="block-content">
            <div className="metric-item">
              <span className="metric-label">Forecasted Monthly Spend</span>
              <span className="metric-value highlight-cyan">
                {formatCurrency(calc.forecastedMonthlySpend)}
              </span>
              <span className="metric-sub-note">
                Actuals + ({formatCurrency(projection.currentDailyBudget)} × {calc.remainingDays} days)
              </span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Forecasted Monthly Revenue</span>
              <span className="metric-value highlight-cyan">
                {formatCurrency(calc.forecastedMonthlyRevenue)}
              </span>
              <span className="metric-sub-note">
                Avg {formatCurrency(calc.averageDailyRevenue, true)}/day × {calc.remainingDays} days
              </span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Forecasted ROAS</span>
              <span className="metric-value roas-value highlight-cyan">
                {formatROAS(calc.forecastedROAS)}
              </span>
            </div>
          </div>
        </div>

        {/* D. GAPS & ACHIEVEMENT */}
        <div className="metric-block-card gap-card">
          <div className="block-header">
            <span className="block-tag">D. COMPARISON</span>
            <h3 className="block-title">Target vs Forecast Gap</h3>
          </div>
          <div className="block-content">
            <div className="metric-item">
              <div className="metric-header-flex">
                <span className="metric-label">Spend Gap</span>
                <span className="achievement-pill">
                  {formatPercent(calc.forecastSpendAchievement)}
                </span>
              </div>
              <span
                className={`metric-value ${
                  calc.spendGap < 0 ? 'gap-warning' : 'gap-positive'
                }`}
              >
                {formatCurrency(calc.spendGap)}
              </span>
              <span className="metric-sub-note">
                {calc.spendGap > 0
                  ? 'Projected under target spend'
                  : calc.spendGap < 0
                  ? 'Projected over target spend'
                  : 'On exact target'}
              </span>
            </div>

            <div className="metric-item">
              <div className="metric-header-flex">
                <span className="metric-label">Revenue Gap</span>
                <span className="achievement-pill">
                  {formatPercent(calc.forecastRevenueAchievement)}
                </span>
              </div>
              <span
                className={`metric-value ${
                  calc.revenueGap > 0 ? 'gap-warning' : 'gap-positive'
                }`}
              >
                {formatCurrency(calc.revenueGap)}
              </span>
              <span className="metric-sub-note">
                {calc.revenueGap > 0
                  ? `${formatCurrency(calc.revenueGap)} shortfall to target`
                  : 'Pacing above target revenue'}
              </span>
            </div>

            <div className="metric-item">
              <span className="metric-label">ROAS Gap</span>
              <span
                className={`metric-value roas-value ${
                  calc.roasGap > 0 ? 'gap-warning' : 'gap-positive'
                }`}
              >
                {calc.roasGap > 0 ? `-${formatROAS(calc.roasGap)}` : `+${formatROAS(Math.abs(calc.roasGap))}`}
              </span>
              <span className="metric-sub-note">
                Target: {formatROAS(projection.targetROAS)} vs Forecast: {formatROAS(calc.forecastedROAS)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* DAILY TRACKING SECTION (Section E) */}
      <div className="daily-tracking-section">
        <div className="section-header">
          <div>
            <h2 className="section-title">Daily Performance Tracking</h2>
            <p className="section-subtitle">
              Log actual daily ad spend and revenue. System automatically recalculates month-to-date totals and forecasts.
            </p>
          </div>
          <Button variant="primary" size="md" onClick={handleOpenAddDaily}>
            + Log Daily Actual
          </Button>
        </div>

        {!projection.dailyTracking || projection.dailyTracking.length === 0 ? (
          <div className="daily-empty-box">
            <div className="empty-text">No actual performance recorded yet.</div>
            <p className="empty-sub">
              Add daily ad spend and revenue entries to compute actual ROAS and accurate month forecasts.
            </p>
            <Button variant="secondary" size="md" onClick={handleOpenAddDaily}>
              + Log First Daily Entry
            </Button>
          </div>
        ) : (
          <div className="daily-table-container">
            <table className="daily-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Actual Ad Spend</th>
                  <th>Actual Revenue</th>
                  <th>Daily ROAS</th>
                  <th>Notes</th>
                  <th className="th-action">Actions</th>
                </tr>
              </thead>
              <tbody>
                {projection.dailyTracking.map((entry) => {
                  const spend = entry.actualSpend || 0;
                  const rev = entry.actualRevenue || 0;
                  const dailyRoas = spend > 0 ? rev / spend : 0;

                  return (
                    <tr key={entry._id || entry.date}>
                      <td className="date-cell">
                        <strong>{entry.date}</strong>
                      </td>
                      <td className="spend-cell">{formatCurrency(spend)}</td>
                      <td className="revenue-cell">{formatCurrency(rev)}</td>
                      <td className="roas-cell">{formatROAS(dailyRoas)}</td>
                      <td className="notes-cell">{entry.notes || '—'}</td>
                      <td className="action-cell">
                        <button
                          className="btn-link"
                          onClick={() => handleOpenEditDaily(entry)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn-link danger"
                          onClick={() => handleDeleteDaily(entry._id, entry.date)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="totals-row">
                  <td>
                    <strong>Month Total ({projection.dailyTracking.length} days logged)</strong>
                  </td>
                  <td className="spend-cell">
                    <strong>{formatCurrency(calc.totalActualSpend)}</strong>
                  </td>
                  <td className="revenue-cell">
                    <strong>{formatCurrency(calc.totalActualRevenue)}</strong>
                  </td>
                  <td className="roas-cell">
                    <strong>{formatROAS(calc.actualROAS)}</strong>
                  </td>
                  <td colSpan="2"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ADD / EDIT DAILY ACTUAL MODAL */}
      <Modal
        isOpen={isDailyModalOpen}
        onClose={() => setIsDailyModalOpen(false)}
        title={editingDailyId ? 'Edit Daily Actual Entry' : 'Log Daily Actual Entry'}
        size="md"
      >
        <form onSubmit={handleDailySubmit} className="detail-form">
          <div className="form-helper-banner">
            Enter the exact spend and revenue actually achieved for this date.
            Changing daily actuals does NOT alter daily budget settings.
          </div>

          <div className="form-group">
            <label className="input-label">Date *</label>
            <input
              type="date"
              className={`input-field ${dailyFormErrors.date ? 'input-error' : ''}`}
              value={dailyFormData.date}
              onChange={(e) =>
                setDailyFormData((prev) => ({ ...prev, date: e.target.value }))
              }
              required
            />
            {dailyFormErrors.date && (
              <span className="input-error-message">{dailyFormErrors.date}</span>
            )}
          </div>

          <div className="form-row-2">
            <Input
              label="Actual Ad Spend (₹)"
              type="number"
              placeholder="e.g. 28000"
              value={dailyFormData.actualSpend}
              onChange={(e) =>
                setDailyFormData((prev) => ({ ...prev, actualSpend: e.target.value }))
              }
              error={dailyFormErrors.actualSpend}
              required
            />

            <Input
              label="Actual Revenue (₹)"
              type="number"
              placeholder="e.g. 70000"
              value={dailyFormData.actualRevenue}
              onChange={(e) =>
                setDailyFormData((prev) => ({ ...prev, actualRevenue: e.target.value }))
              }
              error={dailyFormErrors.actualRevenue}
              required
            />
          </div>

          <div className="form-group">
            <Input
              label="Notes (Optional)"
              type="text"
              placeholder="e.g. Scaling top campaign, Meta platform glitch"
              value={dailyFormData.notes}
              onChange={(e) =>
                setDailyFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
            />
          </div>

          <div className="modal-actions">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => setIsDailyModalOpen(false)}
              disabled={isSavingDaily}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md" disabled={isSavingDaily}>
              {isSavingDaily ? 'Saving...' : 'Save Performance'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* EDIT TARGETS MODAL */}
      <Modal
        isOpen={isEditTargetsOpen}
        onClose={() => setIsEditTargetsOpen(false)}
        title="Edit Monthly Targets"
        size="md"
      >
        <form onSubmit={handleTargetsSubmit} className="detail-form">
          <div className="form-row-2">
            <Input
              label="Target Ad Spend (₹)"
              type="number"
              value={targetsFormData.targetSpend}
              onChange={(e) =>
                setTargetsFormData((prev) => ({ ...prev, targetSpend: e.target.value }))
              }
              required
            />

            <Input
              label="Target Revenue (₹)"
              type="number"
              value={targetsFormData.targetRevenue}
              onChange={(e) =>
                setTargetsFormData((prev) => ({ ...prev, targetRevenue: e.target.value }))
              }
              required
            />
          </div>

          <div className="form-group">
            <Input
              label="Target ROAS (x)"
              type="number"
              step="0.01"
              value={targetsFormData.targetROAS}
              onChange={(e) =>
                setTargetsFormData((prev) => ({ ...prev, targetROAS: e.target.value }))
              }
              helperText="Manually entered monthly target ROAS"
              required
            />
          </div>

          <div className="form-group">
            <Input
              label="Notes"
              type="text"
              value={targetsFormData.notes}
              onChange={(e) =>
                setTargetsFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
            />
          </div>

          <div className="modal-actions">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => setIsEditTargetsOpen(false)}
              disabled={isSavingTargets}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md" disabled={isSavingTargets}>
              {isSavingTargets ? 'Saving...' : 'Save Targets'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* BUDGET HISTORY MODAL */}
      <Modal
        isOpen={isBudgetHistoryOpen}
        onClose={() => setIsBudgetHistoryOpen(false)}
        title="Daily Budget Change History"
        size="md"
      >
        <div className="budget-history-container">
          <p className="history-description">
            Records changes made to the ad account daily budget. Historical actual spend entries are preserved intact.
          </p>
          <div className="history-table-wrapper">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Effective Date</th>
                  <th>Budget</th>
                  <th>Updated By</th>
                  <th>Updated At</th>
                </tr>
              </thead>
              <tbody>
                {(projection.budgetHistory || []).map((entry, idx) => (
                  <tr key={entry._id || idx}>
                    <td>
                      <strong>{entry.effectiveDate}</strong>
                    </td>
                    <td>{formatCurrency(entry.budget)}/day</td>
                    <td>{entry.updatedBy?.name || 'User'}</td>
                    <td>{new Date(entry.updatedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="modal-actions" style={{ marginTop: '16px' }}>
            <Button
              variant="secondary"
              size="md"
              onClick={() => setIsBudgetHistoryOpen(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* DELETE CONFIRM MODAL */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Monthly Projection"
        size="sm"
      >
        <div className="delete-confirm-box">
          <p>
            Are you sure you want to delete the projection for{' '}
            <strong>
              {clientName} ({periodTitle})
            </strong>
            ?
          </p>
          <p className="delete-alert">
            This will permanently remove all daily tracking records for this projection.
          </p>
          <div className="modal-actions">
            <Button
              variant="ghost"
              size="md"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="md"
              onClick={handleDeleteProjectionSubmit}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
