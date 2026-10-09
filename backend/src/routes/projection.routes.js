import { Router } from 'express';
import {
  handleGetAllProjections,
  handleGetProjectionById,
  handleCreateProjection,
  handleUpdateProjection,
  handleAddOrUpdateDailyTracking,
  handleBulkDailyTracking,
  handleUpdateDailyTrackingEntry,
  handleDeleteDailyTrackingEntry,
  handleDeleteProjection
} from '../controllers/projection.controller.js';
import { authGuard } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createProjectionSchema,
  updateProjectionSchema,
  addDailyTrackingSchema,
  addBulkDailyTrackingSchema,
  updateDailyTrackingSchema,
  projectionIdParamSchema,
  dailyIdParamSchema,
  projectionQuerySchema
} from '../validators/projection.validator.js';
import { ROLES } from '../constants/roles.js';

const router = Router();

router.use(authGuard);

router.get('/', validate(projectionQuerySchema), handleGetAllProjections);
router.post('/', validate(createProjectionSchema), handleCreateProjection);

router.get('/:id', validate(projectionIdParamSchema), handleGetProjectionById);
router.patch('/:id', validate(updateProjectionSchema), handleUpdateProjection);
router.delete('/:id', requireRole(ROLES.ADMIN), validate(projectionIdParamSchema), handleDeleteProjection);

// Daily tracking routes
router.post('/:id/daily', validate(addDailyTrackingSchema), handleAddOrUpdateDailyTracking);
router.post('/:id/daily/bulk', validate(addBulkDailyTrackingSchema), handleBulkDailyTracking);
router.patch('/:id/daily/:dailyId', validate(updateDailyTrackingSchema), handleUpdateDailyTrackingEntry);
router.delete('/:id/daily/:dailyId', validate(dailyIdParamSchema), handleDeleteDailyTrackingEntry);

export default router;
