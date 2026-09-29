import { Router } from 'express';
import {
  handleGetAllUsers,
  handleGetTeamRequests,
  handleApproveTeamRequest,
  handleRejectTeamRequest,
  handleDeleteUser,
  handleUpdateUserTeamRole,
  handleGetTeamMembers
} from '../controllers/admin.controller.js';
import { authGuard } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  teamRequestIdParamSchema,
  updateUserTeamRoleSchema
} from '../validators/admin.validator.js';
import { ROLES } from '../constants/roles.js';

const router = Router();

// Allow all authenticated users to fetch team members for assignments
router.get('/team-members', authGuard, handleGetTeamMembers);

// Apply authGuard and requireRole(ADMIN) globally to remaining admin routes
router.use(authGuard, requireRole(ROLES.ADMIN));

router.get('/users', handleGetAllUsers);

router.delete(
  '/users/:id',
  validate(teamRequestIdParamSchema),
  handleDeleteUser
);

router.patch(
  '/users/:id/team-role',
  validate(updateUserTeamRoleSchema),
  handleUpdateUserTeamRole
);

router.get('/team-requests', handleGetTeamRequests);

router.patch(
  '/team-requests/:id/approve',
  validate(teamRequestIdParamSchema),
  handleApproveTeamRequest
);

router.patch(
  '/team-requests/:id/reject',
  validate(teamRequestIdParamSchema),
  handleRejectTeamRequest
);

export default router;
