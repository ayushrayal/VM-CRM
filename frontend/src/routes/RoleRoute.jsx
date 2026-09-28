import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const RoleRoute = ({ allowedRoles = ['admin'] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner label="Verifying permissions..." />;
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};
