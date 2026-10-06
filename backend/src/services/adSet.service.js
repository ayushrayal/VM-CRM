import { AdSet } from '../models/AdSet.js';
import { Campaign } from '../models/Campaign.js';
import { CreativeStrategy } from '../models/CreativeStrategy.js';
import { CreativeStrategyTimeline } from '../models/CreativeStrategyTimeline.js';
import { ApiError } from '../utils/ApiError.js';
import { broadcastEvent } from './sse.service.js';

export const getAdSetsByCampaign = async (campaignId) => {
  return await AdSet.find({ campaign: campaignId }).sort({ createdAt: -1 });
};

export const getAdSetsByClient = async (clientId) => {
  return await AdSet.find({ client: clientId }).sort({ createdAt: -1 });
};

export const getAllAdSets = async () => {
  return await AdSet.find().populate('campaign', 'name').populate('client', 'name code').sort({ createdAt: -1 });
};

export const createAdSet = async ({
  name,
  campaignId,
  launchDate,
  budget,
  ageGroup,
  gender,
  includedLocations,
  excludedLocations,
  targeting,
  interests,
  partOfCurrentCycle,
  status,
  currentTestingCycle,
  userId
}) => {
  const campaign = await Campaign.findById(campaignId);
  if (!campaign) {
    throw new ApiError(404, 'Campaign not found');
  }

  const adSet = await AdSet.create({
    name: name.trim(),
    campaign: campaignId,
    client: campaign.client,
    launchDate: launchDate ? new Date(launchDate) : null,
    budget: budget !== undefined ? budget : null,
    ageGroup: ageGroup || { start: 18, end: 65 },
    gender: gender || 'Both',
    includedLocations: Array.isArray(includedLocations) ? includedLocations : [],
    excludedLocations: Array.isArray(excludedLocations) ? excludedLocations : [],
    targeting: targeting || 'Broad',
    interests: Array.isArray(interests) ? interests : [],
    partOfCurrentCycle: partOfCurrentCycle !== undefined ? partOfCurrentCycle : true,
    status: status || 'ACTIVE',
    currentTestingCycle: currentTestingCycle || 1,
    createdBy: userId
  });

  broadcastEvent('AD_SET_CREATED', adSet);
  return adSet;
};

export const updateAdSet = async (adSetId, updateData) => {
  const adSet = await AdSet.findById(adSetId);
  if (!adSet) {
    throw new ApiError(404, 'Ad Set not found');
  }

  if (updateData.name !== undefined) adSet.name = updateData.name.trim();
  if (updateData.launchDate !== undefined) {
    adSet.launchDate = updateData.launchDate ? new Date(updateData.launchDate) : null;
  }
  if (updateData.budget !== undefined) adSet.budget = updateData.budget;
  if (updateData.ageGroup !== undefined) adSet.ageGroup = updateData.ageGroup;
  if (updateData.gender !== undefined) adSet.gender = updateData.gender;
  if (updateData.includedLocations !== undefined) adSet.includedLocations = updateData.includedLocations;
  if (updateData.excludedLocations !== undefined) adSet.excludedLocations = updateData.excludedLocations;
  if (updateData.targeting !== undefined) adSet.targeting = updateData.targeting;
  if (updateData.interests !== undefined) adSet.interests = updateData.interests;
  if (updateData.partOfCurrentCycle !== undefined) adSet.partOfCurrentCycle = updateData.partOfCurrentCycle;
  if (updateData.status !== undefined) adSet.status = updateData.status;
  if (updateData.currentTestingCycle !== undefined) {
    adSet.currentTestingCycle = updateData.currentTestingCycle;
  }

  await adSet.save();

  // If ad set name changed, also update cached currentAdSetName in CreativeStrategy records
  if (updateData.name !== undefined) {
    await CreativeStrategy.updateMany({ adSet: adSetId }, { currentAdSetName: adSet.name });
  }

  broadcastEvent('AD_SET_UPDATED', adSet);
  return adSet;
};

export const getAdSetDeletePreview = async (adSetId) => {
  const adSet = await AdSet.findById(adSetId)
    .populate('campaign', 'name')
    .populate('client', 'name');
  if (!adSet) {
    throw new ApiError(404, 'Ad Set not found');
  }

  const recordsCount = await CreativeStrategy.countDocuments({ adSet: adSetId });

  return {
    adSetId: adSet._id,
    adSetName: adSet.name,
    campaignName: adSet.campaign?.name || 'N/A',
    clientName: adSet.client?.name || 'N/A',
    recordsCount
  };
};

export const deleteAdSet = async (adSetId) => {
  const adSet = await AdSet.findById(adSetId);
  if (!adSet) {
    throw new ApiError(404, 'Ad Set not found');
  }

  const records = await CreativeStrategy.find({ adSet: adSetId }).select('_id');
  const recordIds = records.map((r) => r._id);

  if (recordIds.length > 0) {
    await CreativeStrategyTimeline.deleteMany({ creativeStrategy: { $in: recordIds } });
    await CreativeStrategy.deleteMany({ _id: { $in: recordIds } });
  }

  await AdSet.findByIdAndDelete(adSetId);

  broadcastEvent('AD_SET_DELETED', { adSetId });
  return { deletedAdSetId: adSetId };
};
