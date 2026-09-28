import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Login } from '../pages/auth/Login';
import { TeamSignup } from '../pages/auth/TeamSignup';
import { AdminSignup } from '../pages/auth/AdminSignup';
import { Dashboard } from '../pages/dashboard/Dashboard';
import { UserManagement } from '../pages/admin/UserManagement';
import { AppLayout } from '../components/layout/AppLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { RoleRoute } from './RoleRoute';

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Authentication Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<TeamSignup />} />
      <Route path="/admin/signup" element={<AdminSignup />} />

      {/* Protected Routes (Requires Auth & Uses Top Navbar AppLayout) */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Role Protected Routes (Admin Only) */}
          <Route element={<RoleRoute allowedRoles={['admin']} />}>
            <Route path="/user-management" element={<UserManagement />} />
          </Route>
        </Route>
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};
