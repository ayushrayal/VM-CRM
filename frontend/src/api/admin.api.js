import { api } from './axios';

export const getAllUsersApi = async () => {
  return await api.get('/admin/users');
};

export const deleteUserApi = async (id) => {
  return await api.delete(`/admin/users/${id}`);
};

export const getTeamRequestsApi = async () => {
  return await api.get('/admin/team-requests');
};

export const approveTeamRequestApi = async (id) => {
  return await api.patch(`/admin/team-requests/${id}/approve`);
};

export const rejectTeamRequestApi = async (id) => {
  return await api.patch(`/admin/team-requests/${id}/reject`);
};

export const updateUserTeamRoleApi = async (id, teamRole) => {
  return await api.patch(`/admin/users/${id}/team-role`, { teamRole });
};

