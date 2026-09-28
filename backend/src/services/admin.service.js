import { User } from '../models/User.js';
import { ROLES } from '../constants/roles.js';
import { USER_STATUS } from '../constants/status.js';
import { ApiError } from '../utils/ApiError.js';

export const getAllUsers = async () => {
  // Returns all admins and active team members (excludes pending requests)
  const users = await User.find({
    $or: [
      { role: ROLES.ADMIN },
      { status: USER_STATUS.ACTIVE }
    ]
  })
    .select('-password')
    .sort({ createdAt: -1 });

  return users;
};

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

  if (user.status !== USER_STATUS.PENDING) {
    throw new ApiError(400, 'Only pending team requests can be approved.');
  }

  // TTL Boundary check: Ensure pending request has not expired
  if (user.pendingExpiresAt && new Date(user.pendingExpiresAt) < new Date()) {
    await User.findByIdAndDelete(targetUserId);
    throw new ApiError(400, 'Team signup request has expired (48-hour limit exceeded).');
  }

  user.status = USER_STATUS.ACTIVE;
  user.pendingExpiresAt = null; // Clear TTL expiration
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

  if (user.status !== USER_STATUS.PENDING) {
    throw new ApiError(400, 'Only pending team requests can be rejected.');
  }

  // Permanent deletion on rejection
  await User.findByIdAndDelete(targetUserId);

  const userObject = user.toObject();
  delete userObject.password;

  return userObject;
};

export const deleteUser = async (targetUserId, adminUserId) => {
  if (targetUserId.toString() === adminUserId.toString()) {
    throw new ApiError(403, 'Admin accounts cannot be deleted.');
  }

  const user = await User.findById(targetUserId);

  if (!user) {
    throw new ApiError(404, 'User account not found.');
  }

  // Admins cannot delete any admin account
  if (user.role === ROLES.ADMIN) {
    throw new ApiError(403, 'Admin accounts cannot be deleted.');
  }

  await User.findByIdAndDelete(targetUserId);

  const userObject = user.toObject();
  delete userObject.password;

  return userObject;
};
