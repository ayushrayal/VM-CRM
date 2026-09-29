import * as adSetService from '../services/adSet.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const handleGetAdSets = async (req, res, next) => {
  try {
    const { campaignId, clientId } = req.query;
    let adSets;
    if (campaignId) {
      adSets = await adSetService.getAdSetsByCampaign(campaignId);
    } else if (clientId) {
      adSets = await adSetService.getAdSetsByClient(clientId);
    } else {
      adSets = await adSetService.getAllAdSets();
    }
    res.status(200).json(new ApiResponse(200, adSets, 'Ad Sets retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const handleCreateAdSet = async (req, res, next) => {
  try {
    const adSet = await adSetService.createAdSet({
      ...req.body,
      userId: req.user._id
    });
    res.status(201).json(new ApiResponse(201, adSet, 'Ad Set created successfully'));
  } catch (error) {
    next(error);
  }
};

export const handleUpdateAdSet = async (req, res, next) => {
  try {
    const adSet = await adSetService.updateAdSet(req.params.id, req.body);
    res.status(200).json(new ApiResponse(200, adSet, 'Ad Set updated successfully'));
  } catch (error) {
    next(error);
  }
};

export const handleGetAdSetDeletePreview = async (req, res, next) => {
  try {
    const preview = await adSetService.getAdSetDeletePreview(req.params.id);
    res.status(200).json(new ApiResponse(200, preview, 'Ad Set delete preview retrieved'));
  } catch (error) {
    next(error);
  }
};

export const handleDeleteAdSet = async (req, res, next) => {
  try {
    const result = await adSetService.deleteAdSet(req.params.id);
    res.status(200).json(new ApiResponse(200, result, 'Ad Set deleted successfully'));
  } catch (error) {
    next(error);
  }
};
