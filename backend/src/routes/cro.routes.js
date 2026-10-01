import express from 'express';
import { authGuard } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createCroExperimentSchema,
  updateCroExperimentSchema,
  croExperimentIdParamSchema,
  leaderboardQuerySchema,
  listCroExperimentsQuerySchema
} from '../validators/cro.validator.js';
import {
  createExperiment,
  getExperiments,
  getExperimentById,
  updateExperiment,
  deleteExperiment,
  getLeaderboard,
  getCroStats,
  uploadScreenshot
} from '../controllers/cro.controller.js';

const router = express.Router();

// All CRO endpoints require authentication
router.use(authGuard);

// Leaderboard & User/Global Stats
router.get('/leaderboard', validate(leaderboardQuerySchema), getLeaderboard);
router.get('/stats', getCroStats);

// Screenshot upload with 10mb json body limit for base64 image data
router.post('/upload', express.json({ limit: '10mb' }), uploadScreenshot);

// Experiments CRUD
router.post('/experiments', validate(createCroExperimentSchema), createExperiment);
router.get('/experiments', validate(listCroExperimentsQuerySchema), getExperiments);
router.get('/experiments/:id', validate(croExperimentIdParamSchema), getExperimentById);
router.patch('/experiments/:id', validate(updateCroExperimentSchema), updateExperiment);
router.delete('/experiments/:id', validate(croExperimentIdParamSchema), deleteExperiment);

export default router;
