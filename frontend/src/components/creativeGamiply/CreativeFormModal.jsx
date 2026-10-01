import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
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
    clientName: '',
    adName: '',
    roas: '',
    purchases: '',
    status: CREATIVE_STATUSES.IDEA
  });

  const [formErrors, setFormErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData({
        clientName: initialData.clientName || '',
        adName: initialData.adName || '',
        roas: initialData.roas !== undefined && initialData.roas !== null ? String(initialData.roas) : '',
        purchases: initialData.purchases !== undefined && initialData.purchases !== null ? String(initialData.purchases) : '',
        status: initialData.status || CREATIVE_STATUSES.IDEA
      });
    } else {
      setFormData({
        clientName: '',
        adName: '',
        roas: '',
        purchases: '',
        status: CREATIVE_STATUSES.IDEA
      });
    }
    setFormErrors({});
    setErrorMessage('');
  }, [initialData, isOpen]);

  // Client-side score preview estimation
  const numRoas = parseFloat(formData.roas);
  const numPurchases = parseInt(formData.purchases, 10);

  const safeRoas = !isNaN(numRoas) && numRoas >= 0 ? numRoas : 0;
  const safePurchases = !isNaN(numPurchases) && numPurchases >= 0 ? numPurchases : 0;

  const previewRoasPoints = Math.round(safeRoas * 10 * 100) / 100;
  const previewPurchasePoints = Math.round(safePurchases * 10);
  const previewTotalPoints = Math.round((previewRoasPoints + previewPurchasePoints) * 100) / 100;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const errors = {};
    if (!formData.clientName.trim()) {
      errors.clientName = 'Client name is required';
    }
    if (!formData.adName.trim()) {
      errors.adName = 'Ad name is required';
    }
    if (formData.roas === '' || formData.roas === null || formData.roas === undefined) {
      errors.roas = 'ROAS is required';
    } else if (isNaN(Number(formData.roas)) || Number(formData.roas) < 0) {
      errors.roas = 'ROAS must be a non-negative number';
    }

    if (formData.purchases === '' || formData.purchases === null || formData.purchases === undefined) {
      errors.purchases = 'Purchases is required';
    } else if (isNaN(Number(formData.purchases)) || Number(formData.purchases) < 0 || !Number.isInteger(Number(formData.purchases))) {
      errors.purchases = 'Purchases must be a non-negative integer';
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
      await onSubmit({
        clientName: formData.clientName.trim(),
        adName: formData.adName.trim(),
        roas: Number(formData.roas),
        purchases: Number(formData.purchases),
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
            <span className="error-icon">⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="form-grid">
          {/* Client Name */}
          <Input
            id="clientName"
            name="clientName"
            label="Client Name"
            placeholder="e.g. Acme Corp"
            value={formData.clientName}
            onChange={handleChange}
            error={formErrors.clientName}
            required
          />

          {/* Ad Name */}
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

          {/* ROAS */}
          <Input
            id="roas"
            name="roas"
            type="number"
            step="0.01"
            min="0"
            label="ROAS (Return on Ad Spend)"
            placeholder="e.g. 4.25"
            value={formData.roas}
            onChange={handleChange}
            error={formErrors.roas}
            helperText="Points formula: ROAS × 10"
            required
          />

          {/* Purchases */}
          <Input
            id="purchases"
            name="purchases"
            type="number"
            step="1"
            min="0"
            label="Purchases (Conversions)"
            placeholder="e.g. 50"
            value={formData.purchases}
            onChange={handleChange}
            error={formErrors.purchases}
            helperText="Points formula: Purchases × 10"
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
              Winner is manually selected. Score does not automatically alter status.
            </span>
          </div>
        </div>

        {/* Live Score Preview Box */}
        <div className="score-preview-box">
          <div className="preview-header">
            <span className="preview-title">Estimated Score Preview</span>
            <span className="preview-badge">Server Authoritative</span>
          </div>

          <div className="score-breakdown-row">
            <div className="score-item">
              <span className="score-label">ROAS Points</span>
              <span className="score-calc">{safeRoas} × 10</span>
              <span className="score-val">+{previewRoasPoints} pts</span>
            </div>

            <div className="plus-sign">+</div>

            <div className="score-item">
              <span className="score-label">Purchase Points</span>
              <span className="score-calc">{safePurchases} × 10</span>
              <span className="score-val">+{previewPurchasePoints} pts</span>
            </div>

            <div className="equals-sign">=</div>

            <div className="score-item total-item">
              <span className="score-label">Total Score</span>
              <span className="score-calc">Combined</span>
              <span className="score-val total-val">+{previewTotalPoints} pts</span>
            </div>
          </div>

          <p className="preview-disclaimer">
            Final scoring is computed and verified by the server upon submission.
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
