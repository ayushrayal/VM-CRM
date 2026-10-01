import { api } from './axios';

export const getCroExperiments = async (params = {}) => {
  return await api.get('/cro/experiments', { params });
};

export const getCroExperimentById = async (id) => {
  return await api.get(`/cro/experiments/${id}`);
};

export const createCroExperiment = async (data) => {
  return await api.post('/cro/experiments', data);
};

export const updateCroExperiment = async (id, data) => {
  return await api.patch(`/cro/experiments/${id}`, data);
};

export const deleteCroExperiment = async (id) => {
  return await api.delete(`/cro/experiments/${id}`);
};

export const getCroLeaderboard = async (period = 'all_time') => {
  return await api.get('/cro/leaderboard', { params: { period } });
};

export const getCroStats = async () => {
  return await api.get('/cro/stats');
};

export const uploadCroScreenshot = async (base64Image, name = 'screenshot', type = 'before') => {
  return await api.post('/cro/upload', { image: base64Image, name, type });
};
