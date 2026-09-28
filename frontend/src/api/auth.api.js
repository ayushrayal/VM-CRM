import { api } from './axios';

export const signinApi = async (email, password) => {
  return await api.post('/auth/signin', { email, password });
};

export const teamSignupApi = async (name, email, password) => {
  return await api.post('/auth/signup', { name, email, password });
};

export const adminSignupApi = async (name, email, password, accessKey) => {
  return await api.post('/auth/admin/signup', { name, email, password, accessKey });
};

export const signoutApi = async () => {
  return await api.post('/auth/signout');
};

export const getMeApi = async () => {
  return await api.get('/auth/me');
};
