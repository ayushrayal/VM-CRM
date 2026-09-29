import { Router } from 'express';
import {
  handleGetAdSets,
  handleCreateAdSet,
  handleUpdateAdSet,
  handleGetAdSetDeletePreview,
  handleDeleteAdSet
} from '../controllers/adSet.controller.js';
import { authGuard } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createAdSetSchema,
  updateAdSetSchema,
  adSetIdParamSchema
} from '../validators/adSet.validator.js';
import { ROLES } from '../constants/roles.js';

const router = Router();

router.use(authGuard);

router.get('/', handleGetAdSets);
router.post('/', validate(createAdSetSchema), handleCreateAdSet);
router.patch('/:id', validate(updateAdSetSchema), handleUpdateAdSet);

// Admin-only deletion preview and execution
router.get(
  '/:id/delete-preview',
  requireRole(ROLES.ADMIN),
  validate(adSetIdParamSchema),
  handleGetAdSetDeletePreview
);
router.delete(
  '/:id',
  requireRole(ROLES.ADMIN),
  validate(adSetIdParamSchema),
  handleDeleteAdSet
);

export default router;
