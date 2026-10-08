import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Login } from '../pages/auth/Login';
import { TeamSignup } from '../pages/auth/TeamSignup';
import { AdminSignup } from '../pages/auth/AdminSignup';
import { Dashboard } from '../pages/dashboard/Dashboard';
import { UserManagement } from '../pages/admin/UserManagement';
import { CreativeStrategyPage } from '../pages/creativeStrategy/CreativeStrategyPage';
import { CROGamiplyPage } from '../pages/croGamiply/CROGamiplyPage';
import { CreativeGamiplyPage } from '../pages/creativeGamiply/CreativeGamiplyPage';
import { ClientsPage } from '../pages/clients/ClientsPage';
import { ProjectionsPage } from '../pages/projections/ProjectionsPage';
import { ProjectDetailPage } from '../pages/projections/ProjectDetailPage';
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
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/projections" element={<ProjectionsPage />} />
          <Route path="/projections/:id" element={<ProjectDetailPage />} />
          <Route path="/performance/projections" element={<Navigate to="/projections" replace />} />
          <Route path="/creative-strategy" element={<CreativeStrategyPage />} />
          <Route path="/gamiply/cro" element={<CROGamiplyPage />} />
          <Route path="/cro-gamiply" element={<Navigate to="/gamiply/cro" replace />} />
          <Route path="/gamiply/creative" element={<CreativeGamiplyPage />} />
          <Route path="/creative-gamiply" element={<Navigate to="/gamiply/creative" replace />} />

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
