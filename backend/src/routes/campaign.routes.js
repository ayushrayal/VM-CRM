import { Router } from 'express';
import {
  handleGetCampaigns,
  handleCreateCampaign,
  handleUpdateCampaign,
  handleGetCampaignDeletePreview,
  handleDeleteCampaign
} from '../controllers/campaign.controller.js';
import { authGuard } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createCampaignSchema,
  updateCampaignSchema,
  campaignIdParamSchema
} from '../validators/campaign.validator.js';
import { ROLES } from '../constants/roles.js';

const router = Router();

router.use(authGuard);

router.get('/', handleGetCampaigns);
router.post('/', validate(createCampaignSchema), handleCreateCampaign);
router.patch('/:id', validate(updateCampaignSchema), handleUpdateCampaign);

// Admin-only deletion preview and execution
router.get(
  '/:id/delete-preview',
  requireRole(ROLES.ADMIN),
  validate(campaignIdParamSchema),
  handleGetCampaignDeletePreview
);
router.delete(
  '/:id',
  requireRole(ROLES.ADMIN),
  validate(campaignIdParamSchema),
  handleDeleteCampaign
);

export default router;
