import React, { useState, useEffect, useMemo } from 'react';
import { formatDateTime, formatDate, formatTime, toInputDateTimeLocalFormat } from '../../../utils/dateUtils';
import { Button } from '../../../components/common/Button';
import { AlertCircle } from 'lucide-react';
import './EditAssignmentModal.scss';

const STAGE_OPTIONS = [
  { value: 'PENDING_LAUNCH', label: '1. Pending Launch (MB)' },
  { value: 'LAUNCHED', label: '2. Launched / In Observation' },
  { value: 'PENDING_REPORT', label: '3. Pending 72h Report (MB)' },
  { value: 'REPORT_SUBMITTED', label: '4. Report Submitted / In Analysis (CS)' },
  { value: 'LEARNINGS_SUBMITTED', label: '5. Learnings Ready / Brief Pending (GD)' },
  { value: 'BRIEF_SUBMITTED', label: '6. Brief Submitted / In Review (CS)' },
  { value: 'BRIEF_APPROVED', label: '7. Brief Approved (Production Ready)' },
  { value: 'PRODUCTION', label: '8. In Production (GD)' },
  { value: 'INTERNAL_REVIEW', label: '9. Internal Review (CS)' },
  { value: 'CLIENT_REVIEW', label: '10. Final Approver Review (Abhishek Sir)' },
  { value: 'CLIENT_APPROVED', label: '11. Approved / Ready for Launch' },
  { value: 'READY_TO_LAUNCH', label: '11. Ready to Launch (MB)' },
  { value: 'REVISION_REQUESTED', label: 'Revision Requested' },
  { value: 'PAUSED', label: 'Paused' }
];

