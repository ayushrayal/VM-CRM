import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/common/Modal';
import { Input } from '../../../components/common/Input';
import { Button } from '../../../components/common/Button';

export const AddAdSetModal = ({
  isOpen,
  onClose,
  campaigns = [],
  defaultCampaignId = '',
  onSubmit
}) => {
  const [campaignId, setCampaignId] = useState(defaultCampaignId || (campaigns[0]?._id || ''));
  const [name, setName] = useState('');
  const [launchDate, setLaunchDate] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [currentTestingCycle, setCurrentTestingCycle] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (defaultCampaignId) setCampaignId(defaultCampaignId);
    else if (campaigns[0]?._id && !campaignId) setCampaignId(campaigns[0]._id);
  }, [defaultCampaignId, campaigns]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Ad Set name is required');
      return;
    }
    if (!campaignId) {
      setError('Please select a campaign');
      return;
    }

    setError('');
    setIsSubmitting(true);
    try {
      await onSubmit({
        campaignId,
        name: name.trim(),
        launchDate: launchDate ? new Date(launchDate).toISOString() : null,
        status,
        currentTestingCycle: Number(currentTestingCycle) || 1
      });
      setName('');
      setLaunchDate('');
      setCurrentTestingCycle(1);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create Ad Set');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Ad Set">
      <form onSubmit={handleSubmit} className="modal-form">
        {error && <div style={{ color: '#ef4444', marginBottom: '12px' }}>{error}</div>}

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem', color: '#1A1A1A', fontWeight: 600 }}>
            Campaign
          </label>
          <select
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: '#FFFFFF',
              border: '1px solid #E5E5DC',
              borderRadius: '6px',
              color: '#1A1A1A'
            }}
            required
          >
            <option value="">Select a campaign...</option>
            {campaigns.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name} {c.client?.name ? `(${c.client.name})` : ''}
              </option>
            ))}
          </select>
        </div>

        <Input
          label="Ad Set Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. VM | CBO | B | Top Cities..."
          required
        />

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem', color: '#1A1A1A', fontWeight: 600 }}>
            Ad Set Launch Date
          </label>
          <input
            type="date"
            value={launchDate}
            onChange={(e) => setLaunchDate(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: '#FFFFFF',
              border: '1px solid #E5E5DC',
              borderRadius: '6px',
              color: '#1A1A1A'
            }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem', color: '#1A1A1A', fontWeight: 600 }}>
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: '#FFFFFF',
              border: '1px solid #E5E5DC',
              borderRadius: '6px',
              color: '#1A1A1A'
            }}
          >
            <option value="ACTIVE">ACTIVE</option>
            <option value="PAUSED">PAUSED</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="DRAFT">DRAFT</option>
          </select>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem', color: '#1A1A1A', fontWeight: 600 }}>
            Current Testing Cycle #
          </label>
          <input
            type="number"
            min="1"
            value={currentTestingCycle}
            onChange={(e) => setCurrentTestingCycle(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: '#FFFFFF',
              border: '1px solid #E5E5DC',
              borderRadius: '6px',
              color: '#1A1A1A'
            }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
          <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
          <Button variant="primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Ad Set'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
