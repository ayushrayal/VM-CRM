import { api } from './axios';

export const getClients = async () => {
  const response = await api.get('/clients');
  return response.data;
};

export const getClientById = async (id) => {
  const response = await api.get(`/clients/${id}`);
  return response.data;
};

export const createClient = async (data) => {
  const response = await api.post('/clients', data);
  return response.data;
};

export const updateClient = async (id, data) => {
  const response = await api.patch(`/clients/${id}`, data);
  return response.data;
};

export const getClientDeletePreview = async (id) => {
  const response = await api.get(`/clients/${id}/delete-preview`);
  return response.data;
};

export const deleteClient = async (id) => {
  const response = await api.delete(`/clients/${id}`);
  return response.data;
};
