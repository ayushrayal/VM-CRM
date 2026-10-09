import { api } from './axios';

export const getProjections = async (params = {}) => {
  const response = await api.get('/projections', { params });
  return Array.isArray(response) ? response : (response?.data ?? response);
};

export const getProjectionById = async (id) => {
  const response = await api.get(`/projections/${id}`);
  return response?.data ?? response;
};

export const createProjection = async (data) => {
  const response = await api.post('/projections', data);
  return response?.data ?? response;
};

export const updateProjection = async (id, data) => {
  const response = await api.patch(`/projections/${id}`, data);
  return response?.data ?? response;
};

export const addDailyTracking = async (id, data) => {
  const response = await api.post(`/projections/${id}/daily`, data);
  return response?.data ?? response;
};

export const addBulkDailyTracking = async (id, data) => {
  const response = await api.post(`/projections/${id}/daily/bulk`, data);
  return response?.data ?? response;
};

export const updateDailyTracking = async (id, dailyId, data) => {
  const response = await api.patch(`/projections/${id}/daily/${dailyId}`, data);
  return response?.data ?? response;
};

export const deleteDailyTracking = async (id, dailyId) => {
  const response = await api.delete(`/projections/${id}/daily/${dailyId}`);
  return response?.data ?? response;
};

export const deleteProjection = async (id) => {
  const response = await api.delete(`/projections/${id}`);
  return response?.data ?? response;
};
