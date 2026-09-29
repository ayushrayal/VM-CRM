import React from 'react';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { getTeamRoleLabel } from './AssignRoleModal';
import './UserCard.scss';

export const UserCard = ({ user, onDeleteClick, onRoleClick, isCurrentAdmin }) => {
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isTeam = user.role === 'team';

  return (
    <div className="user-card">
      <div className="card-header">
        <div className="card-user-info">
          <h3 className="user-name">{user.name}</h3>
          <span className="user-email">{user.email}</span>
        </div>
        <div className="card-badges">
          <Badge variant={user.role}>{user.role}</Badge>
          <Badge variant={user.status}>{user.status}</Badge>
        </div>
      </div>

      <div className="card-meta">
        <span className="meta-label">Joined:</span>
        <span className="meta-value">{formatDate(user.createdAt)}</span>
      </div>

      {isTeam && (
        <div className="card-team-role">
          <span className="role-label">Team Role</span>
          <span className={`role-value ${user.teamRole && user.teamRole !== 'none' ? 'assigned' : 'unassigned'}`}>
            {getTeamRoleLabel(user.teamRole)}
          </span>
        </div>
      )}

      {isTeam && (
        <div className="card-actions">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onRoleClick && onRoleClick(user)}
          >
            Change Role
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => onDeleteClick(user)}
          >
            Delete User
          </Button>
        </div>
      )}
    </div>
  );
};
