import { api } from './axios';

export const getAdSets = async (params = {}) => {
  const response = await api.get('/ad-sets', { params });
  return response.data;
};

export const createAdSet = async (data) => {
  const response = await api.post('/ad-sets', data);
  return response.data;
};

export const updateAdSet = async (id, data) => {
  const response = await api.patch(`/ad-sets/${id}`, data);
  return response.data;
};

export const getAdSetDeletePreview = async (id) => {
  const response = await api.get(`/ad-sets/${id}/delete-preview`);
  return response.data;
};

export const deleteAdSet = async (id) => {
  const response = await api.delete(`/ad-sets/${id}`);
  return response.data;
};
