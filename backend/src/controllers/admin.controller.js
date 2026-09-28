import {
  getAllUsers,
  getPendingTeamRequests,
  approveTeamRequest,
  rejectTeamRequest,
  deleteUser
} from '../services/admin.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const handleGetAllUsers = async (req, res, next) => {
  try {
    const users = await getAllUsers();
    return res
      .status(200)
      .json(new ApiResponse(200, users, 'All users retrieved successfully.'));
  } catch (error) {
    next(error);
  }
};

export const handleGetTeamRequests = async (req, res, next) => {
  try {
    const requests = await getPendingTeamRequests();
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          requests,
          'Pending team signup requests retrieved successfully.'
        )
      );
  } catch (error) {
    next(error);
  }
};

export const handleApproveTeamRequest = async (req, res, next) => {
  try {
    const updatedUser = await approveTeamRequest(req.params.id, req.user._id);
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          updatedUser,
          'Team member request approved successfully. User can now sign in.'
        )
      );
  } catch (error) {
    next(error);
  }
};

export const handleRejectTeamRequest = async (req, res, next) => {
  try {
    const deletedUser = await rejectTeamRequest(req.params.id, req.user._id);
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          deletedUser,
          'Team request rejected successfully.'
        )
      );
  } catch (error) {
    next(error);
  }
};

export const handleDeleteUser = async (req, res, next) => {
  try {
    const deletedUser = await deleteUser(req.params.id, req.user._id);
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          deletedUser,
          'User account deleted successfully.'
        )
      );
  } catch (error) {
    next(error);
  }
};
