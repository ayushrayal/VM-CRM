import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/common/Modal';
import { Button } from '../../../components/common/Button';
import { getCreativeDeletePreview } from '../../../api/creativeStrategy.api';

export const DeleteCreativeModal = ({ isOpen, onClose, record, onConfirm }) => {
  const [preview, setPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const [error, setError] = useState('');

  const creativeIdentifier = record?.creativeName || record?.creativesProposed || 'Creative';

  useEffect(() => {
    if (isOpen && record?._id) {
      setIsLoading(true);
      setConfirmName('');
      setError('');
      getCreativeDeletePreview(record._id)
        .then((data) => setPreview(data))
        .catch((err) => setError(err.message || 'Failed to load creative preview'))
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, record]);

  const handleDelete = async () => {
    if (confirmName.trim().toLowerCase() !== creativeIdentifier.trim().toLowerCase()) {
      setError(`Please type "${creativeIdentifier}" to confirm deletion.`);
      return;
    }

    setIsDeleting(true);
    setError('');
    try {
      await onConfirm(record._id);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to delete creative');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!record) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Creative?">
      <div className="delete-modal" style={{ color: '#1A1A1A' }}>
        {error && (
          <div style={{ color: '#991B1B', background: '#FEF2F2', border: '1px solid #FECACA', padding: '10px', borderRadius: '6px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <p style={{ marginBottom: '16px', fontSize: '0.95rem' }}>
          Are you sure you want to delete creative <strong style={{ color: '#000000' }}>{creativeIdentifier}</strong>?
        </p>

        <div style={{ background: '#FEF2F2', padding: '14px', borderRadius: '8px', border: '1px solid #FECACA', marginBottom: '16px' }}>
          <p style={{ margin: '0 0 10px', fontWeight: '700', color: '#991B1B' }}>
            This action is permanent and will cascade delete:
          </p>
          {isLoading ? (
            <p style={{ color: '#5A5B52' }}>Calculating affected records...</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: '20px', color: '#1A1A1A', lineHeight: '1.7' }}>
              <li><strong>Creative:</strong> {creativeIdentifier}</li>
              <li><strong>Cycle:</strong> {record.currentTestingCycle || `Cycle ${record.cycleNumber}`}</li>
              <li><strong>Client:</strong> {preview?.clientName || 'N/A'}</li>
              <li><strong>Campaign:</strong> {preview?.campaignName || 'N/A'}</li>
              <li><strong>Ad Set:</strong> {preview?.adSetName || 'N/A'}</li>
              <li><strong>Audit Timeline Events:</strong> {preview?.timelineCount ?? 0}</li>
              <li><strong>Related Cycles:</strong> {preview?.relatedCycles ?? 1}</li>
            </ul>
          )}
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem', color: '#5A5B52', fontWeight: 600 }}>
            To confirm, type the creative name <strong>{creativeIdentifier}</strong> below:
          </label>
          <input
            type="text"
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder={creativeIdentifier}
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
            disabled={isDeleting || confirmName.trim().toLowerCase() !== creativeIdentifier.trim().toLowerCase()}
          >
            {isDeleting ? 'Deleting Creative...' : 'Delete Creative'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
