import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getClients,
  createClient,
  updateClient,
  deleteClient,
  getClientDeletePreview
} from '../../api/client.api';
import { getStreamUrl } from '../../api/axios';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import './ClientsPage.scss';

export const ClientsPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [formData, setFormData] = useState({
    clientName: '',
    baselineROAS: '',
    currentROAS: '',
    code: '',
    description: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // Delete Preview Modal state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletePreview, setDeletePreview] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast banner
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getClients();
      const list = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
          ? res.data
          : (res?.data?.data || []);
      setClients(list);
    } catch (err) {
      showToast(err.message || 'Failed to load clients', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();

    const handleUpdate = () => {
      fetchClients();
    };

    window.addEventListener('CLIENTS_UPDATED', handleUpdate);

    let sse;
    try {
      sse = new EventSource(getStreamUrl('/creative-strategy/stream'), { withCredentials: true });
      sse.addEventListener('CLIENT_CREATED', handleUpdate);
      sse.addEventListener('CLIENT_UPDATED', handleUpdate);
      sse.addEventListener('CLIENT_DELETED', handleUpdate);
    } catch (e) {
      // SSE not available
    }

    return () => {
      window.removeEventListener('CLIENTS_UPDATED', handleUpdate);
      if (sse) sse.close();
    };
  }, [fetchClients]);

  // Open Add modal
  const handleOpenAdd = () => {
    setEditingClient(null);
    setFormData({
      clientName: '',
      baselineROAS: '',
      currentROAS: '',
      code: '',
      description: ''
    });
    setFormErrors({});
    setModalError('');
    setIsModalOpen(true);
  };

  // Open Edit modal
  const handleOpenEdit = (client) => {
    setEditingClient(client);
    setFormData({
      clientName: client.clientName || client.name || '',
      baselineROAS: client.baselineROAS !== undefined ? String(client.baselineROAS) : '0',
      currentROAS: client.currentROAS !== undefined ? String(client.currentROAS) : '',
      code: client.code || '',
      description: client.description || ''
    });
    setFormErrors({});
    setModalError('');
    setIsModalOpen(true);
  };

  const validate = () => {
    const errors = {};
    if (!formData.clientName.trim()) {
      errors.clientName = 'Client name is required';
    } else if (formData.clientName.trim().length < 2) {
      errors.clientName = 'Client name must be at least 2 characters';
    }

    if (formData.baselineROAS !== '') {
      const num = Number(formData.baselineROAS);
      if (isNaN(num) || num < 0) {
        errors.baselineROAS = 'Baseline ROAS must be a non-negative number';
      }
    }

    if (formData.currentROAS !== '') {
      const num = Number(formData.currentROAS);
      if (isNaN(num) || num < 0) {
        errors.currentROAS = 'Current ROAS must be a non-negative number';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalError('');

    if (!validate()) return;

    try {
      setIsSubmitting(true);
      const payload = {
        clientName: formData.clientName.trim(),
        name: formData.clientName.trim(),
        baselineROAS: formData.baselineROAS !== '' ? Number(formData.baselineROAS) : 0,
        currentROAS:
          formData.currentROAS !== ''
            ? Number(formData.currentROAS)
            : formData.baselineROAS !== ''
            ? Number(formData.baselineROAS)
            : 0,
        code: formData.code.trim().toUpperCase() || undefined,
        description: formData.description.trim()
      };

      if (editingClient) {
        const updated = await updateClient(editingClient._id, payload);
        if (!updated) {
          throw new Error('Server did not confirm client update.');
        }
        showToast('Client updated successfully');
      } else {
        const created = await createClient(payload);
        if (!created) {
          throw new Error('Server did not confirm client creation.');
        }
        showToast('Client created successfully');
      }

      setIsModalOpen(false);
      window.dispatchEvent(new CustomEvent('CLIENTS_UPDATED'));
      await fetchClients();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to save client';
      setModalError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Delete modal
  const handleOpenDelete = async (client) => {
    setDeleteTarget(client);
    setDeletePreview(null);
    try {
      const preview = await getClientDeletePreview(client._id);
      const data = preview?.data ?? preview;
      setDeletePreview(data);
    } catch {
      // preview error fallback
      setDeletePreview({ clientName: client.clientName || client.name });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      await deleteClient(deleteTarget._id);
      showToast('Client deleted. Historical performance records remain preserved.');
      setDeleteTarget(null);
      window.dispatchEvent(new CustomEvent('CLIENTS_UPDATED'));
      await fetchClients();
    } catch (err) {
      showToast(err.message || 'Failed to delete client', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredClients = clients.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const name = (c.clientName || c.name || '').toLowerCase();
    const code = (c.code || '').toLowerCase();
    const desc = (c.description || '').toLowerCase();
    return name.includes(q) || code.includes(q) || desc.includes(q);
  });

  const avgBaseline =
    clients.length > 0
      ? (
          clients.reduce((acc, c) => acc + (c.baselineROAS || 0), 0) / clients.length
        ).toFixed(1)
      : '0.0';

  const maxROAS =
    clients.length > 0
      ? Math.max(...clients.map((c) => c.currentROAS || c.baselineROAS || 0)).toFixed(1)
      : '0.0';

  return (
    <div className="clients-page-container">
      {/* Toast Alert */}
      {toast && (
        <div className={`client-toast-banner ${toast.type}`}>
          {toast.message}
        </div>
      )}

      {/* Header Banner */}
      <div className="clients-header">
        <div className="header-left">
          <div className="title-row">
            <span className="section-badge">CENTRAL DIRECTORY</span>
            <h1 className="page-title">Client Management</h1>
          </div>
          <p className="page-subtitle">
            Shared central client registry across Creative Strategy, Creative Performance, and CRO Performance.
          </p>
        </div>

        {isAdmin && (
          <div className="header-actions">
            <Button variant="primary" size="lg" onClick={handleOpenAdd}>
              + Add Client
            </Button>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="clients-stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🏢</div>
          <div className="stat-content">
            <span className="stat-label">Total Active Clients</span>
            <span className="stat-main-val">{clients.length}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <span className="stat-label">Avg Baseline ROAS</span>
            <span className="stat-main-val">{avgBaseline}x</span>
          </div>
        </div>

        <div className="stat-card highlight">
          <div className="stat-icon">🚀</div>
          <div className="stat-content">
            <span className="stat-label">Top Client ROAS</span>
            <span className="stat-main-val">{maxROAS}x</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="clients-toolbar">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by client name, code, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
              &times;
            </button>
          )}
        </div>
        <div className="clients-count-badge">
          Showing {filteredClients.length} of {clients.length} clients
        </div>
      </div>

      {/* Table of Clients */}
      <div className="table-card">
        {loading ? (
          <div className="clients-loading-state">
            <LoadingSpinner size="lg" />
            <span>Loading clients...</span>
          </div>
        ) : filteredClients.length > 0 ? (
          <div className="table-scroll-wrapper">
            <table className="clients-table">
              <thead>
                <tr>
                  <th className="col-name">Client Name</th>
                  <th className="col-code">Code</th>
                  <th className="col-roas" style={{ textAlign: 'center' }}>Baseline ROAS</th>
                  <th className="col-roas" style={{ textAlign: 'center' }}>Current ROAS</th>
                  <th className="col-desc">Description</th>
                  <th className="col-date">Created At</th>
                  {isAdmin && <th className="col-actions" style={{ textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client) => (
                  <tr key={client._id}>
                    <td className="client-name-cell">
                      <div className="name-wrapper">
                        <span className="client-icon">🏢</span>
                        <span className="client-title">{client.clientName || client.name}</span>
                      </div>
                    </td>

                    <td className="code-cell">
                      <span className="code-pill">{client.code || '—'}</span>
                    </td>

                    <td style={{ textAlign: 'center' }} className="num-cell">
                      <span className="roas-pill baseline">
                        {client.baselineROAS !== undefined ? `${client.baselineROAS}x` : '0.0x'}
                      </span>
                    </td>

                    <td style={{ textAlign: 'center' }} className="num-cell">
                      <span className="roas-pill current">
                        {client.currentROAS !== undefined ? `${client.currentROAS}x` : `${client.baselineROAS || 0}x`}
                      </span>
                    </td>

                    <td className="desc-cell" title={client.description}>
                      {client.description || '—'}
                    </td>

                    <td className="date-cell">
                      {new Date(client.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </td>

                    {isAdmin && (
                      <td className="actions-cell" style={{ textAlign: 'right' }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(client)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleOpenDelete(client)}
                        >
                          Delete
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="clients-empty-state">
            <span className="empty-icon">🏢</span>
            <h3>No clients found</h3>
            <p>
              {searchQuery
                ? `No clients matched your search query "${searchQuery}".`
                : 'No clients registered yet.'}
            </p>
            {isAdmin && !searchQuery && (
              <Button variant="primary" onClick={handleOpenAdd}>
                + Add First Client
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Add / Edit Client Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingClient ? 'Edit Client Record' : 'Add New Client Record'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="client-modal-form">
          {modalError && (
            <div className="form-error-banner" role="alert">
              <span>⚠️</span> {modalError}
            </div>
          )}

          <div className="form-grid">
            <Input
              id="clientName"
              name="clientName"
              label="Client Name"
              placeholder="e.g. JSB Wellness"
              value={formData.clientName}
              onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
              error={formErrors.clientName}
              required
            />

            <Input
              id="code"
              name="code"
              label="Client Code (Short)"
              placeholder="e.g. JSB"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            />

            <Input
              id="baselineROAS"
              name="baselineROAS"
              type="number"
              step="0.01"
              min="0"
              label="Baseline ROAS"
              placeholder="e.g. 4.0"
              value={formData.baselineROAS}
              onChange={(e) => setFormData({ ...formData, baselineROAS: e.target.value })}
              error={formErrors.baselineROAS}
              helperText="Reference ROAS for performance improvements"
            />

            <Input
              id="currentROAS"
              name="currentROAS"
              type="number"
              step="0.01"
              min="0"
              label="Current ROAS"
              placeholder="Leave blank to match baseline"
              value={formData.currentROAS}
              onChange={(e) => setFormData({ ...formData, currentROAS: e.target.value })}
              error={formErrors.currentROAS}
              helperText="Reflects latest recorded creative performance (auto-updated by creative entries)"
            />

            <div className="input-group full-width">
              <label htmlFor="description" className="input-label">
                Description / Notes
              </label>
              <textarea
                id="description"
                rows="3"
                className="custom-textarea"
                placeholder="Client industry, key objectives, or account notes..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>

          <div className="modal-actions">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              disabled={isSubmitting}
            >
              {editingClient ? 'Update Client' : 'Create Client'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Confirm Client Deletion"
        size="md"
      >
        <div className="client-delete-box">
          <p className="delete-lead">
            Are you sure you want to delete client{' '}
            <strong>"{deleteTarget?.clientName || deleteTarget?.name}"</strong>?
          </p>

          <div className="delete-info-banner">
            <span className="info-icon">ℹ️</span>
            <div>
              <strong>Historical Performance Preserved:</strong>
              <p>
                Existing Creative Performance and CRO Performance records will <strong>NOT</strong> be deleted.
                Their historical points, submissions, and leaderboard rankings remain completely intact.
              </p>
            </div>
          </div>

          {deletePreview && (
            <div className="delete-preview-stats">
              <span>Associated Strategy Campaigns: {deletePreview.campaignsCount || 0}</span>
              <span>Associated Ad Sets: {deletePreview.adSetsCount || 0}</span>
            </div>
          )}

          <div className="modal-actions">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleDeleteConfirm}
              isLoading={isDeleting}
              disabled={isDeleting}
            >
              Delete Client
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
