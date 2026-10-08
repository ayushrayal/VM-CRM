import * as projectionService from '../services/projection.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const handleGetAllProjections = async (req, res, next) => {
  try {
    const projections = await projectionService.getAllProjections(req.query);
    res.status(200).json(new ApiResponse(200, projections, 'Projections retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const handleGetProjectionById = async (req, res, next) => {
  try {
    const projection = await projectionService.getProjectionById(req.params.id);
    res.status(200).json(new ApiResponse(200, projection, 'Projection retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const handleCreateProjection = async (req, res, next) => {
  try {
    const projection = await projectionService.createProjection({
      ...req.body,
      userId: req.user._id
    });
    res.status(201).json(new ApiResponse(201, projection, 'Project projection created successfully'));
  } catch (error) {
    next(error);
  }
};

export const handleUpdateProjection = async (req, res, next) => {
  try {
    const projection = await projectionService.updateProjection(req.params.id, req.body, req.user._id);
    res.status(200).json(new ApiResponse(200, projection, 'Project projection updated successfully'));
  } catch (error) {
    next(error);
  }
};

export const handleAddOrUpdateDailyTracking = async (req, res, next) => {
  try {
    const projection = await projectionService.addOrUpdateDailyTracking(
      req.params.id,
      req.body,
      req.user._id
    );
    res.status(200).json(new ApiResponse(200, projection, 'Daily tracking saved successfully'));
  } catch (error) {
    next(error);
  }
};

export const handleUpdateDailyTrackingEntry = async (req, res, next) => {
  try {
    const projection = await projectionService.updateDailyTrackingEntry(
      req.params.id,
      req.params.dailyId,
      req.body,
      req.user._id
    );
    res.status(200).json(new ApiResponse(200, projection, 'Daily tracking entry updated successfully'));
  } catch (error) {
    next(error);
  }
};

export const handleDeleteDailyTrackingEntry = async (req, res, next) => {
  try {
    const projection = await projectionService.deleteDailyTrackingEntry(
      req.params.id,
      req.params.dailyId,
      req.user._id
    );
    res.status(200).json(new ApiResponse(200, projection, 'Daily tracking entry deleted successfully'));
  } catch (error) {
    next(error);
  }
};

export const handleDeleteProjection = async (req, res, next) => {
  try {
    const result = await projectionService.deleteProjection(req.params.id);
    res.status(200).json(new ApiResponse(200, result, 'Project projection deleted successfully'));
  } catch (error) {
    next(error);
  }
};
