import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getProjections,
  createProjection,
  updateProjection,
  deleteProjection
} from '../../api/projection.api';
import { ClientSelect } from '../../components/common/ClientSelect';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { PageHeader } from '../../components/common/PageHeader';
import { Plus, Check, AlertCircle } from 'lucide-react';
import {
  MONTHS,
  getMonthName,
  formatCurrency,
  formatROAS
} from '../../utils/formatUtils';
import './ProjectionsPage.scss';

export const ProjectionsPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const navigate = useNavigate();

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'

  const [projections, setProjections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Create Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    clientId: '',
    clientName: '',
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    targetSpend: '',
    targetRevenue: '',
    targetROAS: '',
    currentDailyBudget: '',
    notes: ''
  });
  const [createErrors, setCreateErrors] = useState({});
  const [isCreating, setIsCreating] = useState(false);
  const [modalError, setModalError] = useState('');

  // Edit Targets Modal state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingProjection, setEditingProjection] = useState(null);
  const [editFormData, setEditFormData] = useState({
    targetSpend: '',
    targetRevenue: '',
    targetROAS: '',
    currentDailyBudget: '',
    notes: ''
  });
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete Confirm Modal state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchProjections = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getProjections({
        month: selectedMonth,
        year: selectedYear
      });
      const list = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
          ? res.data
          : (res?.data?.data || []);
      setProjections(list);
    } catch (err) {
      showToast(err.message || 'Failed to load projections', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchProjections();
  }, [fetchProjections]);

  // Filter projections by search query
  const filteredProjections = useMemo(() => {
    if (!searchQuery.trim()) return projections;
    const q = searchQuery.toLowerCase().trim();
    return projections.filter((p) => {
      const clientName = (p.client?.name || p.client?.clientName || '').toLowerCase();
      const clientCode = (p.client?.code || '').toLowerCase();
      return clientName.includes(q) || clientCode.includes(q);
    });
  }, [projections, searchQuery]);

  // Aggregate summary metrics across visible projects
  const summary = useMemo(() => {
    let targetSpend = 0;
    let actualSpend = 0;
    let forecastSpend = 0;
    let targetRevenue = 0;
    let actualRevenue = 0;
    let forecastRevenue = 0;
    let onTrackCount = 0;

    for (const p of filteredProjections) {
      const calc = p.calculations || {};
      targetSpend += p.targetSpend || 0;
      actualSpend += calc.totalActualSpend || 0;
      forecastSpend += calc.forecastedMonthlySpend || 0;
      targetRevenue += p.targetRevenue || 0;
      actualRevenue += calc.totalActualRevenue || 0;
      forecastRevenue += calc.forecastedMonthlyRevenue || 0;
      if (calc.overallStatus === 'ON TRACK') {
        onTrackCount++;
      }
    }

    const blendedForecastROAS = forecastSpend > 0 ? forecastRevenue / forecastSpend : 0;
    const blendedTargetROAS = targetSpend > 0 ? targetRevenue / targetSpend : 0;

    return {
      targetSpend,
      actualSpend,
      forecastSpend,
      targetRevenue,
      actualRevenue,
      forecastRevenue,
      blendedForecastROAS,
      blendedTargetROAS,
      totalCount: filteredProjections.length,
      onTrackCount
    };
  }, [filteredProjections]);

  const handleOpenCreateModal = () => {
    setCreateFormData({
      clientId: '',
      clientName: '',
      month: selectedMonth,
      year: selectedYear,
      targetSpend: '',
      targetRevenue: '',
      targetROAS: '',
      currentDailyBudget: '',
      notes: ''
    });
    setCreateErrors({});
    setModalError('');
    setIsCreateOpen(true);
  };

  const handleCreateClientSelect = (selection) => {
    setCreateFormData((prev) => ({
      ...prev,
      clientId: selection.clientId || '',
      clientName: selection.clientName || '',
      // Autofill target ROAS as initial suggestion if available from client model
      targetROAS: prev.targetROAS || selection.currentROAS || selection.baselineROAS || ''
    }));
    if (createErrors.clientId) {
      setCreateErrors((prev) => ({ ...prev, clientId: '' }));
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!createFormData.clientId) errors.clientId = 'Please select a client';
    if (!createFormData.targetSpend || Number(createFormData.targetSpend) < 0) {
      errors.targetSpend = 'Valid target spend is required';
    }
    if (!createFormData.targetRevenue || Number(createFormData.targetRevenue) < 0) {
      errors.targetRevenue = 'Valid target revenue is required';
    }
    if (!createFormData.targetROAS || Number(createFormData.targetROAS) < 0) {
      errors.targetROAS = 'Valid target ROAS is required';
    }
    if (!createFormData.currentDailyBudget || Number(createFormData.currentDailyBudget) < 0) {
      errors.currentDailyBudget = 'Valid daily budget is required';
    }

    if (Object.keys(errors).length > 0) {
      setCreateErrors(errors);
      return;
    }

    try {
      setIsCreating(true);
      setModalError('');
      await createProjection({
        clientId: createFormData.clientId,
        month: Number(createFormData.month),
        year: Number(createFormData.year),
        targetSpend: Number(createFormData.targetSpend),
        targetRevenue: Number(createFormData.targetRevenue),
        targetROAS: Number(createFormData.targetROAS),
        currentDailyBudget: Number(createFormData.currentDailyBudget),
        notes: createFormData.notes
      });
      showToast('Project projection created successfully');
      setIsCreateOpen(false);
      fetchProjections();
    } catch (err) {
      setModalError(err.message || 'Failed to create projection');
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenEditModal = (proj, e) => {
    if (e) e.stopPropagation();
    setEditingProjection(proj);
    setEditFormData({
      targetSpend: proj.targetSpend || '',
      targetRevenue: proj.targetRevenue || '',
      targetROAS: proj.targetROAS || '',
      currentDailyBudget: proj.currentDailyBudget || '',
      notes: proj.notes || ''
    });
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingProjection) return;

    try {
      setIsUpdating(true);
      await updateProjection(editingProjection._id, {
        targetSpend: Number(editFormData.targetSpend),
        targetRevenue: Number(editFormData.targetRevenue),
        targetROAS: Number(editFormData.targetROAS),
        currentDailyBudget: Number(editFormData.currentDailyBudget),
        notes: editFormData.notes
      });
      showToast('Projection updated successfully');
      setIsEditOpen(false);
      fetchProjections();
    } catch (err) {
      showToast(err.message || 'Failed to update projection', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      await deleteProjection(deleteTarget._id);
      showToast('Projection deleted successfully');
      setDeleteTarget(null);
      fetchProjections();
    } catch (err) {
      showToast(err.message || 'Failed to delete projection', 'error');
    } finally {
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

  return (
    <div className="projections-page-container">
      {/* Toast Notification */}
      {toast && (
        <div className={`projection-toast-banner ${toast.type}`}>
          {toast.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <PageHeader
        title="Project Projections"
        description="Track monthly targets, daily actuals, and automated forecasts project-by-project."
        actions={
          <Button
            variant="primary"
            size="md"
            icon={<Plus size={16} />}
            onClick={handleOpenCreateModal}
          >
            Create Projection
          </Button>
        }
      />

      {/* Period & Filter Bar */}
      <div className="controls-card">
        <div className="period-selector-group">
          <div className="period-label">Period:</div>
          <select
            className="period-select"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
          >
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>

          <select
            className="period-select year-select"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {[2024, 2025, 2026, 2027].map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedMonth(now.getMonth() + 1);
              setSelectedYear(now.getFullYear());
            }}
          >
            Current Month
          </Button>
        </div>

        <div className="search-and-view-group">
          <input
            type="text"
            className="search-input"
            placeholder="Search by client or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <div className="view-toggle">
            <button
              className={`toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Table view"
            >
              Table
            </button>
            <button
              className={`toggle-btn ${viewMode === 'cards' ? 'active' : ''}`}
              onClick={() => setViewMode('cards')}
              title="Project cards view"
            >
              Cards
            </button>
          </div>
        </div>
      </div>

      {/* Monthly Summary Metric Strip */}
      <div className="summary-strip">
        <div className="summary-card">
          <div className="card-sub">Ad Spend</div>
          <div className="metric-row">
            <div className="metric-group">
              <span className="metric-label">Target</span>
              <span className="metric-value">{formatCurrency(summary.targetSpend, true)}</span>
            </div>
            <div className="metric-divider">/</div>
            <div className="metric-group">
              <span className="metric-label">Actual</span>
              <span className="metric-value">{formatCurrency(summary.actualSpend, true)}</span>
            </div>
            <div className="metric-divider">/</div>
            <div className="metric-group highlight">
              <span className="metric-label">Forecast</span>
              <span className="metric-value">{formatCurrency(summary.forecastSpend, true)}</span>
            </div>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-sub">Revenue</div>
          <div className="metric-row">
            <div className="metric-group">
              <span className="metric-label">Target</span>
              <span className="metric-value">{formatCurrency(summary.targetRevenue, true)}</span>
            </div>
            <div className="metric-divider">/</div>
            <div className="metric-group">
              <span className="metric-label">Actual</span>
              <span className="metric-value">{formatCurrency(summary.actualRevenue, true)}</span>
            </div>
            <div className="metric-divider">/</div>
            <div className="metric-group highlight">
              <span className="metric-label">Forecast</span>
              <span className="metric-value">{formatCurrency(summary.forecastRevenue, true)}</span>
            </div>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-sub">Blended ROAS</div>
          <div className="metric-row">
            <div className="metric-group">
              <span className="metric-label">Target</span>
              <span className="metric-value">{formatROAS(summary.blendedTargetROAS)}</span>
            </div>
            <div className="metric-divider">→</div>
            <div className="metric-group highlight">
              <span className="metric-label">Forecast</span>
              <span className="metric-value">{formatROAS(summary.blendedForecastROAS)}</span>
            </div>
          </div>
        </div>

        <div className="summary-card status-summary">
          <div className="card-sub">Health Overview</div>
          <div className="health-stat">
            <span className="on-track-number">{summary.onTrackCount}</span>
            <span className="on-track-label">of {summary.totalCount} projects on track</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="loading-container">
          <LoadingSpinner size="lg" />
          <p>Loading project projections...</p>
        </div>
      ) : filteredProjections.length === 0 ? (
        <div className="empty-state-wrapper">
          <EmptyState
            title="No projection created for this month."
            description={`No monthly targets or tracking configured for ${getMonthName(
              selectedMonth
            )} ${selectedYear}.`}
          />
          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="primary"
              size="md"
              icon={<Plus size={15} />}
              onClick={handleOpenCreateModal}
            >
              Create Projection
            </Button>
          </div>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW (Section 12) */
        <div className="table-wrapper">
          <table className="projections-table">
            <thead>
              <tr>
                <th>Client</th>
                <th className="th-num">Target Spend</th>
                <th className="th-num">Actual Spend</th>
                <th className="th-num">Forecast Spend</th>
                <th className="th-num">Target Rev</th>
                <th className="th-num">Actual Rev</th>
                <th className="th-num">Forecast Rev</th>
                <th className="th-num">Target ROAS</th>
                <th className="th-num">Forecast ROAS</th>
                <th>Status</th>
                <th className="th-action">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjections.map((p) => {
                const calc = p.calculations || {};
                const clientName = p.client?.name || p.client?.clientName || 'Unknown Client';
                const clientCode = p.client?.code;

                return (
                  <tr
                    key={p._id}
                    className="projection-row"
                    onClick={() => navigate(`/projections/${p._id}`)}
                  >
                    <td className="client-cell">
                      <div className="client-info">
                        <span className="client-name">{clientName}</span>
                        {clientCode && <span className="client-code-pill">{clientCode}</span>}
                      </div>
                    </td>

                    <td className="num-cell">{formatCurrency(p.targetSpend)}</td>
                    <td className="num-cell highlight-actual">{formatCurrency(calc.totalActualSpend)}</td>
                    <td className="num-cell highlight-forecast">{formatCurrency(calc.forecastedMonthlySpend)}</td>

                    <td className="num-cell">{formatCurrency(p.targetRevenue)}</td>
                    <td className="num-cell highlight-actual">{formatCurrency(calc.totalActualRevenue)}</td>
                    <td className="num-cell highlight-forecast">{formatCurrency(calc.forecastedMonthlyRevenue)}</td>

                    <td className="num-cell roas-cell">{formatROAS(p.targetROAS)}</td>
                    <td className="num-cell roas-cell highlight-forecast">{formatROAS(calc.forecastedROAS)}</td>

                    <td className="status-cell">{getStatusBadge(calc.overallStatus)}</td>

                    <td className="action-cell" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="btn-link"
                        onClick={() => navigate(`/projections/${p._id}`)}
                        title="Open Project Tracking"
                      >
                        Track
                      </button>
                      <button
                        className="btn-link"
                        onClick={(e) => handleOpenEditModal(p, e)}
                        title="Edit Target Numbers"
                      >
                        Edit
                      </button>
                      {isAdmin && (
                        <button
                          className="btn-link danger"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(p);
                          }}
                          title="Delete Projection"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* PROJECT-WISE CARDS VIEW (Section 11) */
        <div className="cards-grid">
          {filteredProjections.map((p) => {
            const calc = p.calculations || {};
            const clientName = p.client?.name || p.client?.clientName || 'Unknown Client';
            const clientCode = p.client?.code;

            return (
              <div
                key={p._id}
                className="project-card"
                onClick={() => navigate(`/projections/${p._id}`)}
              >
                <div className="card-header">
                  <div>
                    <h3 className="card-title">{clientName}</h3>
                    <span className="card-period">
                      {getMonthName(p.month)} {p.year} {clientCode && `• ${clientCode}`}
                    </span>
                  </div>
                  {getStatusBadge(calc.overallStatus)}
                </div>

                <div className="card-body">
                  <div className="metrics-block">
                    <div className="metric-row">
                      <span className="lbl">Target Spend:</span>
                      <span className="val">{formatCurrency(p.targetSpend)}</span>
                    </div>
                    <div className="metric-row">
                      <span className="lbl">Actual Spend:</span>
                      <span className="val highlight">{formatCurrency(calc.totalActualSpend)}</span>
                    </div>
                    <div className="metric-row">
                      <span className="lbl">Forecast Spend:</span>
                      <span className="val highlight-strong">{formatCurrency(calc.forecastedMonthlySpend)}</span>
                    </div>
                    <div className="metric-row gap-row">
                      <span className="lbl">Spend Gap:</span>
                      <span className={`val ${calc.spendGap < 0 ? 'neg' : ''}`}>
                        {formatCurrency(calc.spendGap)}
                      </span>
                    </div>
                  </div>

                  <div className="metrics-block">
                    <div className="metric-row">
                      <span className="lbl">Target Revenue:</span>
                      <span className="val">{formatCurrency(p.targetRevenue)}</span>
                    </div>
                    <div className="metric-row">
                      <span className="lbl">Actual Revenue:</span>
                      <span className="val highlight">{formatCurrency(calc.totalActualRevenue)}</span>
                    </div>
                    <div className="metric-row">
                      <span className="lbl">Forecast Revenue:</span>
                      <span className="val highlight-strong">{formatCurrency(calc.forecastedMonthlyRevenue)}</span>
                    </div>
                    <div className="metric-row gap-row">
                      <span className="lbl">Revenue Gap:</span>
                      <span className={`val ${calc.revenueGap > 0 ? 'neg' : ''}`}>
                        {formatCurrency(calc.revenueGap)}
                      </span>
                    </div>
                  </div>

                  <div className="roas-summary-strip">
                    <div className="roas-item">
                      <span className="roas-lbl">Target ROAS</span>
                      <span className="roas-val">{formatROAS(p.targetROAS)}</span>
                    </div>
                    <div className="roas-item">
                      <span className="roas-lbl">Actual ROAS</span>
                      <span className="roas-val">{formatROAS(calc.actualROAS)}</span>
                    </div>
                    <div className="roas-item highlight">
                      <span className="roas-lbl">Forecast ROAS</span>
                      <span className="roas-val">{formatROAS(calc.forecastedROAS)}</span>
                    </div>
                  </div>

                  <div className="budget-indicator">
                    <span>Daily Budget:</span>
                    <strong>{formatCurrency(p.currentDailyBudget)}/day</strong>
                  </div>
                </div>

                <div className="card-footer" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate(`/projections/${p._id}`)}
                  >
                    Open Tracking Table →
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE PROJECTION MODAL */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Monthly Project Projection"
        size="md"
      >
        <form onSubmit={handleCreateSubmit} className="projection-form">
          {modalError && <div className="form-error-banner">{modalError}</div>}

          {/* Central Client Select */}
          <div className="form-group">
            <ClientSelect
              value={createFormData.clientId || createFormData.clientName}
              onChange={handleCreateClientSelect}
              error={createErrors.clientId}
              label="Select Project / Client"
              required
              placeholder="Search active CRM client..."
            />
          </div>

          {/* Period */}
          <div className="form-row-2">
            <div className="form-group">
              <label className="input-label">Month *</label>
              <select
                className="input-field"
                value={createFormData.month}
                onChange={(e) =>
                  setCreateFormData((prev) => ({ ...prev, month: Number(e.target.value) }))
                }
              >
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="input-label">Year *</label>
              <select
                className="input-field"
                value={createFormData.year}
                onChange={(e) =>
                  setCreateFormData((prev) => ({ ...prev, year: Number(e.target.value) }))
                }
              >
                {[2024, 2025, 2026, 2027].map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Target Spend & Target Revenue */}
          <div className="form-row-2">
            <Input
              label="Target Ad Spend (₹)"
              type="number"
              placeholder="e.g. 800000"
              value={createFormData.targetSpend}
              onChange={(e) =>
                setCreateFormData((prev) => ({ ...prev, targetSpend: e.target.value }))
              }
              error={createErrors.targetSpend}
              required
            />

            <Input
              label="Target Revenue (₹)"
              type="number"
              placeholder="e.g. 3200000"
              value={createFormData.targetRevenue}
              onChange={(e) =>
                setCreateFormData((prev) => ({ ...prev, targetRevenue: e.target.value }))
              }
              error={createErrors.targetRevenue}
              required
            />
          </div>

          {/* Target ROAS & Current Daily Budget */}
          <div className="form-row-2">
            <Input
              label="Target ROAS (x)"
              type="number"
              step="0.01"
              placeholder="e.g. 4.0"
              value={createFormData.targetROAS}
              onChange={(e) =>
                setCreateFormData((prev) => ({ ...prev, targetROAS: e.target.value }))
              }
              helperText="Manually entered monthly target ROAS"
              error={createErrors.targetROAS}
              required
            />

            <Input
              label="Current Daily Budget (₹/day)"
              type="number"
              placeholder="e.g. 25000"
              value={createFormData.currentDailyBudget}
              onChange={(e) =>
                setCreateFormData((prev) => ({ ...prev, currentDailyBudget: e.target.value }))
              }
              helperText="Ad account daily budget used for forecasting"
              error={createErrors.currentDailyBudget}
              required
            />
          </div>

          <div className="form-group">
            <Input
              label="Notes (Optional)"
              type="text"
              placeholder="e.g. Festive sale scaling plan"
              value={createFormData.notes}
              onChange={(e) => setCreateFormData((prev) => ({ ...prev, notes: e.target.value }))}
            />
          </div>

          <div className="modal-actions">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => setIsCreateOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md" disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Create Projection'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* EDIT TARGETS MODAL */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={`Edit Targets • ${
          editingProjection?.client?.name || editingProjection?.client?.clientName || ''
        }`}
        size="md"
      >
        <form onSubmit={handleEditSubmit} className="projection-form">
          <div className="form-row-2">
            <Input
              label="Target Ad Spend (₹)"
              type="number"
              value={editFormData.targetSpend}
              onChange={(e) =>
                setEditFormData((prev) => ({ ...prev, targetSpend: e.target.value }))
              }
              required
            />

            <Input
              label="Target Revenue (₹)"
              type="number"
              value={editFormData.targetRevenue}
              onChange={(e) =>
                setEditFormData((prev) => ({ ...prev, targetRevenue: e.target.value }))
              }
              required
            />
          </div>

          <div className="form-row-2">
            <Input
              label="Target ROAS (x)"
              type="number"
              step="0.01"
              value={editFormData.targetROAS}
              onChange={(e) =>
                setEditFormData((prev) => ({ ...prev, targetROAS: e.target.value }))
              }
              required
            />

            <Input
              label="Current Daily Budget (₹/day)"
              type="number"
              value={editFormData.currentDailyBudget}
              onChange={(e) =>
                setEditFormData((prev) => ({ ...prev, currentDailyBudget: e.target.value }))
              }
              helperText="Updating budget preserves historical actual spend"
              required
            />
          </div>

          <div className="form-group">
            <Input
              label="Notes"
              type="text"
              value={editFormData.notes}
              onChange={(e) => setEditFormData((prev) => ({ ...prev, notes: e.target.value }))}
            />
          </div>

          <div className="modal-actions">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => setIsEditOpen(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md" disabled={isUpdating}>
              {isUpdating ? 'Saving...' : 'Save Targets'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRM MODAL */}
      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Confirm Delete Projection"
        size="sm"
      >
        <div className="delete-confirm-body">
          <p>
            Are you sure you want to delete the projection for{' '}
            <strong>
              {deleteTarget?.client?.name || deleteTarget?.client?.clientName} (
              {getMonthName(deleteTarget?.month)} {deleteTarget?.year})
            </strong>
            ?
          </p>
          <p className="delete-warning">
            This will permanently remove all associated daily performance entries.
          </p>
          <div className="modal-actions">
            <Button
              variant="ghost"
              size="md"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="md"
              onClick={handleDeleteSubmit}
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
