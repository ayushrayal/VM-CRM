import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://localhost:5000/api',
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
