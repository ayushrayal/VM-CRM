import { Router } from 'express';
import {
  handleGetRecords,
  handleGetRecordById,
  handleGetTimeline,
  handleCreateRecord,
  handleUpdateRecord,
  handleLaunchCreative,
  handleSubmitReport,
  handleSubmitPerformanceAnalysis,
  handleSubmitLearnings,
  handleAssignGraphicDesigner,
  handleCreateBrief,
  handleReviewBrief,
  handleApproveBrief,
  handleSubmitProduction,
  handleReviewInternalCreative,
  handleApproveInternalReview,
  handleClientReviewDecision,
  handleHandoffToMediaBuyer,
  handleCompleteAndCreateNextCycle,
  handlePauseCreative,
  handleResumeCreative,
  handleGetCreativeDeletePreview,
  handleDeleteRecord,
  handleStreamEvents
} from '../controllers/creativeStrategy.controller.js';
import { authGuard } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createCreativeStrategySchema,
  updateCreativeStrategySchema,
  recordIdParamSchema,
  launchCreativeSchema,
  submitReportSchema,
  submitPerformanceAnalysisSchema,
  submitLearningsSchema,
  createBriefSchema,
  reviewBriefSchema,
  submitProductionSchema,
  reviewInternalReviewSchema,
  approveInternalReviewSchema,
  clientReviewDecisionSchema,
  finalApprovalSchema,
  launchNextCycleSchema
} from '../validators/creativeStrategy.validator.js';
import { ROLES } from '../constants/roles.js';

const router = Router();

// Stream endpoint for real-time SSE updates
router.get('/stream', handleStreamEvents);

router.use(authGuard);

router.get('/', handleGetRecords);
router.post('/', validate(createCreativeStrategySchema), handleCreateRecord);

router.get('/:id', validate(recordIdParamSchema), handleGetRecordById);
router.patch('/:id', validate(updateCreativeStrategySchema), handleUpdateRecord);

// Admin-only deletion preview and execution
router.get(
  '/:id/delete-preview',
  requireRole(ROLES.ADMIN),
  validate(recordIdParamSchema),
  handleGetCreativeDeletePreview
);
router.delete(
  '/:id',
  requireRole(ROLES.ADMIN),
  validate(recordIdParamSchema),
  handleDeleteRecord
);

router.get('/:id/timeline', validate(recordIdParamSchema), handleGetTimeline);

// Operational Workflow Endpoints
router.post(
  '/:id/launch',
  validate(launchCreativeSchema),
  handleLaunchCreative
);

router.post(
  '/:id/report',
  validate(submitReportSchema),
  handleSubmitReport
);

router.post(
  '/:id/performance-analysis',
  validate(submitPerformanceAnalysisSchema),
  handleSubmitPerformanceAnalysis
);

router.post(
  '/:id/learnings',
  validate(submitLearningsSchema),
  handleSubmitLearnings
);

router.post(
  '/:id/assign-designer',
  validate(recordIdParamSchema),
  handleAssignGraphicDesigner
);

router.post(
  '/:id/brief',
  validate(createBriefSchema),
  handleCreateBrief
);

router.post(
  '/:id/review-brief',
  validate(reviewBriefSchema),
  handleReviewBrief
);

router.post(
  '/:id/approve-brief',
  validate(recordIdParamSchema),
  handleApproveBrief
);

router.post(
  '/:id/production',
  validate(submitProductionSchema),
  handleSubmitProduction
);

router.post(
  '/:id/internal-review',
  validate(reviewInternalReviewSchema),
  handleReviewInternalCreative
);

router.post(
  '/:id/approve-internal-review',
  validate(approveInternalReviewSchema),
  handleApproveInternalReview
);

router.post(
  '/:id/client-review',
  requireRole(ROLES.ADMIN),
  validate(clientReviewDecisionSchema),
  handleClientReviewDecision
);

router.post(
  '/:id/final-approval',
  requireRole(ROLES.ADMIN),
  validate(finalApprovalSchema),
  handleClientReviewDecision
);

router.post(
  '/:id/handoff',
  validate(recordIdParamSchema),
  handleHandoffToMediaBuyer
);

router.post(
  '/:id/complete-cycle',
  validate(launchNextCycleSchema),
  handleCompleteAndCreateNextCycle
);

router.post(
  '/:id/pause',
  requireRole(ROLES.ADMIN),
  validate(recordIdParamSchema),
  handlePauseCreative
);

router.post(
  '/:id/resume',
  requireRole(ROLES.ADMIN),
  validate(recordIdParamSchema),
  handleResumeCreative
);

export default router;
