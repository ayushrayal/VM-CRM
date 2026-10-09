import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../../../components/common/Modal';
import { Button } from '../../../components/common/Button';
import { addBulkDailyTracking } from '../../../api/projection.api';
import { getMonthName, formatCurrency, formatROAS } from '../../../utils/formatUtils';
import { Plus, Trash2, AlertTriangle, AlertCircle, Info, Check } from 'lucide-react';
import './BulkDailyTrackingModal.scss';

export const BulkDailyTrackingModal = ({
  isOpen,
  onClose,
  projection,
  onSuccess
}) => {
  const [rows, setRows] = useState([]);
  const [errors, setErrors] = useState({});
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState('');

  // Year and month metadata
  const year = projection?.year;
  const month = projection?.month;
  const daysInMonth = useMemo(() => {
    if (!year || !month) return 31;
    return new Date(year, month, 0).getDate();
  }, [year, month]);

  const pad = (n) => String(n).padStart(2, '0');
  const minDate = `${year}-${pad(month)}-01`;
  const maxDate = `${year}-${pad(month)}-${pad(daysInMonth)}`;

  // Set of dates already saved in the database for this projection
  const existingEntriesMap = useMemo(() => {
    const map = new Map();
    if (Array.isArray(projection?.dailyTracking)) {
      projection.dailyTracking.forEach((item) => {
        map.set(item.date, item);
      });
    }
    return map;
  }, [projection?.dailyTracking]);

  // Initialize with 3 rows on open
  useEffect(() => {
    if (isOpen && year && month) {
      setGeneralError('');
      setErrors({});
      setOverwriteExisting(false);

      // Find first available dates in this month
      const initialDates = [];
      let candidateDay = 1;

      // If current month, start around today's day or first unlogged
      const today = new Date();
      if (today.getFullYear() === year && today.getMonth() + 1 === month) {
        candidateDay = Math.min(today.getDate(), daysInMonth);
      }

      for (let i = 0; i < 3; i++) {
        let d = candidateDay + i;
        if (d > daysInMonth) d = ((d - 1) % daysInMonth) + 1;
        initialDates.push(`${year}-${pad(month)}-${pad(d)}`);
      }

      setRows(
        initialDates.map((date, idx) => ({
          id: `row-${Date.now()}-${idx}`,
          date,
          actualSpend: '',
          actualRevenue: '',
          notes: ''
        }))
      );
    }
  }, [isOpen, year, month, daysInMonth]);

  // Identify dates that conflict with existing database records
  const conflictingDates = useMemo(() => {
    return rows
      .map((r) => r.date)
      .filter((date) => date && existingEntriesMap.has(date));
  }, [rows, existingEntriesMap]);

  // Check duplicate dates within the submission batch
  const batchDuplicateDates = useMemo(() => {
    const seen = new Set();
    const duplicates = new Set();
    rows.forEach((r) => {
      if (!r.date) return;
      if (seen.has(r.date)) {
        duplicates.add(r.date);
      }
      seen.add(r.date);
    });
    return duplicates;
  }, [rows]);

  // Summary totals for rows entered
  const summary = useMemo(() => {
    let totalSpend = 0;
    let totalRevenue = 0;
    let validCount = 0;

    rows.forEach((r) => {
      const spend = Number(r.actualSpend);
      const rev = Number(r.actualRevenue);
      if (!isNaN(spend) && spend >= 0 && r.actualSpend !== '') {
        totalSpend += spend;
      }
      if (!isNaN(rev) && rev >= 0 && r.actualRevenue !== '') {
        totalRevenue += rev;
      }
      if (r.date && r.actualSpend !== '' && r.actualRevenue !== '') {
        validCount++;
      }
    });

    const blendedRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
    return { totalSpend, totalRevenue, blendedRoas, validCount };
  }, [rows]);

  // Handle row changes
  const handleRowChange = (id, field, value) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
    // Clear specific field error
    if (errors[`${id}_${field}`] || errors[id]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[`${id}_${field}`];
        delete next[id];
        return next;
      });
    }
    if (generalError) setGeneralError('');
  };

  // Add another row
  const handleAddRow = () => {
    // Pick the next day after the latest date currently in rows
    let nextDay = 1;
    if (rows.length > 0) {
      const lastRow = rows[rows.length - 1];
      if (lastRow.date) {
        const parts = lastRow.date.split('-');
        const lastDayNum = parseInt(parts[2], 10);
        if (!isNaN(lastDayNum)) {
          nextDay = lastDayNum < daysInMonth ? lastDayNum + 1 : 1;
        }
      }
    }

    const newDate = `${year}-${pad(month)}-${pad(nextDay)}`;
    setRows((prev) => [
      ...prev,
      {
        id: `row-${Date.now()}-${prev.length}`,
        date: newDate,
        actualSpend: '',
        actualRevenue: '',
        notes: ''
      }
    ]);
  };

  // Remove a row
  const handleRemoveRow = (id) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
    setErrors((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        if (key.startsWith(id)) delete next[key];
      });
      return next;
    });
  };

  // Validate form client-side
  const validateForm = () => {
    const newErrors = {};

    if (rows.length === 0) {
      setGeneralError('Please add at least one day to submit.');
      return false;
    }

    // Check duplicates within batch
    const dateCounts = {};
    rows.forEach((r) => {
      if (r.date) {
        dateCounts[r.date] = (dateCounts[r.date] || 0) + 1;
      }
    });

    rows.forEach((r, idx) => {
      // Date validation
      if (!r.date) {
        newErrors[`${r.id}_date`] = 'Date is required';
      } else {
        const [eY, eM, eD] = r.date.split('-').map(Number);
        if (eY !== year || eM !== month) {
          newErrors[`${r.id}_date`] = `Date must be in ${getMonthName(month)} ${year}`;
        } else if (isNaN(eD) || eD < 1 || eD > daysInMonth) {
          newErrors[`${r.id}_date`] = `Invalid day of month`;
        } else if (dateCounts[r.date] > 1) {
          newErrors[`${r.id}_date`] = `Duplicate date in batch`;
        }
      }

      // Spend validation
      if (r.actualSpend === '' || r.actualSpend === undefined) {
        newErrors[`${r.id}_actualSpend`] = 'Spend is required';
      } else {
        const num = Number(r.actualSpend);
        if (isNaN(num) || num < 0) {
          newErrors[`${r.id}_actualSpend`] = 'Must be 0 or greater';
        }
      }

      // Revenue validation
      if (r.actualRevenue === '' || r.actualRevenue === undefined) {
        newErrors[`${r.id}_actualRevenue`] = 'Revenue is required';
      } else {
        const num = Number(r.actualRevenue);
        if (isNaN(num) || num < 0) {
          newErrors[`${r.id}_actualRevenue`] = 'Must be 0 or greater';
        }
      }
    });

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      setGeneralError('Please fix the highlighted row validation errors before saving.');
      return false;
    }

    // Check conflicts requiring overwrite confirmation
    if (conflictingDates.length > 0 && !overwriteExisting) {
      setGeneralError(
        `${conflictingDates.length} date(s) already have existing actuals logged. Check the overwrite confirmation box below to update them.`
      );
      return false;
    }

    return true;
  };

  // Submit all entries
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      setGeneralError('');

      const entries = rows.map((r) => ({
        date: r.date,
        actualSpend: Number(r.actualSpend),
        actualRevenue: Number(r.actualRevenue),
        notes: (r.notes || '').trim()
      }));

      const res = await addBulkDailyTracking(projection._id, {
        entries,
        overwriteExisting
      });

      onSuccess(res?.data?.summary || res?.summary);
      onClose();
    } catch (err) {
      // Check for conflict response from server
      if (err.statusCode === 409 || err.errorCode === 'DATE_CONFLICT') {
        setGeneralError(
          err.message ||
            'One or more dates already have logged entries. Please check the overwrite box to confirm updating them.'
        );
      } else {
        setGeneralError(err.message || 'Failed to save bulk daily tracking entries.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const clientName = projection?.client?.name || projection?.client?.clientName || 'Project Client';
  const clientCode = projection?.client?.code;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Bulk Daily Performance Entry"
      size="xl"
      className="bulk-daily-modal"
    >
      <form onSubmit={handleSubmit} className="bulk-daily-form">
        {/* Header Context Strip */}
        <div className="bulk-context-header">
          <div className="context-meta-group">
            <span className="context-period-badge">
              {getMonthName(month)} {year} (Days 1–{daysInMonth})
            </span>
            <div className="context-client-badge">
              <span className="client-name">{clientName}</span>
              {clientCode && <span className="client-code">{clientCode}</span>}
            </div>
          </div>
          <p className="context-helper-text">
            Enter actual achieved spend and revenue for multiple days. Each row represents one day.
            Actuals update month-to-date totals and forecasts without altering your ad account daily budget.
          </p>
        </div>

        {/* General Error Banner */}
        {generalError && (
          <div className="bulk-alert-banner error">
            <AlertCircle size={16} />
            <span>{generalError}</span>
          </div>
        )}

        {/* Existing Dates Conflict Notice */}
        {conflictingDates.length > 0 && (
          <div className="bulk-alert-banner warning">
            <div className="warning-content">
              <div className="warning-title-row">
                <AlertTriangle size={16} />
                <strong>Existing Dates Detected ({conflictingDates.length})</strong>
              </div>
              <p className="warning-desc">
                The following date(s) already have logged actuals in this project:{' '}
                <span className="dates-pill-list">
                  {conflictingDates.join(', ')}
                </span>
                . Submitting will update these existing entries.
              </p>
              <label className="overwrite-checkbox-label">
                <input
                  type="checkbox"
                  checked={overwriteExisting}
                  onChange={(e) => setOverwriteExisting(e.target.checked)}
                />
                <span>Confirm: update and overwrite existing daily records for these dates</span>
              </label>
            </div>
          </div>
        )}

        {/* Table / Row Form Container */}
        <div className="bulk-table-container">
          <table className="bulk-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>#</th>
                <th style={{ width: '190px' }}>Date *</th>
                <th style={{ width: '150px' }} className="th-num">Actual Spend (₹) *</th>
                <th style={{ width: '150px' }} className="th-num">Actual Revenue (₹) *</th>
                <th style={{ width: '110px' }} className="th-num">Daily ROAS</th>
                <th>Notes (Optional)</th>
                <th style={{ width: '50px' }} className="th-action"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const dateError = errors[`${row.id}_date`];
                const spendError = errors[`${row.id}_actualSpend`];
                const revError = errors[`${row.id}_actualRevenue`];
                const existing = row.date ? existingEntriesMap.get(row.date) : null;
                const isConflict = Boolean(existing);
                const isBatchDuplicate = batchDuplicateDates.has(row.date);

                const spendNum = Number(row.actualSpend);
                const revNum = Number(row.actualRevenue);
                const hasSpend = !isNaN(spendNum) && spendNum > 0;
                const hasRev = !isNaN(revNum) && revNum >= 0;
                const rowRoas = hasSpend && hasRev ? revNum / spendNum : 0;

                return (
                  <tr
                    key={row.id}
                    className={`bulk-row ${isConflict ? 'is-conflict' : ''} ${
                      isBatchDuplicate ? 'is-duplicate' : ''
                    }`}
                  >
                    {/* Index */}
                    <td className="row-index">{index + 1}</td>

                    {/* Date */}
                    <td className="date-cell">
                      <input
                        type="date"
                        className={`bulk-input ${dateError ? 'has-error' : ''}`}
                        value={row.date}
                        min={minDate}
                        max={maxDate}
                        onChange={(e) => handleRowChange(row.id, 'date', e.target.value)}
                        required
                      />
                      {dateError && <span className="field-error-msg">{dateError}</span>}
                      {isConflict && !dateError && (
                        <div className="conflict-badge" title="Entry already exists in database">
                          Existing: {formatCurrency(existing.actualSpend)} / {formatCurrency(existing.actualRevenue)}
                        </div>
                      )}
                    </td>

                    {/* Spend */}
                    <td className="num-cell">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0"
                        className={`bulk-input num-input ${spendError ? 'has-error' : ''}`}
                        value={row.actualSpend}
                        onChange={(e) => handleRowChange(row.id, 'actualSpend', e.target.value)}
                        required
                      />
                      {spendError && <span className="field-error-msg">{spendError}</span>}
                    </td>

                    {/* Revenue */}
                    <td className="num-cell">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0"
                        className={`bulk-input num-input ${revError ? 'has-error' : ''}`}
                        value={row.actualRevenue}
                        onChange={(e) => handleRowChange(row.id, 'actualRevenue', e.target.value)}
                        required
                      />
                      {revError && <span className="field-error-msg">{revError}</span>}
                    </td>

                    {/* ROAS Preview */}
                    <td className="roas-cell">
                      <span className={`roas-badge ${hasSpend ? 'has-value' : 'empty'}`}>
                        {hasSpend ? formatROAS(rowRoas) : '—'}
                      </span>
                    </td>

                    {/* Notes */}
                    <td className="notes-cell">
                      <input
                        type="text"
                        placeholder="e.g. Campaign scaling, platform lag"
                        className="bulk-input text-input"
                        value={row.notes}
                        onChange={(e) => handleRowChange(row.id, 'notes', e.target.value)}
                      />
                    </td>

                    {/* Delete Action */}
                    <td className="action-cell">
                      <button
                        type="button"
                        className="btn-remove-row"
                        onClick={() => handleRemoveRow(row.id)}
                        disabled={rows.length <= 1}
                        title={rows.length <= 1 ? 'At least one row required' : 'Remove day'}
                        aria-label="Remove row"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Row Form Actions & Summary Bar */}
        <div className="bulk-toolbar-row">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={<Plus size={14} />}
            onClick={handleAddRow}
          >
            Add Another Day
          </Button>

          {/* Running Batch Summary */}
          <div className="batch-summary-strip">
            <span className="summary-item">
              <span className="label">Days:</span>
              <strong>{rows.length}</strong>
            </span>
            <span className="summary-divider">•</span>
            <span className="summary-item">
              <span className="label">Batch Spend:</span>
              <strong>{formatCurrency(summary.totalSpend)}</strong>
            </span>
            <span className="summary-divider">•</span>
            <span className="summary-item">
              <span className="label">Batch Revenue:</span>
              <strong>{formatCurrency(summary.totalRevenue)}</strong>
            </span>
            <span className="summary-divider">•</span>
            <span className="summary-item highlight">
              <span className="label">Blended ROAS:</span>
              <strong>{formatROAS(summary.blendedRoas)}</strong>
            </span>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="bulk-modal-footer">
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={isSubmitting || rows.length === 0}
          >
            {isSubmitting ? 'Saving All Entries...' : `Save All Entries (${rows.length})`}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
