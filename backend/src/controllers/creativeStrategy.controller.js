import * as creativeStrategyService from '../services/creativeStrategy.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { addSseClient } from '../services/sse.service.js';

export const handleGetRecords = async (req, res, next) => {
  try {
    const result = await creativeStrategyService.getCreativeStrategies(req.query);
    res.status(200).json(new ApiResponse(200, result, 'Creative strategies retrieved'));
  } catch (error) {
    next(error);
  }
};

export const handleGetRecordById = async (req, res, next) => {
  try {
    const record = await creativeStrategyService.getCreativeStrategyById(req.params.id);
    res.status(200).json(new ApiResponse(200, record, 'Creative strategy record retrieved'));
  } catch (error) {
    next(error);
  }
};

export const handleGetTimeline = async (req, res, next) => {
  try {
    const timeline = await creativeStrategyService.getTimeline(req.params.id);
    res.status(200).json(new ApiResponse(200, timeline, 'Timeline retrieved'));
  } catch (error) {
    next(error);
  }
};

export const handleCreateRecord = async (req, res, next) => {
  try {
    const record = await creativeStrategyService.createCreativeStrategy(req.body, req.user);
    res.status(201).json(new ApiResponse(201, record, 'Creative strategy record created'));
  } catch (error) {
    next(error);
  }
};

export const handleUnifiedCreateRecord = async (req, res, next) => {
  try {
    const record = await creativeStrategyService.unifiedCreateCreativeStrategy(req.body, req.user);
    res.status(201).json(new ApiResponse(201, record, 'Creative strategy hierarchy created successfully'));
  } catch (error) {
    next(error);
  }
};

export const handleGetTargetingLocations = async (req, res, next) => {
  try {
    const locations = await creativeStrategyService.getTargetingLocations();
    res.status(200).json(new ApiResponse(200, locations, 'Targeting locations retrieved'));
  } catch (error) {
    next(error);
  }
};

export const handleUploadCreativeFile = async (req, res, next) => {
  try {
    const { image, name, mimeType } = req.body;
    if (!image) {
      return res.status(400).json({ success: false, message: 'Image data is required' });
    }
    const result = await creativeStrategyService.uploadCreativeFile({
      fileData: image,
      fileName: name,
      mimeType,
      user: req.user
    });
    res.status(201).json(new ApiResponse(201, result, 'Creative file uploaded'));
  } catch (error) {
    next(error);
  }
};

export const handleDeleteCreativeFile = async (req, res, next) => {
  try {
    const { fileId } = req.params;
    await creativeStrategyService.deleteCreativeFile(fileId);
    res.status(200).json(new ApiResponse(200, { fileId }, 'Creative file deleted'));
  } catch (error) {
    next(error);
  }
};

export const handleUpdateRecord = async (req, res, next) => {
  try {
    const record = await creativeStrategyService.updateCreativeStrategy(
      req.params.id,
      req.body,
      req.user
    );
    res.status(200).json(new ApiResponse(200, record, 'Creative strategy record updated'));
  } catch (error) {
    next(error);
  }
};

export const handleLaunchCreative = async (req, res, next) => {
  try {
    const record = await creativeStrategyService.launchCreative(
      req.params.id,
      req.body,
      req.user
    );
    res.status(200).json(new ApiResponse(200, record, 'Creative launched successfully'));
  } catch (error) {
    next(error);
  }
};

export const handleSubmitReport = async (req, res, next) => {
  try {
    const record = await creativeStrategyService.submitReport(
      req.params.id,
      req.body,
      req.user
    );
    res.status(200).json(new ApiResponse(200, record, 'Performance report submitted'));
  } catch (error) {
    next(error);
  }
};

export const handleSubmitPerformanceAnalysis = async (req, res, next) => {
  try {
    const record = await creativeStrategyService.submitPerformanceAnalysis(
      req.params.id,
      req.body,
      req.user
    );
    res.status(200).json(new ApiResponse(200, record, 'Performance analysis submitted'));
  } catch (error) {
    next(error);
  }
};

export const handleSubmitLearnings = async (req, res, next) => {
  try {
    const record = await creativeStrategyService.submitLearnings(
      req.params.id,
      req.body,
      req.user
    );
    res.status(200).json(new ApiResponse(200, record, 'Learnings and direction submitted'));
  } catch (error) {
    next(error);
  }
};

