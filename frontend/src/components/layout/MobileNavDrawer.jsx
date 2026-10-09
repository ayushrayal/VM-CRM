import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import './MobileNavDrawer.scss';

export const MobileNavDrawer = ({ isOpen, onClose, user, isAdmin, onSignout }) => {
  // Lock body scroll and handle Escape key when open
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="mobile-drawer-overlay" onClick={onClose}>
      <div className="mobile-drawer-content" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div className="drawer-brand">
            <span className="drawer-brand-text">VYTALIS MEDIA</span>
            <span className="drawer-brand-dot" />
            <span className="drawer-brand-sub">CRM</span>
          </div>
          <button className="drawer-close" onClick={onClose} aria-label="Close menu">
            &times;
          </button>
        </div>

        {user && (
          <div className="drawer-user-info">
            <div className="drawer-user-details">
              <span className="drawer-user-name">{user.name}</span>
              <span className="drawer-user-email">{user.email}</span>
            </div>
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
            to="/clients"
            className={({ isActive }) => `drawer-link ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            Clients
          </NavLink>

          <NavLink
            to="/creative-strategy"
            className={({ isActive }) => `drawer-link ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            Creative Strategy
          </NavLink>

          <div className="drawer-section-heading">Performance</div>

          <NavLink
            to="/projections"
            className={({ isActive }) => `drawer-link drawer-sublink ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            Project Projections
          </NavLink>

          <NavLink
            to="/gamiply/cro"
            className={({ isActive }) => `drawer-link drawer-sublink ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            CRO Performance
          </NavLink>

          <NavLink
            to="/gamiply/creative"
            className={({ isActive }) => `drawer-link drawer-sublink ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            Creative Performance
          </NavLink>

          {isAdmin && (
            <>
              <div className="drawer-section-heading">Administration</div>
              <NavLink
                to="/user-management"
                className={({ isActive }) => `drawer-link ${isActive ? 'active' : ''}`}
                onClick={onClose}
              >
                User Management
              </NavLink>
            </>
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
