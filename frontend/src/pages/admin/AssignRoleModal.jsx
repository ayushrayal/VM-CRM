import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';

export const getTeamRoleLabel = (teamRole) => {
  switch (teamRole) {
    case 'media_buyer':
      return 'Media Buyer';
    case 'creative_strategist':
      return 'Creative Strategist';
    case 'graphic_designer':
      return 'Graphic Designer';
    case 'none':
    case null:
    default:
      return 'Unassigned';
  }
};

export const AssignRoleModal = ({ isOpen, onClose, user, onSave, isSaving }) => {
  const [selectedRole, setSelectedRole] = useState('none');

  useEffect(() => {
    if (user) {
      setSelectedRole(user.teamRole && user.teamRole !== 'none' ? user.teamRole : 'none');
    }
  }, [user, isOpen]);

  if (!user) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(user._id, selectedRole);
  };

  return (
    <Modal isOpen={isOpen} onClose={() => !isSaving && onClose()} title="Assign Team Role">
      <form onSubmit={handleSubmit} className="modal-dialog-body">
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '0.85rem', color: '#5A5B52', marginBottom: '2px', fontWeight: 600 }}>
            User:
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#000000' }}>
            {user.name}
          </div>
          <div style={{ fontSize: '0.875rem', color: '#5A5B52' }}>
            {user.email}
          </div>
        </div>

        <div style={{ marginBottom: '16px', background: '#FAFAF7', padding: '10px 14px', borderRadius: '6px', border: '1px solid #E5E5DC' }}>
          <span style={{ fontSize: '0.78rem', color: '#8C8D82', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '2px' }}>
            Current Role:
          </span>
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#000000' }}>
            {getTeamRoleLabel(user.teamRole)}
          </span>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem', fontWeight: 600, color: '#000000' }}>
            New Team Role:
          </label>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              fontSize: '0.9rem',
              borderRadius: '6px',
              border: '1px solid #E5E5DC',
              background: '#FFFFFF',
              color: '#1A1A1A',
              outline: 'none'
            }}
          >
            <option value="none">Unassigned</option>
            <option value="media_buyer">Media Buyer</option>
            <option value="creative_strategist">Creative Strategist</option>
            <option value="graphic_designer">Graphic Designer</option>
          </select>
        </div>

        <div className="modal-actions-row" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <Button variant="secondary" size="md" onClick={onClose} disabled={isSaving} type="button">
            Cancel
          </Button>
          <Button variant="primary" size="md" loading={isSaving} type="submit">
            Save Role
          </Button>
        </div>
      </form>
    </Modal>
  );
};
