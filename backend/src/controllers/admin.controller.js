import {
  getPendingTeamRequests,
  approveTeamRequest,
  rejectTeamRequest
} from '../services/admin.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';

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
    const updatedUser = await rejectTeamRequest(req.params.id, req.user._id);
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          updatedUser,
          'Team member request rejected successfully.'
        )
      );
  } catch (error) {
    next(error);
  }
};
