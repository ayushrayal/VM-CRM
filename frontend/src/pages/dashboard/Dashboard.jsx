import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import './Dashboard.scss';

export const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const isAdmin = user?.role === 'admin';

  return (
    <div className="dashboard-page">
      <div className="dashboard-welcome-card">
        <div className="welcome-header">
          <div className="welcome-title-group">
            <h1 className="welcome-title">Welcome back, {user?.name || 'User'}</h1>
            <Badge variant={user?.role}>{user?.role}</Badge>
          </div>
        </div>

        {isAdmin ? (
          <div className="admin-action-section">
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate('/user-management')}
              className="manage-users-btn"
            >
              Manage Users &rarr;
            </Button>
          </div>
        ) : (
          <div className="team-banner-section">
            <p className="team-status-banner">
              ✓ Your team member account is verified and active.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
