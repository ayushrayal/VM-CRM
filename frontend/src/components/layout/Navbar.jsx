import React, { useState, useEffect, useRef } from 'react';
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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click or route change
  useEffect(() => {
    setIsDropdownOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignout = async () => {
    setIsMobileOpen(false);
    await signout();
    navigate('/login');
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const isAdmin = user?.role === 'admin';

  const isPerformanceActive =
    location.pathname.startsWith('/projections') ||
    location.pathname.startsWith('/gamiply') ||
    location.pathname === '/cro-gamiply' ||
    location.pathname === '/creative-gamiply';

  return (
    <>
      <header className="top-navbar">
        <div className="navbar-container">
          {/* 1. Left: Brand Logo */}
          <div className="navbar-section navbar-left">
            <NavLink to="/dashboard" className="brand-logo" aria-label="Vytalis Media CRM Dashboard">
              <span className="brand-text">VYTALIS MEDIA</span>
              <span className="brand-dot" />
              <span className="brand-sub">CRM</span>
            </NavLink>
          </div>

          {/* 2. Center: Desktop Navigation Links */}
          <nav className="navbar-section navbar-center desktop-nav" aria-label="Main Navigation">
            <NavLink
              to="/dashboard"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <span className="nav-label">Dashboard</span>
            </NavLink>

            <NavLink
              to="/clients"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <span className="nav-label">Clients</span>
            </NavLink>

            <NavLink
              to="/creative-strategy"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <span className="nav-label">Creative Strategy</span>
            </NavLink>

            <div
              className={`nav-gamiply-dropdown ${isDropdownOpen ? 'is-open' : ''}`}
              ref={dropdownRef}
              onMouseEnter={() => setIsDropdownOpen(true)}
              onMouseLeave={() => setIsDropdownOpen(false)}
            >
              <NavLink
                to="/projections"
                className={({ isActive }) =>
                  `nav-link nav-dropdown-trigger ${
                    isActive || isPerformanceActive ? 'active' : ''
                  }`
                }
              >
                <span className="nav-label">Performance</span>
                <span
                  className="dropdown-chevron-wrapper"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDropdownOpen((prev) => !prev);
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label="Toggle Performance submenu"
                >
                  <svg
                    className="dropdown-chevron"
                    width="10"
                    height="10"
                    viewBox="0 0 10 10"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M2 3.5L5 6.5L8 3.5"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </NavLink>

              <div className="gamiply-menu">
                <NavLink
                  to="/projections"
                  end
                  className={({ isActive }) =>
                    `gamiply-item ${isActive ? 'active' : ''}`
                  }
                  onClick={() => setIsDropdownOpen(false)}
                >
                  Project Projections
                </NavLink>
                <NavLink
                  to="/gamiply/cro"
                  className={({ isActive }) =>
                    `gamiply-item ${isActive ? 'active' : ''}`
                  }
                  onClick={() => setIsDropdownOpen(false)}
                >
                  CRO Performance
                </NavLink>
                <NavLink
                  to="/gamiply/creative"
                  className={({ isActive }) =>
                    `gamiply-item ${isActive ? 'active' : ''}`
                  }
                  onClick={() => setIsDropdownOpen(false)}
                >
                  Creative Performance
                </NavLink>
              </div>
            </div>

            {isAdmin && (
              <NavLink
                to="/user-management"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <span className="nav-label">User Management</span>
              </NavLink>
            )}
          </nav>

          {/* 3. Right: Notifications, User Avatar & Profile, Sign Out, Hamburger */}
          <div className="navbar-section navbar-right">
            {user && <NotificationBell />}

            {user && (
              <div className="user-profile-pill">
                <div className="avatar-circle">{getInitials(user.name)}</div>
                <div className="user-info">
                  <span className="user-name" title={user.name}>{user.name}</span>
                  <Badge variant={user.role} className="user-role-badge">
                    {user.role}
                  </Badge>
                </div>
              </div>
            )}

            <Button variant="ghost" size="sm" onClick={handleSignout} className="desktop-signout">
              Sign Out
            </Button>

            {/* Mobile / Tablet Hamburger Toggle */}
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
