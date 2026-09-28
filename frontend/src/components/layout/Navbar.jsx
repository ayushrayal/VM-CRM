import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { MobileNavDrawer } from './MobileNavDrawer';
import './Navbar.scss';

export const Navbar = () => {
  const { user, signout } = useAuth();
  const navigate = useNavigate();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleSignout = async () => {
    await signout();
    navigate('/login');
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const isAdmin = user?.role === 'admin';

  return (
    <>
      <header className="top-navbar">
        <div className="navbar-container">
          {/* Brand Logo Placeholder */}
          <NavLink to="/dashboard" className="brand-logo">
            <span className="brand-text">VYTALIS MEDIA</span>
            <span className="brand-dot" />
            <span className="brand-sub">CRM</span>
          </NavLink>

          {/* Desktop Navigation */}
          <nav className="desktop-nav">
            <NavLink
              to="/dashboard"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              Dashboard
            </NavLink>

            {isAdmin && (
              <NavLink
                to="/user-management"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                User Management
              </NavLink>
            )}
          </nav>

          {/* User Profile Pill & Signout */}
          <div className="navbar-user-actions">
            {user && (
              <div className="user-profile-pill">
                <div className="avatar-circle">{getInitials(user.name)}</div>
                <div className="user-info">
                  <span className="user-name">{user.name}</span>
                  <Badge variant={user.role}>{user.role}</Badge>
                </div>
              </div>
            )}

            <Button variant="ghost" size="sm" onClick={handleSignout} className="desktop-signout">
              Sign Out
            </Button>

            {/* Mobile Hamburger Toggle */}
            <button
              className="hamburger-btn"
              onClick={() => setIsMobileOpen(true)}
              aria-label="Open navigation menu"
            >
              <span className="hamburger-line" />
              <span className="hamburger-line" />
              <span className="hamburger-line" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      <MobileNavDrawer
        isOpen={isMobileOpen}
        onClose={() => setIsMobileOpen(false)}
        user={user}
        isAdmin={isAdmin}
        onSignout={handleSignout}
      />
    </>
  );
};
