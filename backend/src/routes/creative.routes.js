import express from 'express';
import { authGuard } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createCreativeSchema,
  updateCreativeSchema,
  creativeIdParamSchema,
  leaderboardQuerySchema,
  listCreativesQuerySchema
} from '../validators/creative.validator.js';
import {
  createCreative,
  getCreatives,
  getCreativeById,
  updateCreative,
  deleteCreative,
  getLeaderboard,
  getCreativeStats
} from '../controllers/creative.controller.js';

const router = express.Router();

// All Creative Gamiply endpoints require authentication
router.use(authGuard);

// Leaderboard & Stats
router.get('/leaderboard', validate(leaderboardQuerySchema), getLeaderboard);
router.get('/stats', getCreativeStats);

// Creatives CRUD
router.post('/creatives', validate(createCreativeSchema), createCreative);
router.get('/creatives', validate(listCreativesQuerySchema), getCreatives);
router.get('/creatives/:id', validate(creativeIdParamSchema), getCreativeById);
router.patch('/creatives/:id', validate(updateCreativeSchema), updateCreative);
router.delete('/creatives/:id', validate(creativeIdParamSchema), deleteCreative);

export default router;