export const handleAssignGraphicDesigner = async (req, res, next) => {
  try {
    const record = await creativeStrategyService.assignGraphicDesigner(
      req.params.id,
      req.body,
      req.user
    );
    res.status(200).json(new ApiResponse(200, record, 'Graphic designer assigned'));
  } catch (error) {
    next(error);
  }
};

export const handleCreateBrief = async (req, res, next) => {
  try {
    const record = await creativeStrategyService.createBrief(
      req.params.id,
      req.body,
      req.user
    );
    res.status(200).json(new ApiResponse(200, record, 'Brief created'));
  } catch (error) {
    next(error);
  }
};

export const handleReviewBrief = async (req, res, next) => {
  try {
    const record = await creativeStrategyService.reviewBrief(
      req.params.id,
      req.body,
      req.user
    );
    res.status(200).json(new ApiResponse(200, record, 'Brief reviewed'));
  } catch (error) {
    next(error);
  }
};

export const handleApproveBrief = async (req, res, next) => {
  try {
    const record = await creativeStrategyService.approveBrief(req.params.id, req.user);
    res.status(200).json(new ApiResponse(200, record, 'Brief approved, production started'));
  } catch (error) {
    next(error);
  }
};

export const handleSubmitProduction = async (req, res, next) => {
  try {
    const record = await creativeStrategyService.submitCreativeProduction(
      req.params.id,
      req.body,
      req.user
    );
    res.status(200).json(new ApiResponse(200, record, 'Production submitted for review'));
  } catch (error) {
    next(error);
  }
};

export const handleReviewInternalCreative = async (req, res, next) => {
  try {
    const record = await creativeStrategyService.reviewInternalCreative(
      req.params.id,
      req.body,
      req.user
    );
    res.status(200).json(new ApiResponse(200, record, 'Internal review completed'));
  } catch (error) {
    next(error);
  }
};

export const handleApproveInternalReview = async (req, res, next) => {
  try {
    const record = await creativeStrategyService.approveInternalReview(
      req.params.id,
      req.body,
      req.user
    );
    res.status(200).json(new ApiResponse(200, record, 'Internal review approved'));
  } catch (error) {
    next(error);
  }
};

export const handleClientReviewDecision = async (req, res, next) => {
  try {
    const record = await creativeStrategyService.clientReviewDecision(
      req.params.id,
      req.body,
      req.user
    );
    res.status(200).json(new ApiResponse(200, record, 'Client decision processed'));
  } catch (error) {
    next(error);
  }
};

export const handleHandoffToMediaBuyer = async (req, res, next) => {
  try {
    const record = await creativeStrategyService.handoffToMediaBuyer(req.params.id, req.user);
    res.status(200).json(new ApiResponse(200, record, 'Handed off to Media Buyer'));
  } catch (error) {
    next(error);
  }
};

export const handleCompleteAndCreateNextCycle = async (req, res, next) => {
  try {
    const result = await creativeStrategyService.completeAndCreateNextCycle(
      req.params.id,
      req.user,
      req.body || {}
    );
    res.status(200).json(new ApiResponse(200, result, 'Cycle completed and next cycle created'));
  } catch (error) {
    next(error);
  }
};

export const handlePauseCreative = async (req, res, next) => {
  try {
    const record = await creativeStrategyService.pauseCreative(req.params.id, req.user);
    res.status(200).json(new ApiResponse(200, record, 'Creative cycle paused'));
  } catch (error) {
    next(error);
  }
};

export const handleResumeCreative = async (req, res, next) => {
  try {
    const record = await creativeStrategyService.resumeCreative(req.params.id, req.user);
    res.status(200).json(new ApiResponse(200, record, 'Creative cycle resumed'));
  } catch (error) {
    next(error);
  }
};

export const handleGetCreativeDeletePreview = async (req, res, next) => {
  try {
    const preview = await creativeStrategyService.getCreativeDeletePreview(req.params.id);
    res.status(200).json(new ApiResponse(200, preview, 'Creative delete preview retrieved'));
  } catch (error) {
    next(error);
  }
};

export const handleDeleteRecord = async (req, res, next) => {
  try {
    const result = await creativeStrategyService.deleteCreativeStrategy(req.params.id);
    res.status(200).json(new ApiResponse(200, result, 'Record deleted'));
  } catch (error) {
    next(error);
  }
};

export const handleStreamEvents = (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.write(': connected\n\n');
  addSseClient(res);
};
