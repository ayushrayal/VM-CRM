import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signinApi,
  teamSignupApi,
  adminSignupApi,
  signoutApi,
  getMeApi
} from '../api/auth.api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      setLoading(true);
      const res = await getMeApi();
      if (res.success && res.data) {
        setUser(res.data);
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const signin = async (email, password) => {
    const res = await signinApi(email, password);
    if (res.success && res.data?.user) {
      setUser(res.data.user);
    }
    return res;
  };

  const teamSignup = async (name, email, password) => {
    return await teamSignupApi(name, email, password);
  };

  const adminSignup = async (name, email, password, accessKey) => {
    return await adminSignupApi(name, email, password, accessKey);
  };

  const signout = async () => {
    try {
      await signoutApi();
    } catch (err) {
      // Ignore signout error if session already expired
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        signin,
        teamSignup,
        adminSignup,
        signout,
        checkAuth
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
