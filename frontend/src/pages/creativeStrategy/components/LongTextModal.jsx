import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/common/Modal';
import { Button } from '../../../components/common/Button';

export const LongTextModal = ({
  isOpen,
  onClose,
  title = 'Edit Notes',
  initialValue = '',
  onSave
}) => {
  const [value, setValue] = useState(initialValue);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setValue(initialValue || '');
  }, [initialValue, isOpen]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(value);
      onClose();
    } catch {
      // Handled in caller
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div style={{ color: '#1A1A1A' }}>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={7}
          style={{
            width: '100%',
            padding: '10px 14px',
            background: '#FFFFFF',
            border: '1px solid #E5E5DC',
            borderRadius: '6px',
            color: '#1A1A1A',
            fontSize: '0.9rem',
            lineHeight: '1.5',
            resize: 'vertical'
          }}
          placeholder="Enter detailed notes, recommendations, or content..."
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
