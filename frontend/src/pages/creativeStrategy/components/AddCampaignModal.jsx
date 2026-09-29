import React, { useState } from 'react';
import { Modal } from '../../../components/common/Modal';
import { Input } from '../../../components/common/Input';
import { Button } from '../../../components/common/Button';

export const AddCampaignModal = ({ isOpen, onClose, clients = [], defaultClientId = '', onSubmit }) => {
  const [clientId, setClientId] = useState(defaultClientId || (clients[0]?._id || ''));
  const [name, setName] = useState('');
  const [launchDate, setLaunchDate] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Update clientId if defaultClientId changes
  React.useEffect(() => {
    if (defaultClientId) setClientId(defaultClientId);
    else if (clients[0]?._id && !clientId) setClientId(clients[0]._id);
  }, [defaultClientId, clients]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Campaign name is required');
      return;
    }
    if (!clientId) {
      setError('Please select a client');
      return;
    }

    setError('');
    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        clientId,
        launchDate: launchDate ? new Date(launchDate).toISOString() : null,
        status,
        notes: notes.trim()
      });
      setName('');
      setLaunchDate('');
      setNotes('');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create campaign');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Campaign">
      <form onSubmit={handleSubmit} className="modal-form">
        {error && <div style={{ color: '#ef4444', marginBottom: '12px' }}>{error}</div>}

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem', color: '#1A1A1A', fontWeight: 600 }}>Client</label>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', background: '#FFFFFF', border: '1px solid #E5E5DC', borderRadius: '6px', color: '#1A1A1A' }}
            required
          >
            <option value="">Select a client...</option>
            {clients.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name} {c.code ? `(${c.code})` : ''}
              </option>
            ))}
          </select>
        </div>

        <Input
          label="Campaign Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. VM | CBO | B | 10/09/2026"
          required
        />

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem', color: '#1A1A1A', fontWeight: 600 }}>Campaign Launch Date</label>
          <input
            type="date"
            value={launchDate}
            onChange={(e) => setLaunchDate(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', background: '#FFFFFF', border: '1px solid #E5E5DC', borderRadius: '6px', color: '#1A1A1A' }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem', color: '#1A1A1A', fontWeight: 600 }}>Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', background: '#FFFFFF', border: '1px solid #E5E5DC', borderRadius: '6px', color: '#1A1A1A' }}
          >
            <option value="ACTIVE">ACTIVE</option>
            <option value="PAUSED">PAUSED</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="DRAFT">DRAFT</option>
          </select>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem', color: '#1A1A1A', fontWeight: 600 }}>Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Campaign details or objectives"
            style={{ width: '100%', padding: '8px 12px', background: '#FFFFFF', border: '1px solid #E5E5DC', borderRadius: '6px', color: '#1A1A1A' }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
          <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
          <Button variant="primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Campaign'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
