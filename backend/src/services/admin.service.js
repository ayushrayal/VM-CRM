import { User } from '../models/User.js';
import { CreativeStrategy } from '../models/CreativeStrategy.js';
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

  // Nullify active workflow assignments without altering historical audit timelines
  await CreativeStrategy.updateMany({ assignedMediaBuyer: targetUserId }, { assignedMediaBuyer: null });
  await CreativeStrategy.updateMany({ assignedCreativeStrategist: targetUserId }, { assignedCreativeStrategist: null });
  await CreativeStrategy.updateMany({ assignedGraphicDesigner: targetUserId }, { assignedGraphicDesigner: null });
  await CreativeStrategy.updateMany({ assignedTo: targetUserId }, { assignedTo: null });

  await User.findByIdAndDelete(targetUserId);

  const userObject = user.toObject();
  delete userObject.password;

  return userObject;
};

export const updateUserTeamRole = async (targetUserId, teamRole) => {
  const user = await User.findById(targetUserId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (user.role === ROLES.ADMIN) {
    throw new ApiError(400, 'Cannot assign functional team roles to admin accounts.');
  }

  const normalizedRole = (!teamRole || teamRole === 'unassigned' || teamRole === 'none') ? 'none' : teamRole;
  const validRoles = ['media_buyer', 'creative_strategist', 'graphic_designer', 'none'];
  if (!validRoles.includes(normalizedRole)) {
    throw new ApiError(400, `Invalid team role. Allowed roles: ${validRoles.join(', ')}`);
  }

  const oldTeamRole = user.teamRole;
  user.teamRole = normalizedRole;
  await user.save();

  // If the user's functional role changed, safely nullify their active assignment for the old role
  if (oldTeamRole === 'media_buyer' && normalizedRole !== 'media_buyer') {
    await CreativeStrategy.updateMany({ assignedMediaBuyer: user._id }, { assignedMediaBuyer: null });
  }
  if (oldTeamRole === 'creative_strategist' && normalizedRole !== 'creative_strategist') {
    await CreativeStrategy.updateMany({ assignedCreativeStrategist: user._id }, { assignedCreativeStrategist: null });
  }
  if (oldTeamRole === 'graphic_designer' && normalizedRole !== 'graphic_designer') {
    await CreativeStrategy.updateMany({ assignedGraphicDesigner: user._id }, { assignedGraphicDesigner: null });
  }

  const userObject = user.toObject();
  delete userObject.password;
  return userObject;
};

export const getTeamMembersByRole = async (roleFilter) => {
  const query = {
    status: USER_STATUS.ACTIVE
  };

  if (roleFilter && roleFilter !== 'all') {
    // Functional roles are exclusive to team members
    query.role = ROLES.TEAM;
    query.teamRole = roleFilter;
  } else {
    // All active users (admins + team) for general assignedTo
    query.$or = [{ role: ROLES.ADMIN }, { status: USER_STATUS.ACTIVE }];
    delete query.status;
  }

  const users = await User.find(query)
    .select('name email role teamRole status')
    .sort({ name: 1 });

  return users;
};

