import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { ClientSelect } from '../common/ClientSelect';
import { AlertCircle } from 'lucide-react';
import { CREATIVE_STATUSES, CREATIVE_STATUS_CONFIG } from '../../constants/creative.constants';
import './CreativeFormModal.scss';

export const CreativeFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  isSubmitting = false
}) => {
  const isEdit = Boolean(initialData?._id);

  const [formData, setFormData] = useState({
    clientId: null,
    clientName: '',
    baselineROAS: 0,
    previousROAS: 0,
    adName: '',
    roas: '',
    status: CREATIVE_STATUSES.IDEA
  });

  const [formErrors, setFormErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (initialData) {
      const baseRoas = initialData.baselineROAS ?? initialData.previousROAS ?? initialData.clientId?.baselineROAS ?? 0;
      setFormData({
        clientId: initialData.clientId?._id || initialData.clientId || null,
        clientName: initialData.clientName || initialData.clientId?.clientName || initialData.clientId?.name || '',
        baselineROAS: baseRoas,
        previousROAS: baseRoas,
        adName: initialData.adName || '',
        roas: initialData.roas !== undefined && initialData.roas !== null ? String(initialData.roas) : '',
        status: initialData.status || CREATIVE_STATUSES.IDEA
      });
    } else {
      setFormData({
        clientId: null,
        clientName: '',
        baselineROAS: 0,
        previousROAS: 0,
        adName: '',
        roas: '',
        status: CREATIVE_STATUSES.IDEA
      });
    }
    setFormErrors({});
    setErrorMessage('');
  }, [initialData, isOpen]);

  // Client-side score preview estimation based on Baseline ROAS
  const numRoas = parseFloat(formData.roas);
  const safeRoas = !isNaN(numRoas) && numRoas >= 0 ? numRoas : 0;
  const safeBaseline = Number(formData.baselineROAS ?? formData.previousROAS) || 0;

  const isImproved = safeRoas > safeBaseline;
  const previewTotalPoints = isImproved ? 1 : 0;

  const handleClientChange = (selected) => {
    const base = selected.baselineROAS ?? 0;
    setFormData((prev) => ({
      ...prev,
      clientId: selected.clientId,
      clientName: selected.clientName,
      baselineROAS: base,
      previousROAS: base
    }));
    if (formErrors.clientName) {
      setFormErrors((prev) => ({ ...prev, clientName: '' }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const errors = {};
    if (!formData.clientName.trim() && !formData.clientId) {
      errors.clientName = 'Please select a client';
    }
    if (!formData.adName.trim()) {
      errors.adName = 'Ad name is required';
    }
    if (formData.roas === '' || formData.roas === null || formData.roas === undefined) {
      errors.roas = 'ROAS is required';
    } else if (isNaN(Number(formData.roas)) || Number(formData.roas) < 0) {
      errors.roas = 'ROAS must be a non-negative number';
    }

    if (!formData.status || !Object.values(CREATIVE_STATUSES).includes(formData.status)) {
      errors.status = 'Valid status is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!validate()) return;

    try {
      const base = Number(formData.baselineROAS ?? formData.previousROAS) || 0;
      await onSubmit({
        clientId: formData.clientId || undefined,
        clientName: formData.clientName.trim(),
        adName: formData.adName.trim(),
        roas: Number(formData.roas),
        baselineROAS: base,
        previousROAS: base,
        status: formData.status
      });
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to save creative performance';
      setErrorMessage(msg);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Creative Performance' : 'New Creative Performance'}
      size="md"
      className="creative-form-modal"
    >
      <form onSubmit={handleSubmit} className="creative-form">
        {errorMessage && (
          <div className="form-error-banner" role="alert">
            <AlertCircle size={14} className="error-icon" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="form-grid">
          {/* Shared Searchable Client Dropdown */}
          <div className="full-width">
            <ClientSelect
              value={formData.clientId || formData.clientName}
              onChange={handleClientChange}
              error={formErrors.clientName}
              label="Client"
              required
              placeholder="Search and select client from central directory..."
            />
          </div>

          {/* Ad Name */}
          <div className="full-width">
            <Input
              id="adName"
              name="adName"
              label="Ad Name"
              placeholder="e.g. Summer Sale - Reel V3"
              value={formData.adName}
              onChange={handleChange}
              error={formErrors.adName}
              required
            />
          </div>

          {/* ROAS */}
          <Input
            id="roas"
            name="roas"
            type="number"
            step="0.01"
            min="0"
            label="Creative ROAS"
            placeholder="e.g. 5.0"
            value={formData.roas}
            onChange={handleChange}
            error={formErrors.roas}
            helperText={`Client Baseline ROAS: ${safeBaseline}x`}
            required
          />

          {/* Status Dropdown */}
          <div className="input-group">
            <label htmlFor="creative-status-select" className="input-label">
              Status <span className="required-asterisk">*</span>
            </label>
            <select
              id="creative-status-select"
              name="status"
              className={`input-field select-field ${formErrors.status ? 'input-error' : ''}`}
              value={formData.status}
              onChange={handleChange}
            >
              {Object.values(CREATIVE_STATUSES).map((st) => (
                <option key={st} value={st}>
                  {CREATIVE_STATUS_CONFIG[st]?.label || st}
                </option>
              ))}
            </select>
            {formErrors.status && <span className="input-error-message">{formErrors.status}</span>}
            <span className="input-helper-text">
              Winner is manually selected. Status does not change automatically based on the score.
            </span>
          </div>
        </div>

        {/* Live Score Preview Box */}
        <div className="score-preview-box">
          <div className="preview-header">
            <span className="preview-title">Baseline ROAS Scoring</span>
            <span className="preview-badge">Server Authoritative</span>
          </div>

          <div className="score-breakdown-row">
            <div className="score-item">
              <span className="score-label">Creative ROAS</span>
              <span className="score-calc">{safeRoas > 0 ? `${safeRoas}x` : '—'}</span>
              <span className="score-val">Recorded</span>
            </div>

            <div className="minus-sign">vs</div>

            <div className="score-item">
              <span className="score-label">Baseline ROAS</span>
              <span className="score-calc">{safeBaseline}x</span>
              <span className="score-val">Baseline</span>
            </div>

            <div className="equals-sign">=</div>

            <div className="score-item total-item">
              <span className="score-label">Score</span>
              <span className="score-calc">
                {isImproved ? `ROAS > Baseline (+1)` : 'No improvement (0)'}
              </span>
              <span className="score-val total-val">+{previewTotalPoints} pt{previewTotalPoints === 1 ? '' : 's'}</span>
            </div>
          </div>

          <p className="preview-disclaimer">
            Points are awarded strictly for exceeding the client Baseline ROAS (ROAS &gt; Baseline earns exactly +1 point). Status does not affect score.
          </p>
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={isSubmitting}>
            {isEdit ? 'Update Creative' : 'Submit Creative'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
