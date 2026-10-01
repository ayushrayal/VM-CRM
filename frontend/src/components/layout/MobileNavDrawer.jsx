import React from 'react';
import { NavLink } from 'react-router-dom';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import './MobileNavDrawer.scss';

export const MobileNavDrawer = ({ isOpen, onClose, user, isAdmin, onSignout }) => {
  if (!isOpen) return null;

  return (
    <div className="mobile-drawer-overlay" onClick={onClose}>
      <div className="mobile-drawer-content" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <span className="drawer-brand">VYTALIS MEDIA CRM</span>
          <button className="drawer-close" onClick={onClose} aria-label="Close menu">
            &times;
          </button>
        </div>

        {user && (
          <div className="drawer-user-info">
            <span className="drawer-user-name">{user.name}</span>
            <span className="drawer-user-email">{user.email}</span>
            <Badge variant={user.role} className="drawer-role-badge">
              {user.role}
            </Badge>
          </div>
        )}

        <nav className="drawer-nav">
          <NavLink
            to="/dashboard"
            className={({ isActive }) => `drawer-link ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            Dashboard
          </NavLink>

          <NavLink
            to="/creative-strategy"
            className={({ isActive }) => `drawer-link ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            Creative Strategy
          </NavLink>

          <NavLink
            to="/gamiply/cro"
            className={({ isActive }) => `drawer-link ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            🧪 CRO Performance
          </NavLink>

          <NavLink
            to="/gamiply/creative"
            className={({ isActive }) => `drawer-link ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            🎨 Creative Performance
          </NavLink>

          {isAdmin && (
            <NavLink
              to="/user-management"
              className={({ isActive }) => `drawer-link ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              User Management
            </NavLink>
          )}
        </nav>

        <div className="drawer-footer">
          <Button variant="danger" size="md" fullWidth onClick={onSignout}>
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
};
