import { api } from './axios';

export const getCreatives = async (params = {}) => {
  return await api.get('/creative/creatives', { params });
};

export const getCreativeById = async (id) => {
  return await api.get(`/creative/creatives/${id}`);
};

export const createCreative = async (data) => {
  return await api.post('/creative/creatives', data);
};

export const updateCreative = async (id, data) => {
  return await api.patch(`/creative/creatives/${id}`, data);
};

export const deleteCreative = async (id) => {
  return await api.delete(`/creative/creatives/${id}`);
};

export const getCreativeLeaderboard = async (period = 'all_time') => {
  return await api.get('/creative/leaderboard', { params: { period } });
};

export const getCreativeStats = async () => {
  return await api.get('/creative/stats');
};
