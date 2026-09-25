import { User } from '../models/User.js';
import { ROLES } from '../constants/roles.js';
import { USER_STATUS } from '../constants/status.js';
import { ApiError } from '../utils/ApiError.js';

export const getPendingTeamRequests = async () => {
  const pendingUsers = await User.find({
    role: ROLES.TEAM,
    status: USER_STATUS.PENDING
  })
    .select('-password')
    .sort({ createdAt: -1 });

  return pendingUsers;
};

export const approveTeamRequest = async (targetUserId, adminUserId) => {
  if (targetUserId.toString() === adminUserId.toString()) {
    throw new ApiError(400, 'You cannot modify your own admin account status.');
  }

  const user = await User.findById(targetUserId);

  if (!user) {
    throw new ApiError(404, 'Team signup request not found.');
  }

  if (user.role !== ROLES.TEAM) {
    throw new ApiError(400, 'Cannot modify status of an admin account.');
  }

  if (user.status === USER_STATUS.ACTIVE) {
    throw new ApiError(400, 'User is already active.');
  }

  if (user.status === USER_STATUS.REJECTED) {
    throw new ApiError(
      400,
      'User request is currently rejected. Only pending requests can be approved.'
    );
  }

  if (user.status !== USER_STATUS.PENDING) {
    throw new ApiError(400, 'Only pending team requests can be approved.');
  }

  user.status = USER_STATUS.ACTIVE;
  await user.save();

  const userObject = user.toObject();
  delete userObject.password;

  return userObject;
};

export const rejectTeamRequest = async (targetUserId, adminUserId) => {
  if (targetUserId.toString() === adminUserId.toString()) {
    throw new ApiError(400, 'You cannot modify your own admin account status.');
  }

  const user = await User.findById(targetUserId);

  if (!user) {
    throw new ApiError(404, 'Team signup request not found.');
  }

  if (user.role !== ROLES.TEAM) {
    throw new ApiError(400, 'Cannot modify status of an admin account.');
  }

  if (user.status === USER_STATUS.REJECTED) {
    throw new ApiError(400, 'User is already rejected.');
  }

  if (user.status === USER_STATUS.ACTIVE) {
    throw new ApiError(
      400,
      'User is already active. Only pending requests can be rejected.'
    );
  }

  if (user.status !== USER_STATUS.PENDING) {
    throw new ApiError(400, 'Only pending team requests can be rejected.');
  }

  user.status = USER_STATUS.REJECTED;
  await user.save();

  const userObject = user.toObject();
  delete userObject.password;

  return userObject;
};
