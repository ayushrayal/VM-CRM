import { Campaign } from '../models/Campaign.js';
import { Client } from '../models/Client.js';
import { AdSet } from '../models/AdSet.js';
import { CreativeStrategy } from '../models/CreativeStrategy.js';
import { CreativeStrategyTimeline } from '../models/CreativeStrategyTimeline.js';
import { ApiError } from '../utils/ApiError.js';
import { broadcastEvent } from './sse.service.js';

export const getCampaignsByClient = async (clientId) => {
  return await Campaign.find({ client: clientId }).sort({ createdAt: -1 });
};

export const getAllCampaigns = async () => {
  return await Campaign.find().populate('client', 'name code').sort({ createdAt: -1 });
};

export const createCampaign = async ({ name, clientId, launchDate, status, notes, userId }) => {
  const client = await Client.findById(clientId);
  if (!client) {
    throw new ApiError(404, 'Client not found');
  }

  const campaign = await Campaign.create({
    name: name.trim(),
    client: clientId,
    launchDate: launchDate ? new Date(launchDate) : null,
    status: status || 'ACTIVE',
    notes: notes ? notes.trim() : '',
    createdBy: userId
  });

  broadcastEvent('CAMPAIGN_CREATED', campaign);
  return campaign;
};

export const updateCampaign = async (campaignId, updateData) => {
  const campaign = await Campaign.findById(campaignId);
  if (!campaign) {
    throw new ApiError(404, 'Campaign not found');
  }

  if (updateData.name !== undefined) campaign.name = updateData.name.trim();
  if (updateData.launchDate !== undefined) {
    campaign.launchDate = updateData.launchDate ? new Date(updateData.launchDate) : null;
  }
  if (updateData.status !== undefined) campaign.status = updateData.status;
  if (updateData.notes !== undefined) campaign.notes = updateData.notes.trim();

  await campaign.save();

  // If campaign name changed, also update cached campaignName in CreativeStrategy records
  if (updateData.name !== undefined) {
    await CreativeStrategy.updateMany({ campaign: campaignId }, { campaignName: campaign.name });
  }

  broadcastEvent('CAMPAIGN_UPDATED', campaign);
  return campaign;
};

export const getCampaignDeletePreview = async (campaignId) => {
  const campaign = await Campaign.findById(campaignId).populate('client', 'name');
  if (!campaign) {
    throw new ApiError(404, 'Campaign not found');
  }

  const adSetsCount = await AdSet.countDocuments({ campaign: campaignId });
  const recordsCount = await CreativeStrategy.countDocuments({ campaign: campaignId });

  return {
    campaignId: campaign._id,
    campaignName: campaign.name,
    clientName: campaign.client?.name || 'N/A',
    adSetsCount,
    recordsCount
  };
};

export const deleteCampaign = async (campaignId) => {
  const campaign = await Campaign.findById(campaignId);
  if (!campaign) {
    throw new ApiError(404, 'Campaign not found');
  }

  const records = await CreativeStrategy.find({ campaign: campaignId }).select('_id');
  const recordIds = records.map((r) => r._id);

  if (recordIds.length > 0) {
    await CreativeStrategyTimeline.deleteMany({ creativeStrategy: { $in: recordIds } });
    await CreativeStrategy.deleteMany({ _id: { $in: recordIds } });
  }

  await AdSet.deleteMany({ campaign: campaignId });
  await Campaign.findByIdAndDelete(campaignId);

  broadcastEvent('CAMPAIGN_DELETED', { campaignId });
  return { deletedCampaignId: campaignId };
};
