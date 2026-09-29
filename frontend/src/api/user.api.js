import { api } from './axios';

export const getTeamMembers = async (role) => {
  const params = role ? { role } : {};
  const response = await api.get('/admin/team-members', { params });
  return response.data;
};

export const updateUserTeamRole = async (userId, teamRole) => {
  const response = await api.patch(`/admin/users/${userId}/team-role`, { teamRole });
  return response.data;
};
