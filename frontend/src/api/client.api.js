import { api } from './axios';

export const getClients = async (params = {}) => {
  const response = await api.get('/clients', { params });
  return Array.isArray(response) ? response : (response?.data ?? response);
};

export const getClientById = async (id) => {
  const response = await api.get(`/clients/${id}`);
  return response?.data ?? response;
};

export const createClient = async (data) => {
  const response = await api.post('/clients', data);
  return response?.data ?? response;
};

export const updateClient = async (id, data) => {
  const response = await api.patch(`/clients/${id}`, data);
  return response?.data ?? response;
};

export const getClientDeletePreview = async (id) => {
  const response = await api.get(`/clients/${id}/delete-preview`);
  return response?.data ?? response;
};

export const deleteClient = async (id) => {
  const response = await api.delete(`/clients/${id}`);
  return response?.data ?? response;
};

