import * as campaignService from '../services/campaign.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const handleGetCampaigns = async (req, res, next) => {
  try {
    const { clientId } = req.query;
    const campaigns = clientId
      ? await campaignService.getCampaignsByClient(clientId)
      : await campaignService.getAllCampaigns();
    res.status(200).json(new ApiResponse(200, campaigns, 'Campaigns retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const handleCreateCampaign = async (req, res, next) => {
  try {
    const campaign = await campaignService.createCampaign({
      ...req.body,
      userId: req.user._id
    });
    res.status(201).json(new ApiResponse(201, campaign, 'Campaign created successfully'));
  } catch (error) {
    next(error);
  }
};

export const handleUpdateCampaign = async (req, res, next) => {
  try {
    const campaign = await campaignService.updateCampaign(req.params.id, req.body);
    res.status(200).json(new ApiResponse(200, campaign, 'Campaign updated successfully'));
  } catch (error) {
    next(error);
  }
};

export const handleGetCampaignDeletePreview = async (req, res, next) => {
  try {
    const preview = await campaignService.getCampaignDeletePreview(req.params.id);
    res.status(200).json(new ApiResponse(200, preview, 'Campaign delete preview retrieved'));
  } catch (error) {
    next(error);
  }
};

export const handleDeleteCampaign = async (req, res, next) => {
  try {
    const result = await campaignService.deleteCampaign(req.params.id);
    res.status(200).json(new ApiResponse(200, result, 'Campaign deleted successfully'));
  } catch (error) {
    next(error);
  }
};
