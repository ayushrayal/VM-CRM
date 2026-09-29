import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/common/Modal';
import { Button } from '../../../components/common/Button';
import { getCampaignDeletePreview } from '../../../api/campaign.api';

export const DeleteCampaignModal = ({ isOpen, onClose, campaign, onConfirm }) => {
  const [preview, setPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && campaign?._id) {
      setIsLoading(true);
      setConfirmName('');
      setError('');
      getCampaignDeletePreview(campaign._id)
        .then((data) => setPreview(data))
        .catch((err) => setError(err.message || 'Failed to load campaign preview'))
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, campaign]);

  const handleDelete = async () => {
    if (confirmName.trim().toLowerCase() !== campaign.name.trim().toLowerCase()) {
      setError(`Please type "${campaign.name}" to confirm deletion.`);
      return;
    }

    setIsDeleting(true);
    setError('');
    try {
      await onConfirm(campaign._id);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to delete campaign');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!campaign) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Campaign?">
      <div className="delete-modal" style={{ color: '#1A1A1A' }}>
        {error && (
          <div style={{ color: '#991B1B', background: '#FEF2F2', border: '1px solid #FECACA', padding: '10px', borderRadius: '6px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <p style={{ marginBottom: '16px', fontSize: '0.95rem' }}>
          Are you sure you want to delete campaign <strong style={{ color: '#000000' }}>{campaign.name}</strong>?
        </p>

        <div style={{ background: '#FEF2F2', padding: '14px', borderRadius: '8px', border: '1px solid #FECACA', marginBottom: '16px' }}>
          <p style={{ margin: '0 0 10px', fontWeight: '700', color: '#991B1B' }}>
            This action is permanent and will cascade delete:
          </p>
          {isLoading ? (
            <p style={{ color: '#5A5B52' }}>Calculating affected records...</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: '20px', color: '#1A1A1A', lineHeight: '1.7' }}>
              <li><strong>Campaign:</strong> {campaign.name}</li>
              <li><strong>Client:</strong> {preview?.clientName || 'N/A'}</li>
              <li><strong>Related Ad Sets:</strong> {preview?.adSetsCount ?? 0}</li>
              <li><strong>Related Creatives / Cycles:</strong> {preview?.recordsCount ?? 0}</li>
            </ul>
          )}
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem', color: '#5A5B52', fontWeight: 600 }}>
            To confirm, type the campaign name <strong>{campaign.name}</strong> below:
          </label>
          <input
            type="text"
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder={campaign.name}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: '#FFFFFF',
              border: '1px solid #E5E5DC',
              borderRadius: '6px',
              color: '#1A1A1A',
              fontSize: '0.9rem'
            }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <Button variant="ghost" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            disabled={isDeleting || confirmName.trim().toLowerCase() !== campaign.name.trim().toLowerCase()}
          >
            {isDeleting ? 'Deleting Campaign...' : 'Delete Campaign'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
