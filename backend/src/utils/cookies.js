import { env } from '../config/env.js';

export const getCookieOptions = () => {
  const isProduction = env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    // Same-origin unified deployment allows sameSite: 'lax' for clean, secure cookie handling
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 1 Day matching JWT default
    path: '/'
  };
};

export const setAuthCookie = (res, token) => {
  res.cookie('token', token, getCookieOptions());
};

export const clearAuthCookie = (res) => {
  res.cookie('token', '', {
    ...getCookieOptions(),
    expires: new Date(0),
    maxAge: 0
  });
};
