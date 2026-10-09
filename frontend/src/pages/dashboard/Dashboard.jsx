import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  PanelsTopLeft,
  TrendingUp,
  FlaskConical,
  Users,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../../components/common/PageHeader';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import './Dashboard.scss';

export const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const isAdmin = user?.role === 'admin';

  const quickLinks = [
    {
      title: 'Clients',
      description: 'Manage centralized client directory, targets, and history.',
      icon: <Building2 size={20} strokeWidth={1.75} />,
      path: '/clients'
    },
    {
      title: 'Creative Strategy',
      description: 'Review workflow stages, ad concepts, and launch schedules.',
      icon: <PanelsTopLeft size={20} strokeWidth={1.75} />,
      path: '/creative-strategy'
    },
    {
      title: 'Project Projections',
      description: 'Track daily performance, monthly targets, and forecasts.',
      icon: <TrendingUp size={20} strokeWidth={1.75} />,
      path: '/projections'
    },
    {
      title: 'CRO Performance',
      description: 'Document hypotheses, monitor test outcomes, and view rankings.',
      icon: <FlaskConical size={20} strokeWidth={1.75} />,
      path: '/gamiply/cro'
    }
  ];

  if (isAdmin) {
    quickLinks.push({
      title: 'User Management',
      description: 'Review team access, assign roles, and handle signup requests.',
      icon: <Users size={20} strokeWidth={1.75} />,
      path: '/user-management'
    });
  }

  return (
    <div className="dashboard-page">
      <PageHeader
        title="Dashboard"
        description={`Welcome back, ${user?.name || 'User'}. Here is your operations overview.`}
        badge={<Badge variant={user?.role}>{user?.role}</Badge>}
        actions={
          isAdmin && (
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate('/user-management')}
            >
              Manage Users
            </Button>
          )
        }
      />

      {/* Account Verification Banner */}
      <div className="account-status-card">
        <div className="status-indicator-icon">
          <CheckCircle2 size={18} strokeWidth={2} />
        </div>
        <div className="status-text-group">
          <span className="status-title">Active Account</span>
          <span className="status-desc">
            Your account is verified and authenticated with {user?.role} privileges.
          </span>
        </div>
      </div>

      {/* Quick Access Grid */}
      <div className="dashboard-section">
        <h2 className="section-title">Quick Access</h2>
        <div className="quick-access-grid">
          {quickLinks.map((item) => (
            <div
              key={item.path}
              className="quick-card"
              onClick={() => navigate(item.path)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate(item.path)}
            >
              <div className="card-header-row">
                <div className="card-icon-wrap">{item.icon}</div>
                <ArrowRight size={16} className="card-arrow" />
              </div>
              <h3 className="card-title">{item.title}</h3>
              <p className="card-desc">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
