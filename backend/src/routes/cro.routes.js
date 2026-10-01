import express from 'express';
import { authGuard } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createCroExperimentSchema,
  updateCroExperimentSchema,
  croExperimentIdParamSchema,
  leaderboardQuerySchema,
  listCroExperimentsQuerySchema,
  deleteCroUploadParamSchema,
  deleteCroExperimentImageParamSchema
} from '../validators/cro.validator.js';
import {
  createExperiment,
  getExperiments,
  getExperimentById,
  updateExperiment,
  deleteExperiment,
  getLeaderboard,
  getCroStats,
  uploadScreenshot,
  deleteUploadedScreenshot,
  deleteExperimentImage
} from '../controllers/cro.controller.js';

const router = express.Router();

// All CRO endpoints require authentication
router.use(authGuard);

// Leaderboard & User/Global Stats
router.get('/leaderboard', validate(leaderboardQuerySchema), getLeaderboard);
router.get('/stats', getCroStats);

// Screenshot upload & deletion
router.post('/upload', express.json({ limit: '10mb' }), uploadScreenshot);
router.delete('/upload/:fileId', validate(deleteCroUploadParamSchema), deleteUploadedScreenshot);

// Experiments CRUD
router.post('/experiments', validate(createCroExperimentSchema), createExperiment);
router.get('/experiments', validate(listCroExperimentsQuerySchema), getExperiments);
router.get('/experiments/:id', validate(croExperimentIdParamSchema), getExperimentById);
router.patch('/experiments/:id', validate(updateCroExperimentSchema), updateExperiment);
router.delete('/experiments/:id', validate(croExperimentIdParamSchema), deleteExperiment);
router.delete(
  '/experiments/:id/images/:fileId',
  validate(deleteCroExperimentImageParamSchema),
  deleteExperimentImage
);

export default router;
