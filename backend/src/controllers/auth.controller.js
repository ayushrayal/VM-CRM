import { registerAdmin, registerTeamMember, authenticateUser } from '../services/auth.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { setAuthCookie, clearAuthCookie } from '../utils/cookies.js';

export const handleAdminSignup = async (req, res, next) => {
  try {
    const user = await registerAdmin(req.body);
    return res
      .status(201)
      .json(new ApiResponse(201, user, 'Admin account created successfully.'));
  } catch (error) {
    next(error);
  }
};

export const handleTeamSignup = async (req, res, next) => {
  try {
    const user = await registerTeamMember(req.body);
    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          user,
          'Registration request submitted successfully. Your account is pending admin approval.'
        )
      );
  } catch (error) {
    next(error);
  }
};

export const handleSignin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { user, token } = await authenticateUser({
      email,
      password,
      ip: req.ip
    });

    setAuthCookie(res, token);

    return res
      .status(200)
      .json(new ApiResponse(200, { user }, 'Signed in successfully.'));
  } catch (error) {
    next(error);
  }
};

export const handleSignout = async (req, res, next) => {
  try {
    clearAuthCookie(res);
    return res
      .status(200)
      .json(new ApiResponse(200, null, 'Signed out successfully.'));
  } catch (error) {
    next(error);
  }
};

export const handleGetMe = async (req, res, next) => {
  try {
    return res
      .status(200)
      .json(new ApiResponse(200, req.user, 'Current user profile retrieved.'));
  } catch (error) {
    next(error);
  }
};