export const EditAssignmentModal = ({
  isOpen,
  onClose,
  record,
  allUsers = [],
  onSubmit
}) => {
  if (!isOpen || !record) return null;

  // Identify who the current owner is based on the stage
  const getCurrentOwnerUser = () => {
    if (['PENDING_LAUNCH', 'LAUNCHED', 'PENDING_REPORT', 'CLIENT_APPROVED', 'READY_TO_LAUNCH', 'HANDOFF'].includes(record.status)) {
      return record.assignedMediaBuyer || null;
    }
    if (['REPORT_SUBMITTED', 'BRIEF_SUBMITTED', 'INTERNAL_REVIEW'].includes(record.status)) {
      return record.assignedCreativeStrategist || null;
    }
    if (['LEARNINGS_SUBMITTED', 'PRODUCTION', 'REVISION_REQUESTED'].includes(record.status)) {
      return record.assignedGraphicDesigner || null;
    }
    return record.assignedTo || record.assignedMediaBuyer || null;
  };

  const currentOwnerObj = getCurrentOwnerUser();
  const currentOwnerId = currentOwnerObj?._id || currentOwnerObj || '';
  const currentOwnerName = currentOwnerObj?.name || 'UNASSIGNED';

  // Form State
  const [selectedStage, setSelectedStage] = useState(record.status || 'PENDING_LAUNCH');
  const [selectedOwnerId, setSelectedOwnerId] = useState(currentOwnerId);
  const [showRoleBreakdown, setShowRoleBreakdown] = useState(false);

  // Role Breakdown State
  const [mediaBuyerId, setMediaBuyerId] = useState(record.assignedMediaBuyer?._id || record.assignedMediaBuyer || '');
  const [creativeStrategistId, setCreativeStrategistId] = useState(record.assignedCreativeStrategist?._id || record.assignedCreativeStrategist || '');
  const [graphicDesignerId, setGraphicDesignerId] = useState(record.assignedGraphicDesigner?._id || record.assignedGraphicDesigner || '');
  const [assignedToId, setAssignedToId] = useState(record.assignedTo?._id || record.assignedTo || '');

  // Scheduling State
  const existingLaunchDate = record.launchedAt || record.launchDate;
  const [launchDateTimeStr, setLaunchDateTimeStr] = useState(
    existingLaunchDate ? toInputDateTimeLocalFormat(existingLaunchDate) : ''
  );
  const [isUnscheduled, setIsUnscheduled] = useState(!existingLaunchDate);

  // Scheduling Mode: 'DURATION' | 'CUSTOM_DUE_DATE'
  const [schedulingMode, setSchedulingMode] = useState(record.schedulingMode || 'DURATION');

  // Duration State
  const initialDuration = record.observationDurationHours != null ? Number(record.observationDurationHours) : 72;
  const [durationPreset, setDurationPreset] = useState(
    initialDuration === 72 ? '72' : initialDuration === 48 ? '48' : initialDuration === 24 ? '24' : 'custom'
  );

  const initialDays = Math.floor(initialDuration / 24);
  const initialHours = Math.floor(initialDuration % 24);
  const initialMinutes = Math.round((initialDuration - Math.floor(initialDuration)) * 60);

  const [customDays, setCustomDays] = useState(initialDays);
  const [customHours, setCustomHours] = useState(initialHours);
  const [customMinutes, setCustomMinutes] = useState(initialMinutes);

  // Custom Due Date/Time State
  const [customDueDateTimeStr, setCustomDueDateTimeStr] = useState(
    record.reportDueAt ? toInputDateTimeLocalFormat(record.reportDueAt) : ''
  );

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Sync state if record changes
  useEffect(() => {
    setSelectedStage(record.status || 'PENDING_LAUNCH');
    const owner = getCurrentOwnerUser();
    setSelectedOwnerId(owner?._id || owner || '');
    setMediaBuyerId(record.assignedMediaBuyer?._id || record.assignedMediaBuyer || '');
    setCreativeStrategistId(record.assignedCreativeStrategist?._id || record.assignedCreativeStrategist || '');
    setGraphicDesignerId(record.assignedGraphicDesigner?._id || record.assignedGraphicDesigner || '');
    setAssignedToId(record.assignedTo?._id || record.assignedTo || '');

    const lDate = record.launchedAt || record.launchDate;
    setLaunchDateTimeStr(lDate ? toInputDateTimeLocalFormat(lDate) : '');
    setIsUnscheduled(!lDate);
    setSchedulingMode(record.schedulingMode || 'DURATION');

    const dur = record.observationDurationHours != null ? Number(record.observationDurationHours) : 72;
    setDurationPreset(dur === 72 ? '72' : dur === 48 ? '48' : dur === 24 ? '24' : 'custom');
    setCustomDays(Math.floor(dur / 24));
    setCustomHours(Math.floor(dur % 24));
    setCustomMinutes(Math.round((dur - Math.floor(dur)) * 60));

    setCustomDueDateTimeStr(record.reportDueAt ? toInputDateTimeLocalFormat(record.reportDueAt) : '');
    setErrorMessage('');
  }, [record]);

  // Compute effective observation duration hours
  const effectiveDurationHours = useMemo(() => {
    if (schedulingMode === 'CUSTOM_DUE_DATE') {
      if (!launchDateTimeStr || !customDueDateTimeStr) return 72;
      const lMs = new Date(launchDateTimeStr).getTime();
      const dMs = new Date(customDueDateTimeStr).getTime();
      if (isNaN(lMs) || isNaN(dMs) || dMs <= lMs) return 72;
      return (dMs - lMs) / (1000 * 60 * 60);
    }

    if (durationPreset === '72') return 72;
    if (durationPreset === '48') return 48;
    if (durationPreset === '24') return 24;

    const days = Math.max(0, Number(customDays) || 0);
    const hours = Math.max(0, Number(customHours) || 0);
    const mins = Math.max(0, Number(customMinutes) || 0);
    const total = days * 24 + hours + mins / 60;
    return total > 0 ? total : 72;
  }, [schedulingMode, durationPreset, customDays, customHours, customMinutes, launchDateTimeStr, customDueDateTimeStr]);

  // Calculated Report Due Time Preview
  const calculatedDueDateTimePreview = useMemo(() => {
    if (isUnscheduled || !launchDateTimeStr) return null;
    const lDate = new Date(launchDateTimeStr);
    if (isNaN(lDate.getTime())) return null;

    if (schedulingMode === 'CUSTOM_DUE_DATE') {
      if (!customDueDateTimeStr) return null;
      const cDate = new Date(customDueDateTimeStr);
      return isNaN(cDate.getTime()) ? null : cDate;
    }

    return new Date(lDate.getTime() + effectiveDurationHours * 3600 * 1000);
  }, [isUnscheduled, launchDateTimeStr, schedulingMode, customDueDateTimeStr, effectiveDurationHours]);

  // Handler when "Current Owner" selection changes
  const handleCurrentOwnerChange = (newUserId) => {
    setSelectedOwnerId(newUserId);
    // Auto-sync into the stage-specific role
    if (['PENDING_LAUNCH', 'LAUNCHED', 'PENDING_REPORT', 'CLIENT_APPROVED', 'READY_TO_LAUNCH', 'HANDOFF'].includes(selectedStage)) {
      setMediaBuyerId(newUserId);
    } else if (['REPORT_SUBMITTED', 'BRIEF_SUBMITTED', 'INTERNAL_REVIEW'].includes(selectedStage)) {
      setCreativeStrategistId(newUserId);
    } else if (['LEARNINGS_SUBMITTED', 'PRODUCTION', 'REVISION_REQUESTED'].includes(selectedStage)) {
      setGraphicDesignerId(newUserId);
    }
    setAssignedToId(newUserId);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    try {
      setIsSubmitting(true);

      const payload = {};

      // Stage / Status
      if (selectedStage && selectedStage !== record.status) {
        payload.status = selectedStage;
      }

      // Role assignments
      payload.assignedMediaBuyer = mediaBuyerId ? mediaBuyerId : null;
      payload.assignedCreativeStrategist = creativeStrategistId ? creativeStrategistId : null;
      payload.assignedGraphicDesigner = graphicDesignerId ? graphicDesignerId : null;
      payload.assignedTo = assignedToId ? assignedToId : null;

      // Scheduling
      if (isUnscheduled) {
        payload.launchDate = null;
        payload.reportDueAt = null;
        payload.observationDurationHours = effectiveDurationHours;
        payload.schedulingMode = schedulingMode;
      } else {
        if (!launchDateTimeStr) {
          throw new Error('Please select a valid launch date and time or check "Leave Unscheduled".');
        }

        const launchDateObj = new Date(launchDateTimeStr);
        if (isNaN(launchDateObj.getTime())) {
          throw new Error('Invalid launch date/time specified.');
        }

        payload.launchDate = launchDateObj.toISOString();
        payload.schedulingMode = schedulingMode;

        if (schedulingMode === 'CUSTOM_DUE_DATE') {
          if (!customDueDateTimeStr) {
            throw new Error('Please select a custom report due date and time.');
          }
          const customDueDateObj = new Date(customDueDateTimeStr);
          if (isNaN(customDueDateObj.getTime())) {
            throw new Error('Invalid custom report due date/time specified.');
          }
          if (customDueDateObj.getTime() <= launchDateObj.getTime()) {
            throw new Error('Report due date and time must be AFTER the launch date and time.');
          }
          payload.reportDueAt = customDueDateObj.toISOString();
          payload.observationDurationHours = Number(effectiveDurationHours.toFixed(2));
        } else {
          payload.observationDurationHours = Number(effectiveDurationHours.toFixed(2));
          const calculatedDue = new Date(launchDateObj.getTime() + effectiveDurationHours * 3600 * 1000);
          payload.reportDueAt = calculatedDue.toISOString();
        }
      }

      await onSubmit(record._id, payload);
      onClose();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update assignment and schedule');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container edit-assignment-modal" onClick={(e) => e.stopPropagation()}>
        {/* MODAL HEADER */}
        <div className="modal-header">
          <div>
            <h3 className="modal-title">Edit Assignment & Schedule</h3>
            <p className="modal-subtitle">
              {record.client?.name || 'Client'} &bull; {record.creativeName || record.creativesProposed || 'Creative'} &bull; {record.currentTestingCycle || `Cycle ${record.cycleNumber || 1}`}
            </p>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            &times;
          </button>
        </div>

        {/* MODAL BODY */}
        <form onSubmit={handleSave} className="modal-body">
          {errorMessage && (
            <div className="edit-error-banner">
              <AlertCircle size={14} style={{ marginRight: '6px' }} /> {errorMessage}
            </div>
          )}

          {/* SECTION 1: WORKFLOW STAGE */}
          <div className="form-section-card">
            <div className="section-header">
              <span className="section-badge">Stage</span>
              <span className="section-title">Current Workflow Stage</span>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="stage-select">Current Stage / Status</label>
              <select
                id="stage-select"
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value)}
                className="modal-select"
              >
                {STAGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* SECTION 2: ASSIGNMENT */}
          <div className="form-section-card">
            <div className="section-header">
              <span className="section-badge">Team</span>
              <span className="section-title">Assignment Management</span>
            </div>

            {/* Current Owner Display */}
            <div className="current-owner-preview">
              <div className="owner-label">Current Stage Owner:</div>
              <div className="owner-value-box">
                <span className={`owner-name ${currentOwnerName === 'UNASSIGNED' ? 'unassigned' : ''}`}>
                  {currentOwnerName}
                </span>
                {currentOwnerObj?.role === 'admin' && (
                  <span className="admin-chip">Admin Assigned</span>
                )}
                {currentOwnerObj?.teamRole && (
                  <span className="role-chip">{currentOwnerObj.teamRole.replace(/_/g, ' ')}</span>
                )}
              </div>
            </div>

            {/* New Owner Selector */}
            <div className="form-group">
              <label htmlFor="owner-select">
                New Owner (Reassign / Assign Self):
              </label>
              <select
                id="owner-select"
                value={selectedOwnerId}
                onChange={(e) => handleCurrentOwnerChange(e.target.value)}
                className="modal-select"
              >
                <option value="">-- UNASSIGNED --</option>
                <optgroup label="Admins (Self-Assignment Allowed)">
                  {allUsers
                    .filter((u) => u.role === 'admin')
                    .map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name} (Admin / Final Approver)
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Team Members">
                  {allUsers
                    .filter((u) => u.role !== 'admin')
                    .map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name} ({u.teamRole ? u.teamRole.replace(/_/g, ' ') : u.role})
                      </option>
                    ))}
                </optgroup>
              </select>
              <span className="field-hint">
                Admin can assign themselves or any team member without role restriction.
              </span>
            </div>

            {/* Expandable Specific Roles */}
            <div className="specific-roles-toggle">
              <button
                type="button"
                className="toggle-link"
                onClick={() => setShowRoleBreakdown(!showRoleBreakdown)}
              >
                {showRoleBreakdown ? '▼ Hide Specific Role Assignments' : '▶ Advanced: Edit Individual Role Breakdown'}
              </button>
            </div>

            {showRoleBreakdown && (
              <div className="specific-roles-grid">
                <div className="form-group">
                  <label htmlFor="mb-select">Media Buyer (Launch & 72h Report)</label>
                  <select
                    id="mb-select"
                    value={mediaBuyerId}
                    onChange={(e) => setMediaBuyerId(e.target.value)}
                    className="modal-select"
                  >
                    <option value="">-- Unassigned --</option>
                    {allUsers.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name} {u.role === 'admin' ? '(Admin)' : `(${u.teamRole || u.role})`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="cs-select">Creative Strategist (Analysis & Review)</label>
                  <select
                    id="cs-select"
                    value={creativeStrategistId}
                    onChange={(e) => setCreativeStrategistId(e.target.value)}
                    className="modal-select"
                  >
                    <option value="">-- Unassigned --</option>
                    {allUsers.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name} {u.role === 'admin' ? '(Admin)' : `(${u.teamRole || u.role})`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="gd-select">Graphic Designer (Brief & Production)</label>
                  <select
                    id="gd-select"
                    value={graphicDesignerId}
                    onChange={(e) => setGraphicDesignerId(e.target.value)}
                    className="modal-select"
                  >
                    <option value="">-- Unassigned --</option>
                    {allUsers.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name} {u.role === 'admin' ? '(Admin)' : `(${u.teamRole || u.role})`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="overall-select">Assigned To (Overall Task Lead)</label>
                  <select
                    id="overall-select"
                    value={assignedToId}
                    onChange={(e) => setAssignedToId(e.target.value)}
                    className="modal-select"
                  >
                    <option value="">-- Unassigned --</option>
                    {allUsers.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name} {u.role === 'admin' ? '(Admin)' : `(${u.teamRole || u.role})`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 3: SCHEDULE & OBSERVATION DURATION */}
          <div className="form-section-card">
            <div className="section-header">
              <span className="section-badge">Schedule</span>
              <span className="section-title">Schedule & Observation Period</span>
            </div>

            {/* Launch Timing */}
            <div className="form-group">
              <div className="launch-header-row">
                <label htmlFor="launch-time-input">Launch Date & Time:</label>
                <div className="checkbox-wrap">
                  <input
                    type="checkbox"
                    id="unscheduled-checkbox"
                    checked={isUnscheduled}
                    onChange={(e) => {
                      setIsUnscheduled(e.target.checked);
                      if (e.target.checked) {
                        setLaunchDateTimeStr('');
                      } else {
                        setLaunchDateTimeStr(toInputDateTimeLocalFormat(new Date()));
                      }
                    }}
                  />
                  <label htmlFor="unscheduled-checkbox">Leave Unscheduled</label>
                </div>
              </div>

              {!isUnscheduled && (
                <div className="datetime-input-row">
                  <input
                    id="launch-time-input"
                    type="datetime-local"
                    value={launchDateTimeStr}
                    onChange={(e) => setLaunchDateTimeStr(e.target.value)}
                    className="modal-input"
                  />
                  <button
                    type="button"
                    className="quick-now-btn"
                    onClick={() => setLaunchDateTimeStr(toInputDateTimeLocalFormat(new Date()))}
                  >
                    Now
                  </button>
                </div>
              )}
            </div>

            {/* Scheduling Mode Toggle */}
            <div className="form-group">
              <label>Scheduling Mode:</label>
              <div className="mode-toggle-group">
                <button
                  type="button"
                  className={`mode-btn ${schedulingMode === 'DURATION' ? 'active' : ''}`}
                  onClick={() => setSchedulingMode('DURATION')}
                >
                  Standard Duration
                </button>
                <button
                  type="button"
                  className={`mode-btn ${schedulingMode === 'CUSTOM_DUE_DATE' ? 'active' : ''}`}
                  onClick={() => setSchedulingMode('CUSTOM_DUE_DATE')}
                >
                  Custom Due Date & Time
                </button>
              </div>
            </div>

            {/* MODE A: STANDARD DURATION */}
            {schedulingMode === 'DURATION' && (
              <div className="duration-settings-wrap">
                <label>Observation Duration:</label>
                <div className="preset-buttons-row">
                  <button
                    type="button"
                    className={`preset-btn ${durationPreset === '72' ? 'active' : ''}`}
                    onClick={() => setDurationPreset('72')}
                  >
                    72 Hours (Default)
                  </button>
                  <button
                    type="button"
                    className={`preset-btn ${durationPreset === '48' ? 'active' : ''}`}
                    onClick={() => setDurationPreset('48')}
                  >
                    48 Hours
                  </button>
                  <button
                    type="button"
                    className={`preset-btn ${durationPreset === '24' ? 'active' : ''}`}
                    onClick={() => setDurationPreset('24')}
                  >
                    24 Hours
                  </button>
                  <button
                    type="button"
                    className={`preset-btn ${durationPreset === 'custom' ? 'active' : ''}`}
                    onClick={() => setDurationPreset('custom')}
                  >
                    Custom
                  </button>
                </div>

                {durationPreset === 'custom' && (
                  <div className="custom-duration-inputs">
                    <div className="duration-field">
                      <label htmlFor="duration-days">Days</label>
                      <input
                        id="duration-days"
                        type="number"
                        min="0"
                        value={customDays}
                        onChange={(e) => setCustomDays(e.target.value)}
                        className="duration-num-input"
                      />
                    </div>
                    <div className="duration-field">
                      <label htmlFor="duration-hours">Hours</label>
                      <input
                        id="duration-hours"
                        type="number"
                        min="0"
                        max="23"
                        value={customHours}
                        onChange={(e) => setCustomHours(e.target.value)}
                        className="duration-num-input"
                      />
                    </div>
                    <div className="duration-field">
                      <label htmlFor="duration-mins">Minutes</label>
                      <input
                        id="duration-mins"
                        type="number"
                        min="0"
                        max="59"
                        value={customMinutes}
                        onChange={(e) => setCustomMinutes(e.target.value)}
                        className="duration-num-input"
                      />
                    </div>
                    <div className="duration-summary-pill">
                      Total: <strong>{effectiveDurationHours} hrs</strong>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* MODE B: CUSTOM DUE DATE & TIME */}
            {schedulingMode === 'CUSTOM_DUE_DATE' && (
              <div className="custom-due-date-wrap">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="custom-due-input">Report Due Date & Time:</label>
                  <input
                    id="custom-due-input"
                    type="datetime-local"
                    value={customDueDateTimeStr}
                    onChange={(e) => setCustomDueDateTimeStr(e.target.value)}
                    className="modal-input"
                  />
                  {launchDateTimeStr && customDueDateTimeStr && (
                    new Date(customDueDateTimeStr).getTime() <= new Date(launchDateTimeStr).getTime() ? (
                      <span className="date-error-text">
                        Report due time must be AFTER launch date and time.
                      </span>
                    ) : (
                      <span className="date-info-text">
                        Observation Period: {effectiveDurationHours.toFixed(1)} hours
                      </span>
                    )
                  )}
                </div>
              </div>
            )}

            {/* SCHEDULE PREVIEW BOX */}
            <div className="schedule-preview-box">
              <div className="preview-row">
                <span className="preview-label">Launch:</span>
                <span className="preview-value">
                  {isUnscheduled || !launchDateTimeStr ? (
                    <span className="unscheduled-pill">UNSCHEDULED</span>
                  ) : (
                    formatDateTime(launchDateTimeStr)
                  )}
                </span>
              </div>
              <div className="preview-row">
                <span className="preview-label">
                  {effectiveDurationHours === 72 ? '72-Hour Report Due:' : `Report Due (${effectiveDurationHours}h):`}
                </span>
                <span className="preview-value">
                  {isUnscheduled || !calculatedDueDateTimePreview ? (
                    <span className="unscheduled-pill">UNSCHEDULED</span>
                  ) : (
                    <strong>{formatDateTime(calculatedDueDateTimePreview)}</strong>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* MODAL FOOTER */}
          <div className="modal-footer">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
