import axios from 'axios';

// Centralized API base URL:
// 1. If VITE_API_URL is explicitly set, honor it.
// 2. In local development with Vite dev server (import.meta.env.DEV), default to 'http://localhost:5000/api'.
// 3. In production on Render (where Express serves React from the same origin), default to '/api'.
const rawApiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : '/api');

export const API_BASE_URL = rawApiUrl.endsWith('/api')
  ? rawApiUrl
  : `${rawApiUrl.replace(/\/$/, '')}/api`;

export const getStreamUrl = (path = '/creative-strategy/stream') => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
};

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const customError = {
      statusCode: error.response?.status || 500,
      message: error.response?.data?.message || 'An unexpected server error occurred.',
      errors: error.response?.data?.errors || []
    };
    return Promise.reject(customError);
  }
);
