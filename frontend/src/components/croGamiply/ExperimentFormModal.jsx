import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { CRO_STATUSES, CRO_STATUS_CONFIG } from '../../constants/cro.constants';
import {
  uploadCroScreenshot,
  deleteCroUpload,
  deleteCroExperimentImage
} from '../../api/cro.api';
import { calculateLiveScore } from '../../utils/croScoring';
import { resolveImageUrl } from '../../utils/imageUrl';
import './ExperimentFormModal.scss';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const ExperimentFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  isSubmitting = false
}) => {
  const isEdit = Boolean(initialData?._id);

  const [formData, setFormData] = useState({
    clientName: '',
    hypothesisTitle: '',
    hypothesis: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    status: CRO_STATUSES.IDEA,
    beforeImages: [],
    afterImages: [],
    salesBefore: '',
    salesAfter: '',
    prepaidBefore: '',
    prepaidAfter: '',
    cancellationBefore: '',
    cancellationAfter: ''
  });

  const [errorMessage, setErrorMessage] = useState('');
  const [pendingUploads, setPendingUploads] = useState([]); // items: { id, type, name, status, errorMsg, file, previewUrl }
  const [deletingFileIds, setDeletingFileIds] = useState(new Set()); // set of fileIds currently in deletion transit

  // Track newly uploaded fileIds in this modal session for cleanup on cancel/remove
  const newlyUploadedFileIdsRef = useRef(new Set());

  useEffect(() => {
    newlyUploadedFileIdsRef.current = new Set();
    setDeletingFileIds(new Set());

    if (initialData) {
      setFormData({
        clientName: initialData.clientName || '',
        hypothesisTitle: initialData.hypothesisTitle || '',
        hypothesis: initialData.hypothesis || '',
        startDate: initialData.startDate
          ? new Date(initialData.startDate).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        endDate: initialData.endDate
          ? new Date(initialData.endDate).toISOString().split('T')[0]
          : '',
        status: initialData.status || CRO_STATUSES.IDEA,
        beforeImages: initialData.beforeImages || [],
        afterImages: initialData.afterImages || [],
        salesBefore: initialData.results?.salesBefore ?? '',
        salesAfter: initialData.results?.salesAfter ?? '',
        prepaidBefore: initialData.results?.prepaidBefore ?? '',
        prepaidAfter: initialData.results?.prepaidAfter ?? '',
        cancellationBefore: initialData.results?.cancellationBefore ?? '',
        cancellationAfter: initialData.results?.cancellationAfter ?? ''
      });
    } else {
      setFormData({
        clientName: '',
        hypothesisTitle: '',
        hypothesis: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        status: CRO_STATUSES.IDEA,
        beforeImages: [],
        afterImages: [],
        salesBefore: '',
        salesAfter: '',
        prepaidBefore: '',
        prepaidAfter: '',
        cancellationBefore: '',
        cancellationAfter: ''
      });
    }
    setErrorMessage('');
    setPendingUploads([]);
  }, [initialData, isOpen]);

  // Upload single file execution
  const executeFileUpload = async (uploadItem) => {
    const { id, type, name, file } = uploadItem;

    setPendingUploads((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: 'uploading', errorMsg: '' } : item
      )
    );

    try {
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error(`Failed to read file ${name}`));
        reader.readAsDataURL(file);
      });

      const res = await uploadCroScreenshot(base64Data, name, type);
      const url = res.data?.data?.url || res.data?.url || res.url;
      const fileId = res.data?.data?.fileId || res.data?.fileId || null;

      // Track as newly uploaded in this session for cleanup lifecycle
      if (fileId) {
        newlyUploadedFileIdsRef.current.add(fileId);
      }

      // Add to uploaded images list
      setFormData((prev) => ({
        ...prev,
        [type === 'before' ? 'beforeImages' : 'afterImages']: [
          ...prev[type === 'before' ? 'beforeImages' : 'afterImages'],
          { url, name, fileId }
        ]
      }));

      // Remove from pending list
      setPendingUploads((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || err.message || 'Upload failed';
      setErrorMessage(`Upload failed for "${name}": ${errorMsg}`);
      setPendingUploads((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, status: 'error', errorMsg }
            : item
        )
      );
    }
  };

  // Handle files selection
  const handleImageUpload = (e, type) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newPendingItems = [];

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
        setErrorMessage(`Invalid format for "${file.name}". Supported: JPG, PNG, WEBP, GIF`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        setErrorMessage(`"${file.name}" exceeds the 5MB size limit.`);
        continue;
      }

      const uploadItem = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        name: file.name,
        file,
        previewUrl: URL.createObjectURL(file),
        status: 'uploading',
        errorMsg: ''
      };
      newPendingItems.push(uploadItem);
    }

    if (newPendingItems.length > 0) {
      setPendingUploads((prev) => [...prev, ...newPendingItems]);
      newPendingItems.forEach((item) => executeFileUpload(item));
    }

    e.target.value = '';
  };

  /**
   * Proper deletion lifecycle:
   * A) If unsaved (create mode or unsaved additions in edit): calls deleteCroUpload(fileId) immediately
   * B) If saved in existing experiment: calls deleteCroExperimentImage(expId, fileId) to delete from ImageKit & MongoDB
   * If deletion fails: keeps image in UI, displays clear error
   */
  const removeImage = async (type, index) => {
    const imageList = type === 'before' ? formData.beforeImages : formData.afterImages;
    const target = imageList[index];
    if (!target) return;

    const fileId = target.fileId;

    // Prevent duplicate clicks if already removing
    if (fileId && deletingFileIds.has(fileId)) return;

    // Fallback if no fileId (e.g. legacy/mock local image)
    if (!fileId) {
      setFormData((prev) => ({
        ...prev,
        [type === 'before' ? 'beforeImages' : 'afterImages']: prev[
          type === 'before' ? 'beforeImages' : 'afterImages'
        ].filter((_, i) => i !== index)
      }));
      return;
    }

    // Set individual image deleting state
    setDeletingFileIds((prev) => new Set(prev).add(fileId));
    setErrorMessage('');

    try {
      const isUnsaved = newlyUploadedFileIdsRef.current.has(fileId) || !isEdit;

      if (isUnsaved) {
        // Case A: Unsaved image in create form or unsaved additions in edit form
        await deleteCroUpload(fileId);
        newlyUploadedFileIdsRef.current.delete(fileId);
      } else {
        // Case B: Persisted image in existing experiment
        await deleteCroExperimentImage(initialData._id, fileId);
      }

      // Only on successful deletion: remove from local state
      setFormData((prev) => ({
        ...prev,
        [type === 'before' ? 'beforeImages' : 'afterImages']: prev[
          type === 'before' ? 'beforeImages' : 'afterImages'
        ].filter((_, i) => i !== index)
      }));
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        'Failed to remove image. Please try again.';
      setErrorMessage(`Failed to remove image: ${errorMsg}`);
    } finally {
      setDeletingFileIds((prev) => {
        const next = new Set(prev);
        next.delete(fileId);
        return next;
      });
    }
  };

  const removePendingUpload = (id) => {
    setPendingUploads((prev) => prev.filter((item) => item.id !== id));
  };

  const retryPendingUpload = (item) => {
    setErrorMessage('');
    executeFileUpload(item);
  };

  const isUploadingAny = pendingUploads.some((item) => item.status === 'uploading');
  const isDeletingAny = deletingFileIds.size > 0;

  // Live Score Preview
  const liveScore = calculateLiveScore({
    salesBefore: formData.salesBefore,
    salesAfter: formData.salesAfter,
    prepaidBefore: formData.prepaidBefore,
    prepaidAfter: formData.prepaidAfter,
    cancellationBefore: formData.cancellationBefore,
    cancellationAfter: formData.cancellationAfter
  });

  const handleModalClose = () => {
    // Clean up any unpersisted uploaded files from ImageKit on modal cancel/close
    const unpersistedIds = Array.from(newlyUploadedFileIdsRef.current);
    if (unpersistedIds.length > 0) {
      unpersistedIds.forEach((fileId) => {
        deleteCroUpload(fileId).catch((err) => {
          console.warn(`[Cleanup] Failed to clean up unsaved file ${fileId} on cancel:`, err.message);
        });
      });
      newlyUploadedFileIdsRef.current.clear();
    }
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!formData.clientName.trim()) {
      setErrorMessage('Client name is required.');
      return;
    }
    if (!formData.hypothesisTitle.trim()) {
      setErrorMessage('Hypothesis title is required.');
      return;
    }
    if (!formData.hypothesis.trim()) {
      setErrorMessage('Hypothesis description is required.');
      return;
    }
    if (!formData.startDate) {
      setErrorMessage('Start date is required.');
      return;
    }
    if (formData.endDate && new Date(formData.endDate) < new Date(formData.startDate)) {
      setErrorMessage('End date must be greater than or equal to start date.');
      return;
    }
    if (isUploadingAny) {
      setErrorMessage('Please wait for screenshots to finish uploading before submitting.');
      return;
    }
    if (isDeletingAny) {
      setErrorMessage('Please wait for screenshot removal to complete before submitting.');
      return;
    }

    const payload = {
      clientName: formData.clientName.trim(),
      hypothesisTitle: formData.hypothesisTitle.trim(),
      hypothesis: formData.hypothesis.trim(),
      startDate: formData.startDate ? String(formData.startDate).trim() : '',
      endDate: formData.endDate && String(formData.endDate).trim() ? String(formData.endDate).trim() : null,
      status: formData.status,
      beforeImages: formData.beforeImages || [],
      afterImages: formData.afterImages || [],
      results: {
        salesBefore:
          formData.salesBefore !== '' && !isNaN(Number(formData.salesBefore))
            ? Number(formData.salesBefore)
            : null,
        salesAfter:
          formData.salesAfter !== '' && !isNaN(Number(formData.salesAfter))
            ? Number(formData.salesAfter)
            : null,
        prepaidBefore:
          formData.prepaidBefore !== '' && !isNaN(Number(formData.prepaidBefore))
            ? Number(formData.prepaidBefore)
            : null,
        prepaidAfter:
          formData.prepaidAfter !== '' && !isNaN(Number(formData.prepaidAfter))
            ? Number(formData.prepaidAfter)
            : null,
        cancellationBefore:
          formData.cancellationBefore !== '' && !isNaN(Number(formData.cancellationBefore))
            ? Number(formData.cancellationBefore)
            : null,
        cancellationAfter:
          formData.cancellationAfter !== '' && !isNaN(Number(formData.cancellationAfter))
            ? Number(formData.cancellationAfter)
            : null
      }
    };

    console.log('[CRO CREATE] Submitting payload:', payload);

    try {
      await onSubmit(payload);
      newlyUploadedFileIdsRef.current.clear();
    } catch (err) {
      console.error('[CRO CREATE] Form submission failed:', err);
      const fieldErrors = (err.errors || []).map((e) => e.message || `${e.field} is invalid`).join(', ');
      const msg = fieldErrors ? `Validation failed: ${fieldErrors}` : (err.message || 'Failed to save experiment');
      setErrorMessage(msg);
    }
  };

  const beforePending = pendingUploads.filter((item) => item.type === 'before');
  const afterPending = pendingUploads.filter((item) => item.type === 'after');

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      title={isEdit ? 'Edit CRO Experiment' : 'Create New CRO Experiment'}
      size="xl"
      className="cro-experiment-modal"
    >
      <form onSubmit={handleSubmit} className="cro-modal-form-wrapper">
        <div className="cro-form-scrollable-body">
          {errorMessage && <div className="form-error-banner">{errorMessage}</div>}

          {/* Section 1: Experiment Basics */}
          <div className="form-section">
            <div className="section-header">
              <span className="section-number">1</span>
              <h4 className="section-title">Experiment Basics</h4>
            </div>

            <div className="form-grid two-cols">
              <Input
                label="Client Name *"
                placeholder="e.g. HealthGlow, UrbanFit"
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                required
              />

              <div className="input-group">
                <label className="input-label">Status</label>
                <select
                  className="custom-select"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  {Object.values(CRO_STATUSES).map((st) => (
                    <option key={st} value={st}>
                      {CRO_STATUS_CONFIG[st]?.label || st}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Input
              label="Hypothesis Title *"
              placeholder="e.g. Adding Urgency Countdown Timer on Checkout"
              value={formData.hypothesisTitle}
              onChange={(e) => setFormData({ ...formData, hypothesisTitle: e.target.value })}
              required
            />

            <div className="input-group">
              <label className="input-label">Hypothesis & Description *</label>
              <textarea
                className="custom-textarea"
                rows="3"
                placeholder="State the observed problem, test change, and expected conversion uplift..."
                value={formData.hypothesis}
                onChange={(e) => setFormData({ ...formData, hypothesis: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Section 2: Timeline */}
          <div className="form-section">
            <div className="section-header">
              <span className="section-number">2</span>
              <h4 className="section-title">Timeline</h4>
            </div>

            <div className="form-grid two-cols">
              <Input
                type="date"
                label="Start Date *"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />

              <Input
                type="date"
                label="End Date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
            </div>
          </div>

          {/* Section 3: Visual Proof */}
          <div className="form-section">
            <div className="section-header">
              <span className="section-number">3</span>
              <h4 className="section-title">Visual Proof</h4>
              <span className="section-hint">Multiple screenshots • Max 5MB • JPG, PNG, WEBP, GIF</span>
            </div>

            <div className="screenshots-two-column-grid">
              {/* Before Screenshots Card */}
              <div className="screenshot-uploader-card">
                <div className="card-top-bar">
                  <div className="card-title-group">
                    <span className="icon">📸</span>
                    <span className="name">Before Screenshots</span>
                    <span className="count-badge">{formData.beforeImages.length}</span>
                  </div>

                  <label className="compact-add-btn">
                    + Add Before
                    <input
                      type="file"
                      multiple
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      onChange={(e) => handleImageUpload(e, 'before')}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>

                {formData.beforeImages.length === 0 && beforePending.length === 0 ? (
                  <div className="empty-upload-hint">
                    No before screenshots attached yet. Click <strong>+ Add Before</strong> to upload.
                  </div>
                ) : (
                  <div className="thumbnails-compact-grid">
                    {/* Uploaded items */}
                    {formData.beforeImages.map((img, idx) => {
                      const isDeleting = Boolean(img.fileId && deletingFileIds.has(img.fileId));
                      return (
                        <div
                          key={`before-${img.fileId || idx}`}
                          className={`thumb-item ${isDeleting ? 'is-deleting' : ''}`}
                          title={img.name || `Image #${idx + 1}`}
                        >
                          <div className="img-wrapper">
                            <img
                              src={resolveImageUrl(img.url)}
                              alt={img.name || 'Before screenshot'}
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.parentNode.classList.add('broken-img');
                              }}
                            />
                            {isDeleting && (
                              <div className="thumb-overlay deleting">
                                <span className="spinner-dots">...</span>
                                <span className="status-text">Removing</span>
                              </div>
                            )}
                            <button
                              type="button"
                              className="thumb-remove-btn"
                              onClick={() => removeImage('before', idx)}
                              disabled={isDeleting}
                              title={isDeleting ? 'Removing...' : 'Remove image'}
                            >
                              &times;
                            </button>
                          </div>
                          <span className="thumb-name">{img.name || `Image #${idx + 1}`}</span>
                        </div>
                      );
                    })}

                    {/* Pending upload items */}
                    {beforePending.map((p) => (
                      <div key={p.id} className={`thumb-item pending-item ${p.status}`}>
                        <div className="img-wrapper">
                          <img src={p.previewUrl} alt={p.name} />
                          {p.status === 'uploading' && (
                            <div className="thumb-overlay uploading">
                              <span className="spinner-dots">...</span>
                              <span className="status-text">Uploading</span>
                            </div>
                          )}
                          {p.status === 'error' && (
                            <div className="thumb-overlay error">
                              <span className="error-title">Failed</span>
                              <button
                                type="button"
                                className="thumb-retry-btn"
                                onClick={() => retryPendingUpload(p)}
                              >
                                Retry
                              </button>
                            </div>
                          )}
                          <button
                            type="button"
                            className="thumb-remove-btn"
                            onClick={() => removePendingUpload(p.id)}
                            title="Cancel upload"
                          >
                            &times;
                          </button>
                        </div>
                        <span className="thumb-name">{p.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* After Screenshots Card */}
              <div className="screenshot-uploader-card">
                <div className="card-top-bar">
                  <div className="card-title-group">
                    <span className="icon">✨</span>
                    <span className="name">After Screenshots</span>
                    <span className="count-badge">{formData.afterImages.length}</span>
                  </div>

                  <label className="compact-add-btn">
                    + Add After
                    <input
                      type="file"
                      multiple
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      onChange={(e) => handleImageUpload(e, 'after')}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>

                {formData.afterImages.length === 0 && afterPending.length === 0 ? (
                  <div className="empty-upload-hint">
                    No after screenshots attached yet. Click <strong>+ Add After</strong> to upload.
                  </div>
                ) : (
                  <div className="thumbnails-compact-grid">
                    {/* Uploaded items */}
                    {formData.afterImages.map((img, idx) => {
                      const isDeleting = Boolean(img.fileId && deletingFileIds.has(img.fileId));
                      return (
                        <div
                          key={`after-${img.fileId || idx}`}
                          className={`thumb-item ${isDeleting ? 'is-deleting' : ''}`}
                          title={img.name || `Image #${idx + 1}`}
                        >
                          <div className="img-wrapper">
                            <img
                              src={resolveImageUrl(img.url)}
                              alt={img.name || 'After screenshot'}
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.parentNode.classList.add('broken-img');
                              }}
                            />
                            {isDeleting && (
                              <div className="thumb-overlay deleting">
                                <span className="spinner-dots">...</span>
                                <span className="status-text">Removing</span>
                              </div>
                            )}
                            <button
                              type="button"
                              className="thumb-remove-btn"
                              onClick={() => removeImage('after', idx)}
                              disabled={isDeleting}
                              title={isDeleting ? 'Removing...' : 'Remove image'}
                            >
                              &times;
                            </button>
                          </div>
                          <span className="thumb-name">{img.name || `Image #${idx + 1}`}</span>
                        </div>
                      );
                    })}

                    {/* Pending upload items */}
                    {afterPending.map((p) => (
                      <div key={p.id} className={`thumb-item pending-item ${p.status}`}>
                        <div className="img-wrapper">
                          <img src={p.previewUrl} alt={p.name} />
                          {p.status === 'uploading' && (
                            <div className="thumb-overlay uploading">
                              <span className="spinner-dots">...</span>
                              <span className="status-text">Uploading</span>
                            </div>
                          )}
                          {p.status === 'error' && (
                            <div className="thumb-overlay error">
                              <span className="error-title">Failed</span>
                              <button
                                type="button"
                                className="thumb-retry-btn"
                                onClick={() => retryPendingUpload(p)}
                              >
                                Retry
                              </button>
                            </div>
                          )}
                          <button
                            type="button"
                            className="thumb-remove-btn"
                            onClick={() => removePendingUpload(p.id)}
                            title="Cancel upload"
                          >
                            &times;
                          </button>
                        </div>
                        <span className="thumb-name">{p.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 4: Performance Results */}
          <div className="form-section">
            <div className="section-header">
              <span className="section-number">4</span>
              <h4 className="section-title">Performance Results</h4>
              <span className="section-hint">Enter before and after metrics to estimate points</span>
            </div>

            <div className="metric-cards-row">
              {/* Metric Card 1: Product Sales */}
              <div className="metric-card">
                <div className="metric-card-header">
                  <span className="metric-icon">💰</span>
                  <span className="metric-title">Product Sales (₹)</span>
                </div>

                <div className="inputs-pair-container">
                  <div className="input-subgroup">
                    <span className="sub-label">Before</span>
                    <input
                      type="number"
                      placeholder="0"
                      min="0"
                      step="any"
                      value={formData.salesBefore}
                      onChange={(e) => setFormData({ ...formData, salesBefore: e.target.value })}
                    />
                  </div>

                  <span className="arrow-divider">→</span>

                  <div className="input-subgroup">
                    <span className="sub-label">After</span>
                    <input
                      type="number"
                      placeholder="0"
                      min="0"
                      step="any"
                      value={formData.salesAfter}
                      onChange={(e) => setFormData({ ...formData, salesAfter: e.target.value })}
                    />
                  </div>
                </div>

                <div className="metric-card-footer">
                  <div className="stat-row">
                    <span className="stat-label">Improvement:</span>
                    <span
                      className={`improvement-badge ${
                        liveScore.salesPercent > 0
                          ? 'positive'
                          : liveScore.salesPercent < 0
                          ? 'negative'
                          : ''
                      }`}
                    >
                      {liveScore.salesPercent !== null
                        ? liveScore.salesPercent > 0
                          ? `+${liveScore.salesPercent}%`
                          : `${liveScore.salesPercent}%`
                        : '—'}
                    </span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">Points:</span>
                    <span className="points-highlight">
                      {liveScore.salesPoints > 0 ? `+${liveScore.salesPoints} pts` : '0 pts'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Metric Card 2: Prepaid Orders */}
              <div className="metric-card">
                <div className="metric-card-header">
                  <span className="metric-icon">💳</span>
                  <span className="metric-title">Prepaid Orders (%)</span>
                </div>

                <div className="inputs-pair-container">
                  <div className="input-subgroup">
                    <span className="sub-label">Before</span>
                    <input
                      type="number"
                      placeholder="0"
                      min="0"
                      max="100"
                      step="0.1"
                      value={formData.prepaidBefore}
                      onChange={(e) => setFormData({ ...formData, prepaidBefore: e.target.value })}
                    />
                  </div>

                  <span className="arrow-divider">→</span>

                  <div className="input-subgroup">
                    <span className="sub-label">After</span>
                    <input
                      type="number"
                      placeholder="0"
                      min="0"
                      max="100"
                      step="0.1"
                      value={formData.prepaidAfter}
                      onChange={(e) => setFormData({ ...formData, prepaidAfter: e.target.value })}
                    />
                  </div>
                </div>

                <div className="metric-card-footer">
                  <div className="stat-row">
                    <span className="stat-label">Improvement:</span>
                    <span
                      className={`improvement-badge ${
                        liveScore.prepaidDiff > 0
                          ? 'positive'
                          : liveScore.prepaidDiff < 0
                          ? 'negative'
                          : ''
                      }`}
                    >
                      {liveScore.prepaidDiff !== null
                        ? liveScore.prepaidDiff > 0
                          ? `+${liveScore.prepaidDiff} pp`
                          : `${liveScore.prepaidDiff} pp`
                        : '—'}
                    </span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">Points:</span>
                    <span className="points-highlight">
                      {liveScore.prepaidPoints > 0 ? `+${liveScore.prepaidPoints} pts` : '0 pts'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Metric Card 3: Cancellation Rate */}
              <div className="metric-card">
                <div className="metric-card-header">
                  <span className="metric-icon">📉</span>
                  <span className="metric-title">Cancellation Rate (%)</span>
                </div>

                <div className="inputs-pair-container">
                  <div className="input-subgroup">
                    <span className="sub-label">Before</span>
                    <input
                      type="number"
                      placeholder="0"
                      min="0"
                      max="100"
                      step="0.1"
                      value={formData.cancellationBefore}
                      onChange={(e) => setFormData({ ...formData, cancellationBefore: e.target.value })}
                    />
                  </div>

                  <span className="arrow-divider">→</span>

                  <div className="input-subgroup">
                    <span className="sub-label">After</span>
                    <input
                      type="number"
                      placeholder="0"
                      min="0"
                      max="100"
                      step="0.1"
                      value={formData.cancellationAfter}
                      onChange={(e) => setFormData({ ...formData, cancellationAfter: e.target.value })}
                    />
                  </div>
                </div>

                <div className="metric-card-footer">
                  <div className="stat-row">
                    <span className="stat-label">Improvement:</span>
                    <span
                      className={`improvement-badge ${
                        liveScore.cancellationPoints > 0
                          ? 'positive'
                          : liveScore.cancellationDiff > 0
                          ? 'negative'
                          : ''
                      }`}
                    >
                      {liveScore.cancellationDiff !== null
                        ? liveScore.cancellationDiff > 0
                          ? `+${liveScore.cancellationDiff} pp`
                          : `${liveScore.cancellationDiff} pp`
                        : '—'}
                    </span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">Points:</span>
                    <span className="points-highlight">
                      {liveScore.cancellationPoints > 0 ? `+${liveScore.cancellationPoints} pts` : '0 pts'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: Estimated Score */}
          <div className="form-section score-section">
            <div className="section-header">
              <span className="section-number">5</span>
              <h4 className="section-title">Estimated Score</h4>
              <span className="server-notice">⚡ Final points verified by backend upon save</span>
            </div>

            <div className="estimated-score-card">
              <div className="breakdown-grid">
                <div className="score-item">
                  <span className="item-label">Sales Points</span>
                  <span className="item-val">+{liveScore.salesPoints}</span>
                </div>
                <div className="score-divider">+</div>
                <div className="score-item">
                  <span className="item-label">Prepaid Points</span>
                  <span className="item-val">+{liveScore.prepaidPoints}</span>
                </div>
                <div className="score-divider">+</div>
                <div className="score-item">
                  <span className="item-label">Cancellation Points</span>
                  <span className="item-val">+{liveScore.cancellationPoints}</span>
                </div>
              </div>

              <div className="total-highlight">
                <span className="total-label">TOTAL ESTIMATED POINTS</span>
                <span className="total-value">+{liveScore.totalPoints} pts</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Modal Footer Actions */}
        <div className="cro-modal-footer">
          <Button
            type="button"
            variant="ghost"
            onClick={handleModalClose}
            disabled={isSubmitting || isDeletingAny}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting || isUploadingAny || isDeletingAny}
          >
            {isSubmitting
              ? 'Saving...'
              : isUploadingAny
              ? 'Uploading Screenshots...'
              : isDeletingAny
              ? 'Removing Image...'
              : isEdit
              ? 'Update Experiment'
              : 'Create Experiment'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
