import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { NotificationBell } from '../common/NotificationBell';
import { MobileNavDrawer } from './MobileNavDrawer';
import './Navbar.scss';

export const Navbar = () => {
  const { user, signout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
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

            <NavLink
              to="/clients"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              Clients
            </NavLink>

            <NavLink
              to="/creative-strategy"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              Creative Strategy
            </NavLink>

            <div className="nav-gamiply-dropdown">
              <NavLink
                to="/projections"
                className={({ isActive }) =>
                  `nav-link ${
                    isActive ||
                    location.pathname.startsWith('/projections') ||
                    location.pathname.startsWith('/gamiply') ||
                    location.pathname === '/cro-gamiply' ||
                    location.pathname === '/creative-gamiply'
                      ? 'active'
                      : ''
                  }`
                }
              >
                Performance ▾
              </NavLink>
              <div className="gamiply-menu">
                <NavLink to="/projections" className="gamiply-item">
                  📈 Project Projections
                </NavLink>
                <NavLink to="/gamiply/cro" className="gamiply-item">
                  🧪 CRO Performance
                </NavLink>
                <NavLink to="/gamiply/creative" className="gamiply-item">
                  🎨 Creative Performance
                </NavLink>
              </div>
            </div>

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
          <div className="navbar-user-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {user && <NotificationBell />}

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
