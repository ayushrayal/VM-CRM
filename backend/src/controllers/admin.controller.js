import {
  getAllUsers,
  getPendingTeamRequests,
  approveTeamRequest,
  rejectTeamRequest,
  deleteUser,
  updateUserTeamRole,
  getTeamMembersByRole
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

export const handleUpdateUserTeamRole = async (req, res, next) => {
  try {
    const { teamRole } = req.body;
    const updated = await updateUserTeamRole(req.params.id, teamRole);
    return res
      .status(200)
      .json(new ApiResponse(200, updated, 'User team role updated successfully.'));
  } catch (error) {
    next(error);
  }
};

export const handleGetTeamMembers = async (req, res, next) => {
  try {
    const { role } = req.query;
    const members = await getTeamMembersByRole(role);
    return res
      .status(200)
      .json(new ApiResponse(200, members, 'Team members retrieved successfully.'));
  } catch (error) {
    next(error);
  }
};

