import { Router } from 'express';
import {
  handleGetAllClients,
  handleGetClientById,
  handleCreateClient,
  handleUpdateClient,
  handleGetClientDeletePreview,
  handleDeleteClient
} from '../controllers/client.controller.js';
import { authGuard } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createClientSchema,
  updateClientSchema,
  clientIdParamSchema
} from '../validators/client.validator.js';
import { ROLES } from '../constants/roles.js';

const router = Router();

router.use(authGuard);

router.get('/', handleGetAllClients);
router.get('/:id', validate(clientIdParamSchema), handleGetClientById);
router.post('/', validate(createClientSchema), handleCreateClient);
router.patch('/:id', validate(updateClientSchema), handleUpdateClient);

// Delete preview & cascade delete: Admin only!
router.get(
  '/:id/delete-preview',
  requireRole(ROLES.ADMIN),
  validate(clientIdParamSchema),
  handleGetClientDeletePreview
);
router.delete(
  '/:id',
  requireRole(ROLES.ADMIN),
  validate(clientIdParamSchema),
  handleDeleteClient
);

export default router;
