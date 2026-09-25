import { Router } from 'express';
import {
  handleGetTeamRequests,
  handleApproveTeamRequest,
  handleRejectTeamRequest
} from '../controllers/admin.controller.js';
import { authGuard } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { teamRequestIdParamSchema } from '../validators/admin.validator.js';
import { ROLES } from '../constants/roles.js';

const router = Router();

// Apply authGuard and requireRole(ADMIN) globally to all admin routes
router.use(authGuard, requireRole(ROLES.ADMIN));

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
