import React, { useState } from 'react';
import { Modal } from '../../../components/common/Modal';
import { Input } from '../../../components/common/Input';
import { Button } from '../../../components/common/Button';

export const AddClientModal = ({ isOpen, onClose, onSubmit }) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Client name is required');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      await onSubmit({ name: name.trim(), code: code.trim(), description: description.trim() });
      setName('');
      setCode('');
      setDescription('');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create client');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Client">
      <form onSubmit={handleSubmit} className="modal-form">
        {error && <div className="form-error-banner" style={{ color: '#ef4444', marginBottom: '12px' }}>{error}</div>}
        <Input
          label="Client Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Acme Corp"
          required
        />
        <Input
          label="Client Code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="e.g. ACM"
        />
        <div className="input-group" style={{ marginBottom: '16px' }}>
          <label className="input-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem' }}>Description</label>
          <textarea
            className="input-field"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Brief description or notes"
          />
        </div>
        <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
          <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
          <Button variant="primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Client'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
