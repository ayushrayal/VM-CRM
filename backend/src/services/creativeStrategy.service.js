import mongoose from 'mongoose';
import { CreativeStrategy } from '../models/CreativeStrategy.js';
import { CreativeStrategyTimeline } from '../models/CreativeStrategyTimeline.js';
import { Client } from '../models/Client.js';
import { Campaign } from '../models/Campaign.js';
import { AdSet } from '../models/AdSet.js';
import { User } from '../models/User.js';
import {
  WORKFLOW_STATUS,
  ABHISHEK_DECISION,
  REVIEW_STATUS,
  TIMELINE_ACTION
} from '../constants/creativeWorkflow.js';
import { ApiError } from '../utils/ApiError.js';
import { broadcastEvent } from './sse.service.js';
import * as notificationService from './notification.service.js';
import { uploadImage, deleteImage } from './imagekit.service.js';

export const formatDuration = (ms) => {
  if (!ms || ms < 0) return '0m';
  const totalMinutes = Math.floor(ms / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
};

const getActorRole = (user) => {
  if (!user) return 'System';
  if (user.role === 'admin') return 'Admin';
  if (user.teamRole === 'media_buyer') return 'Media Buyer';
  if (user.teamRole === 'creative_strategist') return 'Creative Strategist';
  if (user.teamRole === 'graphic_designer') return 'Graphic Designer';
  return 'Team Member';
};

const recordTimelineEvent = async ({
  creativeStrategyId,
  actor,
  action,
  stage = '',
  durationMs = null,
  notes = '',
  metadata = {}
}) => {
  const actorRole = getActorRole(actor);
  const timeTakenDisplay = durationMs ? formatDuration(durationMs) : '';

  const timelineEvent = await CreativeStrategyTimeline.create({
    creativeStrategy: creativeStrategyId,
    actorId: actor?._id || null,
    actorName: actor?.name || 'System',
    actorRole,
    action,
    stage,
    durationMs,
    timeTakenDisplay,
    notes,
    metadata,
    timestamp: new Date()
  });

  return timelineEvent;
};

// Safe regex escaping for search
const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const populateCreativeStrategy = (query) => {
  return query
    .populate('client', 'name code')
    .populate('campaign', 'name launchDate status')
    .populate('adSet', 'name launchDate status currentTestingCycle')
    .populate('assignedMediaBuyer', 'name email teamRole role')
    .populate('assignedCreativeStrategist', 'name email teamRole role')
    .populate('assignedGraphicDesigner', 'name email teamRole role')
    .populate('assignedTo', 'name email teamRole role')
    .populate('reportSubmittedBy', 'name email teamRole')
    .populate('performanceAnalysisSubmittedBy', 'name email teamRole')
    .populate('learningsSubmittedBy', 'name email teamRole')
    .populate('designerAssignedBy', 'name email teamRole')
    .populate('briefSubmittedBy', 'name email teamRole')
    .populate('briefReviewedBy', 'name email teamRole')
    .populate('creativeSubmittedBy', 'name email teamRole')
    .populate('internalReviewBy', 'name email teamRole')
    .populate('finalApprovedBy', 'name email teamRole')
    .populate('parentItems', 'creativeName currentTestingCycle cycleNumber status launchDate')
    .populate('nextCycle', 'creativeName currentTestingCycle cycleNumber status launchDate');
};

export const getCreativeStrategies = async (queryParams) => {
  const {
    clientId,
    campaignId,
    adSetId,
    mediaBuyerId,
    creativeStrategistId,
    graphicDesignerId,
    assignedToId,
    status,
    abhishekDecision,
    cycleNumber,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    page = 1,
    limit = 100
  } = queryParams;

  const query = {};

  if (clientId) query.client = clientId;
  if (campaignId) query.campaign = campaignId;
  if (adSetId) query.adSet = adSetId;
  if (mediaBuyerId) query.assignedMediaBuyer = mediaBuyerId;
  if (creativeStrategistId) query.assignedCreativeStrategist = creativeStrategistId;
  if (graphicDesignerId) query.assignedGraphicDesigner = graphicDesignerId;
  if (assignedToId) query.assignedTo = assignedToId;
  if (status && status !== 'ALL') query.status = status;
  if (abhishekDecision && abhishekDecision !== 'ALL') query.abhishekDecision = abhishekDecision;
  if (cycleNumber) query.cycleNumber = Number(cycleNumber);

  if (search && search.trim()) {
    const escaped = escapeRegex(search.trim());
    const searchRegex = new RegExp(escaped, 'i');
    query.$or = [
      { creativeName: searchRegex },
      { campaignName: searchRegex },
      { currentAdSetName: searchRegex },
      { currentTestingCycle: searchRegex },
      { creativesProposed: searchRegex },
      { hypothesis: searchRegex },
      { mediaBuyerRecommendation: searchRegex },
      { creativeStrategistRecommendation: searchRegex },
      { finalAssetConfiguration: searchRegex },
      { performanceAnalysis: searchRegex },
      { creativeLearning: searchRegex },
      { briefTitle: searchRegex },
      { delayReason: searchRegex },
      { status: searchRegex }
    ];
  }

  const sortDirection = sortOrder.toLowerCase() === 'asc' ? 1 : -1;
  const sortOptions = {};
  sortOptions[sortBy] = sortDirection;

  const skip = (Math.max(1, Number(page)) - 1) * Math.max(1, Number(limit));

  const [records, total] = await Promise.all([
    populateCreativeStrategy(CreativeStrategy.find(query))
      .sort(sortOptions)
      .skip(skip)
      .limit(Number(limit)),
    CreativeStrategy.countDocuments(query)
  ]);

  return {
    records,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit))
    }
  };
};

export const getCreativeStrategyById = async (id) => {
  const record = await populateCreativeStrategy(CreativeStrategy.findById(id));
  if (!record) {
    throw new ApiError(404, 'Creative Strategy record not found');
  }
  return record;
};

export const getTimeline = async (recordId) => {
  return await CreativeStrategyTimeline.find({ creativeStrategy: recordId }).sort({
    timestamp: 1
  });
};

export const createCreativeStrategy = async (data, user) => {
  const client = await Client.findById(data.clientId);
  if (!client) {
    throw new ApiError(404, 'Client not found');
  }

  let campaignName = data.campaignName || '';
  let campaignLaunchDate = data.campaignLaunchDate ? new Date(data.campaignLaunchDate) : null;
  if (data.campaignId) {
    const campaign = await Campaign.findById(data.campaignId);
    if (campaign) {
      campaignName = campaign.name;
      if (!campaignLaunchDate && campaign.launchDate) {
        campaignLaunchDate = campaign.launchDate;
      }
    }
  }

  let currentAdSetName = data.currentAdSetName || '';
  let launchDate = data.launchDate ? new Date(data.launchDate) : null;
  if (data.adSetId) {
    const adSet = await AdSet.findById(data.adSetId);
    if (adSet) {
      currentAdSetName = adSet.name;
    }
  }

  const cycleNum = data.cycleNumber ? Number(data.cycleNumber) : 1;
  const currentTestingCycle = data.currentTestingCycle || `Cycle ${cycleNum}`;
  const creativeName = data.creativeName?.trim() || data.creativesProposed?.trim() || `Creative #${Date.now().toString().slice(-4)}`;

  const observationDurationHours = data.observationDurationHours !== undefined && data.observationDurationHours !== null
    ? Number(data.observationDurationHours)
    : 72;
  const schedulingMode = data.schedulingMode || 'DURATION';

  let reportDueAt = null;
  if (launchDate) {
    if (schedulingMode === 'CUSTOM_DUE_DATE' && data.reportDueAt) {
      const customDue = new Date(data.reportDueAt);
      if (!isNaN(customDue.getTime())) {
        if (customDue.getTime() <= launchDate.getTime()) {
          throw new ApiError(400, 'Report due date and time must be after launch date and time');
        }
        reportDueAt = customDue;
      }
    } else {
      reportDueAt = new Date(launchDate.getTime() + observationDurationHours * 3600 * 1000);
    }
  }

  const record = await CreativeStrategy.create({
    client: client._id,
    campaign: data.campaignId || null,
    adSet: data.adSetId || null,
    creativeName,
    campaignName,
    campaignLaunchDate,
    currentAdSetName,
    launchDate,
    reportDueAt,
    observationDurationHours,
    schedulingMode,
    cycleNumber: cycleNum,
    currentTestingCycle,

    nextAssetDueDate: data.nextAssetDueDate ? new Date(data.nextAssetDueDate) : null,
    creativePrepDue: data.creativePrepDue ? new Date(data.creativePrepDue) : null,
    jointPrepDue: data.jointPrepDue ? new Date(data.jointPrepDue) : null,
    atApprovalDue: data.atApprovalDue ? new Date(data.atApprovalDue) : null,
    plannedLaunchDate: data.plannedLaunchDate ? new Date(data.plannedLaunchDate) : null,

    assignedMediaBuyer: data.assignedMediaBuyer || null,
    mediaBuyerRecommendation: data.mediaBuyerRecommendation || '',

    assignedCreativeStrategist: data.assignedCreativeStrategist || null,
    creativeStrategistRecommendation: data.creativeStrategistRecommendation || '',

    creativesProposed: data.creativesProposed || creativeName,
    hypothesis: data.hypothesis || '',
    abhishekDecision: data.abhishekDecision || ABHISHEK_DECISION.PENDING,
    finalAssetConfiguration: data.finalAssetConfiguration || '',
    finalCreativesApproved: Boolean(data.finalCreativesApproved),

    assignedGraphicDesigner: data.assignedGraphicDesigner || null,
    assignedTo: data.assignedTo || null,
    creativesReady: Boolean(data.creativesReady),
    configurationReady: Boolean(data.configurationReady),

    status: WORKFLOW_STATUS.PENDING_LAUNCH,
    approvedByAT: Boolean(data.approvedByAT),
    launchProof: data.launchProof || '',
    delayReason: data.delayReason || '',
    parentItems: Array.isArray(data.parentItems) ? data.parentItems : [],
    createdBy: user._id
  });

  await recordTimelineEvent({
    creativeStrategyId: record._id,
    actor: user,
    action: TIMELINE_ACTION.RECORD_CREATED,
    stage: 'Creation',
    notes: `Creative strategy record created for ${client.name} - ${creativeName} (${currentTestingCycle})`
  });

  const populated = await getCreativeStrategyById(record._id);
  broadcastEvent('CREATIVE_STRATEGY_CREATED', populated);
  return populated;
};

export const unifiedCreateCreativeStrategy = async (data, user) => {
  const {
    clientId,
    isNewCampaign,
    campaignId,
    campaignData = {},
    isNewAdSet,
    adSetId,
    adSetData = {},
    creativeData = {}
  } = data;

  const client = await Client.findById(clientId);
  if (!client) {
    throw new ApiError(404, 'Client not found');
  }

  let createdCampaign = null;
  let createdAdSet = null;
  let createdRecord = null;
  const newUploadedFileIds = (creativeData.creatives || [])
    .map((c) => c.fileId)
    .filter(Boolean);

  try {
    // 1. Resolve or Create Campaign
    let campaign = null;
    if (isNewCampaign) {
      if (!campaignData.name || !campaignData.name.trim()) {
        throw new ApiError(400, 'Campaign name is required for new Campaign');
      }
      const cType = campaignData.campaignType || 'CBO';
      let cBudget = null;
      if (cType === 'CBO') {
        if (
          campaignData.budget === undefined ||
          campaignData.budget === null ||
          isNaN(Number(campaignData.budget)) ||
          Number(campaignData.budget) < 0
        ) {
          throw new ApiError(400, 'Campaign Budget is required and must be non-negative for CBO Campaign');
        }
        cBudget = Number(campaignData.budget);
      }
      const cObjective = campaignData.objective || 'Sales';
      const cLaunchDate = campaignData.launchDate ? new Date(campaignData.launchDate) : null;

      createdCampaign = await Campaign.create({
        name: campaignData.name.trim(),
        client: client._id,
        campaignType: cType,
        budget: cBudget,
        objective: cObjective,
        launchDate: cLaunchDate,
        status: 'ACTIVE',
        notes: campaignData.notes?.trim() || '',
        createdBy: user._id
      });
      campaign = createdCampaign;
      broadcastEvent('CAMPAIGN_CREATED', campaign);
    } else {
      if (!campaignId) {
        throw new ApiError(400, 'Existing campaign ID is required');
      }
      campaign = await Campaign.findById(campaignId);
      if (!campaign) {
        throw new ApiError(404, 'Campaign not found');
      }
      if (campaign.client.toString() !== client._id.toString()) {
        throw new ApiError(400, 'Selected campaign does not belong to the chosen client');
      }
    }

    // 2. Resolve or Create Ad Set
    let adSet = null;
    if (isNewAdSet) {
      if (!adSetData.name || !adSetData.name.trim()) {
        throw new ApiError(400, 'Ad Set name is required for new Ad Set');
      }
      const campaignType = campaign.campaignType || 'CBO';
      let adSetBudget = null;
      if (campaignType === 'ABO') {
        if (
          adSetData.budget === undefined ||
          adSetData.budget === null ||
          isNaN(Number(adSetData.budget)) ||
          Number(adSetData.budget) < 0
        ) {
          throw new ApiError(400, 'Ad Set Budget is required and must be non-negative when Campaign is ABO');
        }
        adSetBudget = Number(adSetData.budget);
      }

      const targeting = adSetData.targeting || 'Broad';
      if (targeting === 'Interest') {
        if (!Array.isArray(adSetData.interests) || adSetData.interests.length === 0) {
          throw new ApiError(400, 'At least one interest must be specified when targeting is set to Interest');
        }
      }

      const ageStart = adSetData.ageGroup?.start !== undefined ? Number(adSetData.ageGroup.start) : 18;
      const ageEnd = adSetData.ageGroup?.end !== undefined ? Number(adSetData.ageGroup.end) : 65;
      if (ageStart < 13 || ageEnd > 100 || ageStart > ageEnd) {
        throw new ApiError(400, 'Invalid age range');
      }

      const adSetLaunchDate = adSetData.launchDate
        ? new Date(adSetData.launchDate)
        : campaign.launchDate || null;

      createdAdSet = await AdSet.create({
        name: adSetData.name.trim(),
        campaign: campaign._id,
        client: client._id,
        budget: adSetBudget,
        ageGroup: { start: ageStart, end: ageEnd },
        gender: adSetData.gender || 'Both',
        includedLocations: Array.isArray(adSetData.includedLocations) ? adSetData.includedLocations : [],
        excludedLocations: Array.isArray(adSetData.excludedLocations) ? adSetData.excludedLocations : [],
        targeting,
        interests: Array.isArray(adSetData.interests) ? adSetData.interests : [],
        launchDate: adSetLaunchDate,
        partOfCurrentCycle: adSetData.partOfCurrentCycle !== undefined ? Boolean(adSetData.partOfCurrentCycle) : true,
        status: 'ACTIVE',
        currentTestingCycle: 1,
        createdBy: user._id
      });
      adSet = createdAdSet;
      broadcastEvent('AD_SET_CREATED', adSet);
    } else {
      if (!adSetId) {
        throw new ApiError(400, 'Existing Ad Set ID is required');
      }
      adSet = await AdSet.findById(adSetId);
      if (!adSet) {
        throw new ApiError(404, 'Ad Set not found');
      }
      if (adSet.campaign.toString() !== campaign._id.toString()) {
        throw new ApiError(400, 'Selected Ad Set does not belong to the chosen Campaign');
      }
    }

    // 3. Create Creative Strategy record
    const adName = creativeData.adName?.trim() || creativeData.creativeName?.trim();
    if (!adName) {
      throw new ApiError(400, 'Ad Name is required');
    }
    const creativeName = adName;
    const adType = creativeData.adType || 'Static';
    const landingPageUrl = creativeData.landingPageUrl?.trim() || '';
    const testingStyle = creativeData.testingStyle?.trim() || 'New Angle';
    const creatives = Array.isArray(creativeData.creatives) ? creativeData.creatives.slice(0, 20) : [];
    if (Array.isArray(creativeData.creatives) && creativeData.creatives.length > 20) {
      throw new ApiError(400, 'Maximum 20 creative uploads allowed');
    }

    const cycleNum = creativeData.cycleNumber ? Number(creativeData.cycleNumber) : 1;
    const currentTestingCycle = creativeData.currentTestingCycle || `Cycle ${cycleNum}`;
    const observationDurationHours =
      creativeData.observationDurationHours !== undefined && creativeData.observationDurationHours !== null
        ? Number(creativeData.observationDurationHours)
        : 72;
    const schedulingMode = creativeData.schedulingMode || 'DURATION';

    let launchDate = creativeData.launchDate
      ? new Date(creativeData.launchDate)
      : adSet.launchDate || campaign.launchDate || null;

    let reportDueAt = null;
    if (launchDate) {
      if (schedulingMode === 'CUSTOM_DUE_DATE' && creativeData.reportDueAt) {
        const customDue = new Date(creativeData.reportDueAt);
        if (!isNaN(customDue.getTime())) {
          if (customDue.getTime() <= launchDate.getTime()) {
            throw new ApiError(400, 'Report due date and time must be after launch date and time');
          }
          reportDueAt = customDue;
        }
      } else {
        reportDueAt = new Date(launchDate.getTime() + observationDurationHours * 3600 * 1000);
      }
    }

    createdRecord = await CreativeStrategy.create({
      client: client._id,
      campaign: campaign._id,
      adSet: adSet._id,
      creativeName,
      adName,
      adType,
      landingPageUrl,
      testingStyle,
      creatives,

      // Snapshot hierarchy fields
      campaignName: campaign.name,
      campaignType: campaign.campaignType || 'CBO',
      campaignObjective: campaign.objective || 'Sales',
      campaignBudget: campaign.budget,
      campaignLaunchDate: campaign.launchDate,

      currentAdSetName: adSet.name,
      adSetBudget: adSet.budget,
      adSetAgeGroup: adSet.ageGroup,
      adSetGender: adSet.gender,
      adSetIncludedLocations: adSet.includedLocations,
      adSetExcludedLocations: adSet.excludedLocations,
      adSetTargeting: adSet.targeting,
      adSetInterests: adSet.interests,
      partOfCurrentCycle: adSet.partOfCurrentCycle,

      launchDate,
      reportDueAt,
      observationDurationHours,
      schedulingMode,
      cycleNumber: cycleNum,
      currentTestingCycle,

      assignedMediaBuyer: creativeData.assignedMediaBuyer || null,
      assignedCreativeStrategist: creativeData.assignedCreativeStrategist || null,
      assignedGraphicDesigner: creativeData.assignedGraphicDesigner || null,
      assignedTo: creativeData.assignedTo || null,

      creativesProposed: creativeData.creativesProposed || creativeName,
      hypothesis: creativeData.hypothesis || '',
      abhishekDecision: ABHISHEK_DECISION.PENDING,
      finalAssetConfiguration: creativeData.finalAssetConfiguration || '',

      status: WORKFLOW_STATUS.PENDING_LAUNCH,
      createdBy: user._id
    });

    await recordTimelineEvent({
      creativeStrategyId: createdRecord._id,
      actor: user,
      action: TIMELINE_ACTION.RECORD_CREATED,
      stage: 'Creation',
      notes: `Creative strategy hierarchy unified record created for ${client.name} — Campaign: "${campaign.name}" (${campaign.campaignType || 'CBO'}) → Ad Set: "${adSet.name}" → Ad: "${creativeName}" (${adType})`
    });

    const populated = await getCreativeStrategyById(createdRecord._id);
    broadcastEvent('CREATIVE_STRATEGY_CREATED', populated);
    return populated;
  } catch (err) {
    // Transaction / Rollback orchestration:
    // If anything fails, clean up newly created records to prevent half-created hierarchy or orphans
    if (createdRecord?._id) {
      await CreativeStrategyTimeline.deleteMany({ creativeStrategy: createdRecord._id }).catch(() => {});
      await CreativeStrategy.findByIdAndDelete(createdRecord._id).catch(() => {});
    }
    if (createdAdSet?._id) {
      await AdSet.findByIdAndDelete(createdAdSet._id).catch(() => {});
      broadcastEvent('AD_SET_DELETED', { adSetId: createdAdSet._id });
    }
    if (createdCampaign?._id) {
      await Campaign.findByIdAndDelete(createdCampaign._id).catch(() => {});
      broadcastEvent('CAMPAIGN_DELETED', { campaignId: createdCampaign._id });
    }
    // Clean up newly uploaded files if final creation failed
    if (newUploadedFileIds.length > 0) {
      for (const fileId of newUploadedFileIds) {
        await deleteImage({ fileId }).catch(() => {});
      }
    }
    throw err;
  }
};

export const updateCreativeStrategy = async (id, updateData, user) => {
  const record = await CreativeStrategy.findById(id);
  if (!record) {
    throw new ApiError(404, 'Creative Strategy record not found');
  }

  if (record.status === WORKFLOW_STATUS.COMPLETED) {
    throw new ApiError(
      400,
      'Completed cycles are permanently archived and immutable. Historical data cannot be modified.'
    );
  }

  // Admin-only management verification for assignments, schedules, and stage overrides
  const isAssignmentOrScheduleChange =
    updateData.assignedMediaBuyer !== undefined ||
    updateData.assignedCreativeStrategist !== undefined ||
    updateData.assignedGraphicDesigner !== undefined ||
    updateData.assignedTo !== undefined ||
    updateData.launchDate !== undefined ||
    updateData.observationDurationHours !== undefined ||
    updateData.schedulingMode !== undefined ||
    updateData.reportDueAt !== undefined;

  if (isAssignmentOrScheduleChange && user?.role !== 'admin') {
    throw new ApiError(403, 'Access denied. Only an Admin can manage assignments and scheduling.');
  }

  // Prevent circular parentItems
  if (updateData.parentItems) {
    updateData.parentItems = updateData.parentItems.filter(
      (pid) => pid.toString() !== id.toString()
    );
  }

  // Track assignment changes for audit trail & notifications
  const assignmentFields = [
    { key: 'assignedMediaBuyer', label: 'Media Buyer', roleNeeded: 'media_buyer' },
    { key: 'assignedCreativeStrategist', label: 'Creative Strategist', roleNeeded: 'creative_strategist' },
    { key: 'assignedGraphicDesigner', label: 'Graphic Designer', roleNeeded: 'graphic_designer' },
    { key: 'assignedTo', label: 'Assigned To', roleNeeded: null }
  ];

  for (const field of assignmentFields) {
    if (updateData[field.key] !== undefined) {
      const oldVal = record[field.key]?.toString() || null;
      const newVal = updateData[field.key] ? updateData[field.key].toString() : null;
      if (oldVal !== newVal) {
        let oldUserName = 'Unassigned';
        if (oldVal) {
          const oldUser = await User.findById(oldVal);
          if (oldUser) oldUserName = oldUser.name;
        }

        let newUserName = 'Unassigned';
        let newUserObj = null;
        if (newVal) {
          newUserObj = await User.findById(newVal);
          if (newUserObj) {
            newUserName = newUserObj.name;
          }
        }

        let action = TIMELINE_ACTION.ASSIGNMENT_UPDATED;
        let note = `${field.label} updated to ${newUserName}`;

        if (!oldVal && newVal) {
          action = TIMELINE_ACTION.ASSIGNMENT_CREATED;
          note = `${field.label} assigned to ${newUserName}`;
        } else if (oldVal && newVal) {
          action = TIMELINE_ACTION.ASSIGNMENT_REASSIGNED;
          note = `${field.label} reassigned from ${oldUserName} to ${newUserName}`;
        } else if (oldVal && !newVal) {
          action = TIMELINE_ACTION.ASSIGNMENT_UPDATED;
          note = `${field.label} unassigned (previously ${oldUserName})`;
        }

        await recordTimelineEvent({
          creativeStrategyId: record._id,
          actor: user,
          action,
          stage: 'Assignment',
          notes: note,
          metadata: {
            field: field.key,
            oldVal,
            newVal,
            oldUserName,
            newUserName,
            oldValue: oldUserName,
            newValue: newUserName
          }
        });

        // Send notification to newly assigned user
        if (newVal && newUserObj) {
          await notificationService.createNotification({
            recipient: newVal,
            sender: user._id,
            senderName: user.name,
            title: `Task Assignment: ${record.creativeName || record.creativesProposed || 'Creative'}`,
            message: `You have been assigned as ${field.label} for "${record.creativeName || record.creativesProposed || 'Creative'}" (${record.currentTestingCycle}) by ${user.name}.`,
            creativeStrategy: record._id,
            cycleNumber: record.cycleNumber,
            type: 'ASSIGNMENT_UPDATED'
          });
        }
      }
    }
  }

  // Schedule tracking & validation
  const scheduleChanged =
    updateData.launchDate !== undefined ||
    updateData.observationDurationHours !== undefined ||
    updateData.schedulingMode !== undefined ||
    updateData.reportDueAt !== undefined;

  if (scheduleChanged) {
    const oldLaunch = record.launchDate;
    const oldDue = record.reportDueAt;
    const oldDuration = record.observationDurationHours || 72;

    let newLaunchDate = record.launchDate;
    if (updateData.launchDate !== undefined) {
      newLaunchDate = updateData.launchDate ? new Date(updateData.launchDate) : null;
      if (newLaunchDate && isNaN(newLaunchDate.getTime())) {
        throw new ApiError(400, 'Invalid launch date');
      }
    }

    const schedulingMode = updateData.schedulingMode || record.schedulingMode || 'DURATION';
    record.schedulingMode = schedulingMode;

    let newReportDue = record.reportDueAt;
    let newDuration = record.observationDurationHours || 72;

    if (schedulingMode === 'CUSTOM_DUE_DATE') {
      if (updateData.reportDueAt !== undefined) {
        newReportDue = updateData.reportDueAt ? new Date(updateData.reportDueAt) : null;
      }
      if (newLaunchDate && newReportDue) {
        if (isNaN(newReportDue.getTime())) {
          throw new ApiError(400, 'Invalid report due date');
        }
        if (newReportDue.getTime() <= newLaunchDate.getTime()) {
          throw new ApiError(400, 'Report due date and time must be after launch date and time');
        }
        newDuration = (newReportDue.getTime() - newLaunchDate.getTime()) / (3600 * 1000);
      }
    } else {
      // DURATION mode
      if (updateData.observationDurationHours !== undefined) {
        newDuration = Number(updateData.observationDurationHours);
        if (isNaN(newDuration) || newDuration <= 0) {
          throw new ApiError(400, 'Observation duration must be a positive number');
        }
      }
      if (newLaunchDate) {
        newReportDue = new Date(newLaunchDate.getTime() + newDuration * 3600 * 1000);
      } else {
        newReportDue = null;
      }
    }

    record.launchDate = newLaunchDate;
    record.observationDurationHours = newDuration;
    record.reportDueAt = newReportDue;

    // If active creative was already launched, update active cycle's timing!
    if (record.status === WORKFLOW_STATUS.LAUNCHED || record.launchedAt) {
      if (newLaunchDate) {
        record.launchedAt = newLaunchDate;
      }
    }

    const isFirstSchedule = !oldLaunch && newLaunchDate;
    const action = isFirstSchedule ? TIMELINE_ACTION.SCHEDULE_CREATED : TIMELINE_ACTION.SCHEDULE_UPDATED;

    const oldLaunchStr = oldLaunch ? oldLaunch.toISOString() : 'UNSCHEDULED';
    const newLaunchStr = newLaunchDate ? newLaunchDate.toISOString() : 'UNSCHEDULED';
    const oldDueStr = oldDue ? oldDue.toISOString() : 'UNSCHEDULED';
    const newDueStr = newReportDue ? newReportDue.toISOString() : 'UNSCHEDULED';

    await recordTimelineEvent({
      creativeStrategyId: record._id,
      actor: user,
      action,
      stage: 'Schedule',
      notes: isFirstSchedule
        ? `Schedule created: Launch ${newLaunchStr}, Duration ${newDuration}h, Report Due ${newDueStr}`
        : `Schedule updated: Launch ${oldLaunchStr} -> ${newLaunchStr}, Duration ${oldDuration}h -> ${newDuration}h, Due ${oldDueStr} -> ${newDueStr}`,
      metadata: {
        oldLaunchDate: oldLaunch,
        newLaunchDate,
        oldReportDueAt: oldDue,
        newReportDueAt: newReportDue,
        oldDuration,
        newDuration,
        schedulingMode,
        oldValue: `Launch: ${oldLaunchStr}, Due: ${oldDueStr}`,
        newValue: `Launch: ${newLaunchStr}, Due: ${newDueStr}`
      }
    });
  }

  // Stage change tracking
  if (updateData.status && updateData.status !== record.status) {
    const oldStatus = record.status;
    const newStatus = updateData.status;

    if (newStatus === WORKFLOW_STATUS.LAUNCHED && !record.launchedAt) {
      record.launchedAt = record.launchDate || new Date();
      if (!record.reportDueAt) {
        const duration = record.observationDurationHours || 72;
        record.reportDueAt = new Date(record.launchedAt.getTime() + duration * 3600 * 1000);
      }
    }

    record.status = newStatus;

    await recordTimelineEvent({
      creativeStrategyId: record._id,
      actor: user,
      action: TIMELINE_ACTION.STAGE_CHANGED,
      stage: 'Stage Update',
      notes: `Stage changed from ${oldStatus} to ${newStatus}`,
      metadata: { oldStatus, newStatus, oldValue: oldStatus, newValue: newStatus }
    });
  }

  // Audit decision change
  if (
    updateData.abhishekDecision !== undefined &&
    updateData.abhishekDecision !== record.abhishekDecision
  ) {
    await recordTimelineEvent({
      creativeStrategyId: record._id,
      actor: user,
      action: TIMELINE_ACTION.RECORD_UPDATED,
      stage: 'Decision',
      notes: `Abhishek Decision changed from ${record.abhishekDecision} to ${updateData.abhishekDecision}`
    });
  }

  // Audit approvals
  if (
    updateData.finalCreativesApproved !== undefined &&
    updateData.finalCreativesApproved !== record.finalCreativesApproved
  ) {
    await recordTimelineEvent({
      creativeStrategyId: record._id,
      actor: user,
      action: TIMELINE_ACTION.RECORD_UPDATED,
      stage: 'Approval',
      notes: `Final Creatives Approved set to ${updateData.finalCreativesApproved}`
    });
  }

  if (
    updateData.approvedByAT !== undefined &&
    updateData.approvedByAT !== record.approvedByAT
  ) {
    await recordTimelineEvent({
      creativeStrategyId: record._id,
      actor: user,
      action: TIMELINE_ACTION.RECORD_UPDATED,
      stage: 'Approval',
      notes: `Approved By AT set to ${updateData.approvedByAT}`
    });
  }

  Object.assign(record, updateData);
  await record.save();

  const populated = await getCreativeStrategyById(record._id);
  broadcastEvent('CREATIVE_STRATEGY_UPDATED', populated);
  return populated;
};

// ==========================================
// OPERATIONAL ACCESS VERIFICATION HELPER
// ==========================================

export const verifyOperationalAccess = (record, user, requiredTeamRole, assignmentField) => {
  if (!user) {
    throw new ApiError(401, 'Authentication required.');
  }

  // Admin / Final Approver actions
  if (requiredTeamRole === 'admin') {
    if (user.role !== 'admin') {
      throw new ApiError(403, 'Access denied. Only an Admin / Final Approver can perform this action.');
    }
    return;
  }

  // Worker operational actions: Admin is strictly NOT allowed to perform worker submissions
  if (user.role === 'admin') {
    throw new ApiError(403, 'Admin cannot perform normal worker operational submissions.');
  }

  // Verify worker teamRole
  if (user.teamRole !== requiredTeamRole) {
    throw new ApiError(
      403,
      `Access denied. Required team role: '${requiredTeamRole}'. Your team role is '${user.teamRole || 'none'}'.`
    );
  }

  // Verify that the authenticated user is the assigned person on this record
  if (assignmentField) {
    const assignedUser = record[assignmentField];
    const assignedId = assignedUser?._id
      ? assignedUser._id.toString()
      : assignedUser
      ? assignedUser.toString()
      : null;
    const currentUserId = user._id ? user._id.toString() : null;

    if (!assignedId) {
      throw new ApiError(
        403,
        `Access denied. No ${requiredTeamRole.replace(/_/g, ' ')} is assigned to this creative yet.`
      );
    }

    if (assignedId !== currentUserId) {
      throw new ApiError(
        403,
        `Access denied. You are not the assigned ${requiredTeamRole.replace(/_/g, ' ')} for this creative record.`
      );
    }
  }
};

// ==========================================
// WORKFLOW ACTIONS
// ==========================================

export const launchCreative = async (id, { launchProof }, user) => {
  const record = await CreativeStrategy.findById(id).populate('client', 'name');
  if (!record) {
    throw new ApiError(404, 'Record not found');
  }

  if (record.status === WORKFLOW_STATUS.COMPLETED) {
    throw new ApiError(400, 'Completed cycles are permanently archived and immutable.');
  }

  verifyOperationalAccess(record, user, 'media_buyer', 'assignedMediaBuyer');

  if (record.status !== WORKFLOW_STATUS.PENDING_LAUNCH) {
    throw new ApiError(
      400,
      `Cannot launch creative: record is in status '${record.status}', expected 'PENDING_LAUNCH'.`
    );
  }

  const now = new Date();
  record.status = WORKFLOW_STATUS.LAUNCHED;
  if (!record.launchDate) {
    record.launchDate = now;
  }
  record.launchedAt = record.launchedAt || record.launchDate || now;
  const durationHours = record.observationDurationHours || 72;
  if (!record.reportDueAt || record.schedulingMode === 'DURATION') {
    record.reportDueAt = new Date(record.launchedAt.getTime() + durationHours * 3600 * 1000);
  }
  if (launchProof) record.launchProof = launchProof.trim();

  await record.save();

  await recordTimelineEvent({
    creativeStrategyId: record._id,
    actor: user,
    action: TIMELINE_ACTION.CREATIVE_LAUNCHED,
    stage: 'Launch',
    notes: `Creative launched. ${durationHours}-hour observation timer started. Due at: ${record.reportDueAt.toISOString()}`
  });

  // Notify assigned Creative Strategist that creative is live
  if (record.assignedCreativeStrategist) {
    await notificationService.createNotification({
      recipient: record.assignedCreativeStrategist,
      sender: user._id,
      senderName: user.name,
      title: 'Creative Launched — Observation Clock Started',
      message: `Creative "${record.creativeName || record.creativesProposed}" was launched by Media Buyer ${user.name} for ${record.client?.name || 'Client'}. ${durationHours}-hour observation clock has started.`,
      creativeStrategy: record._id,
      cycleNumber: record.cycleNumber,
      type: 'CREATIVE_LAUNCHED'
    });
  }

  const populated = await getCreativeStrategyById(record._id);
  broadcastEvent('CREATIVE_STRATEGY_UPDATED', populated);
  return populated;
};

export const submitReport = async (
  id,
  {
    ctr,
    cpc,
    cpm,
    roas,
    spend,
    costPerResult,
    purchases,
    purchaseConversionValue,
    performanceStatus,
    selectedCreatives,
    creativePerformances,
    performanceNotes,
    additionalObservations,
    reportNotes
  },
  user
) => {
  const record = await CreativeStrategy.findById(id).populate('client', 'name');
  if (!record) {
    throw new ApiError(404, 'Record not found');
  }

  if (record.status === WORKFLOW_STATUS.COMPLETED) {
    throw new ApiError(400, 'Completed cycles are permanently archived and immutable.');
  }

  verifyOperationalAccess(record, user, 'media_buyer', 'assignedMediaBuyer');

  if (
    record.status !== WORKFLOW_STATUS.LAUNCHED &&
    record.status !== WORKFLOW_STATUS.PENDING_REPORT
  ) {
    throw new ApiError(
      400,
      `Cannot submit report: record is in status '${record.status}'. Report submission is only allowed after launch.`
    );
  }

  if (!record.launchedAt) {
    throw new ApiError(400, 'Cannot submit report: Creative has not been launched yet.');
  }

  // BACKEND OBSERVATION ENFORCEMENT
  const durationHours = record.observationDurationHours || 72;
  const isCustomDue = record.schedulingMode === 'CUSTOM_DUE_DATE' && record.reportDueAt;

  let isLocked = false;
  let remainingHours = 0;

  if (isCustomDue) {
    const dueTime = new Date(record.reportDueAt).getTime();
    if (Date.now() < dueTime) {
      isLocked = true;
      remainingHours = Math.ceil((dueTime - Date.now()) / (1000 * 60 * 60));
    }
  } else {
    const elapsedMs = Date.now() - new Date(record.launchedAt).getTime();
    const elapsedHours = elapsedMs / (1000 * 60 * 60);
    if (elapsedHours < durationHours) {
      isLocked = true;
      remainingHours = Math.ceil(durationHours - elapsedHours);
    }
  }

  if (isLocked) {
    const durationLabel = durationHours === 72 ? '72 hours' : `${durationHours} hour(s)`;
    throw new ApiError(
      400,
      `Performance report is locked for ${durationLabel} post-launch. Approximately ${remainingHours} hour(s) remaining.`
    );
  }

  const now = new Date();
  record.status = WORKFLOW_STATUS.REPORT_SUBMITTED;
  record.reportSubmittedAt = now;
  record.reportSubmittedBy = user._id;

  if (ctr !== undefined && ctr !== null && !isNaN(ctr)) record.ctr = Number(ctr);
  if (cpc !== undefined && cpc !== null && !isNaN(cpc)) record.cpc = Number(cpc);
  if (cpm !== undefined && cpm !== null && !isNaN(cpm)) record.cpm = Number(cpm);
  if (roas !== undefined && roas !== null && !isNaN(roas)) record.roas = Number(roas);
  if (spend !== undefined && spend !== null && !isNaN(spend)) record.spend = Number(spend);
  if (costPerResult !== undefined && costPerResult !== null && !isNaN(costPerResult)) {
    record.costPerResult = Number(costPerResult);
  }
  if (purchases !== undefined && purchases !== null && !isNaN(purchases)) {
    record.purchases = Number(purchases);
  }
  if (purchaseConversionValue !== undefined && purchaseConversionValue !== null && !isNaN(purchaseConversionValue)) {
    record.purchaseConversionValue = Number(purchaseConversionValue);
  }
  if (performanceStatus) {
    record.performanceStatus = performanceStatus;
  }
  if (Array.isArray(selectedCreatives)) {
    record.selectedCreatives = selectedCreatives;
  }
  if (Array.isArray(creativePerformances) && creativePerformances.length > 0) {
    record.creativePerformances = creativePerformances.map((cp) => ({
      creativeId: cp.creativeId || '',
      creativeName: cp.creativeName || '',
      previewUrl: cp.previewUrl || '',
      spend: Number(cp.spend) || 0,
      costPerResult: Number(cp.costPerResult) || 0,
      purchases: Number(cp.purchases) || 0,
      purchaseConversionValue: Number(cp.purchaseConversionValue) || 0,
      roas: Number(cp.roas) || 0,
      performanceStatus: cp.performanceStatus === 'LOSER' ? 'LOSER' : 'WINNER'
    }));

    // If overall spend or roas wasn't passed directly, aggregate from creativePerformances
    if (spend === undefined || spend === null) {
      record.spend = record.creativePerformances.reduce((acc, c) => acc + (c.spend || 0), 0);
    }
    if (purchases === undefined || purchases === null) {
      record.purchases = record.creativePerformances.reduce((acc, c) => acc + (c.purchases || 0), 0);
    }
    if (purchaseConversionValue === undefined || purchaseConversionValue === null) {
      record.purchaseConversionValue = record.creativePerformances.reduce(
        (acc, c) => acc + (c.purchaseConversionValue || 0),
        0
      );
    }
    if (roas === undefined || roas === null) {
      if (record.spend > 0 && record.purchaseConversionValue > 0) {
        record.roas = Number((record.purchaseConversionValue / record.spend).toFixed(2));
      }
    }
    if (!performanceStatus) {
      const hasWinner = record.creativePerformances.some((cp) => cp.performanceStatus === 'WINNER');
      record.performanceStatus = hasWinner ? 'WINNER' : 'LOSER';
    }
  }

  const notesCombined = performanceNotes || reportNotes || '';
  record.performanceNotes = notesCombined.trim();
  record.reportNotes = notesCombined.trim();
  if (additionalObservations) {
    record.additionalObservations = additionalObservations.trim();
  }

  await record.save();

  const durationMs = now.getTime() - new Date(record.launchedAt).getTime();
  const winnersCount = (record.creativePerformances || []).filter((cp) => cp.performanceStatus === 'WINNER').length;
  const losersCount = (record.creativePerformances || []).filter((cp) => cp.performanceStatus === 'LOSER').length;
  const perfSummary = record.creativePerformances?.length
    ? ` (${winnersCount} Winner(s), ${losersCount} Loser(s), Total Spend: ${record.spend ?? 0}, ROAS: ${record.roas ?? 0}x)`
    : '';

  await recordTimelineEvent({
    creativeStrategyId: record._id,
    actor: user,
    action: TIMELINE_ACTION.REPORT_SUBMITTED,
    stage: 'Performance Report',
    durationMs,
    notes: `Performance Report submitted by ${user.name} (CTR: ${record.ctr ?? 'N/A'}, ROAS: ${record.roas ?? 'N/A'}, Status: ${record.performanceStatus || 'N/A'})${perfSummary}. Time taken: ${formatDuration(durationMs)}`
  });

  // Notify assigned Creative Strategist
  if (record.assignedCreativeStrategist) {
    await notificationService.createNotification({
      recipient: record.assignedCreativeStrategist,
      sender: user._id,
      senderName: user.name,
      title: 'Performance Report Ready',
      message: `Performance report submitted by ${user.name} for ${record.client?.name || 'Client'} / ${record.campaignName || 'Campaign'} / ${record.creativeName || record.creativesProposed || 'Creative'} (${record.currentTestingCycle}).`,
      creativeStrategy: record._id,
      cycleNumber: record.cycleNumber,
      type: 'REPORT_SUBMITTED'
    });
  }

  const populated = await getCreativeStrategyById(record._id);
  broadcastEvent('CREATIVE_STRATEGY_UPDATED', populated);
  return populated;
};

export const submitPerformanceAnalysis = async (
  id,
  { performanceAnalysis, recommendation, analysisNotes },
  user
) => {
  const record = await CreativeStrategy.findById(id).populate('client', 'name');
  if (!record) {
    throw new ApiError(404, 'Record not found');
  }

  if (record.status === WORKFLOW_STATUS.COMPLETED) {
    throw new ApiError(400, 'Completed cycles are permanently archived and immutable.');
  }

  verifyOperationalAccess(record, user, 'creative_strategist', 'assignedCreativeStrategist');

  if (record.status !== WORKFLOW_STATUS.REPORT_SUBMITTED && !record.reportSubmittedAt) {
    throw new ApiError(
      400,
      'Cannot submit performance analysis before Media Buyer submits report.'
    );
  }

  const now = new Date();
  if (performanceAnalysis !== undefined) record.performanceAnalysis = performanceAnalysis.trim();
  if (recommendation !== undefined) record.recommendation = recommendation.trim();
  if (analysisNotes !== undefined) record.analysisNotes = analysisNotes.trim();

  record.performanceAnalysisSubmittedAt = now;
  record.performanceAnalysisSubmittedBy = user._id;

  await record.save();

  await recordTimelineEvent({
    creativeStrategyId: record._id,
    actor: user,
    action: TIMELINE_ACTION.PERFORMANCE_ANALYSIS_SUBMITTED,
    stage: 'Performance Analysis',
    notes: `Performance Analysis submitted by ${user.name}. Recommendation: ${record.recommendation || 'N/A'}`
  });

  const populated = await getCreativeStrategyById(record._id);
  broadcastEvent('CREATIVE_STRATEGY_UPDATED', populated);
  return populated;
};

export const submitLearnings = async (
  id,
  {
    performanceAnalysis,
    recommendation,
    analysisNotes,
    angle,
    concept,
    communication,
    psychology,
    hook,
    creativeStructure,
    creativeAnalysisNotes,
    creativeLearning,
    creativeLearningNotes,
    creativeLearningAttachment,
    assignedGraphicDesigner,
    learningsNotes
  },
  user
) => {
  const record = await CreativeStrategy.findById(id).populate('client', 'name');
  if (!record) {
    throw new ApiError(404, 'Record not found');
  }

  if (record.status === WORKFLOW_STATUS.COMPLETED) {
    throw new ApiError(400, 'Completed cycles are permanently archived and immutable.');
  }

  verifyOperationalAccess(record, user, 'creative_strategist', 'assignedCreativeStrategist');

  if (record.status !== WORKFLOW_STATUS.REPORT_SUBMITTED && !record.reportSubmittedAt) {
    throw new ApiError(
      400,
      'Cannot submit creative analysis & direction before Media Buyer submits report.'
    );
  }

  const now = new Date();
  record.status = WORKFLOW_STATUS.LEARNINGS_SUBMITTED;
  record.learningsSubmittedAt = now;
  record.learningsSubmittedBy = user._id;

  // Persist performance analysis fields if provided
  if (performanceAnalysis !== undefined) {
    record.performanceAnalysis = performanceAnalysis.trim();
    record.performanceAnalysisSubmittedAt = now;
    record.performanceAnalysisSubmittedBy = user._id;
  }
  if (recommendation !== undefined) {
    record.recommendation = recommendation.trim();
  }
  if (analysisNotes !== undefined) {
    record.analysisNotes = analysisNotes.trim();
  }

  if (angle !== undefined) record.angle = angle.trim();
  if (concept !== undefined) record.concept = concept.trim();
  if (communication !== undefined) record.communication = communication.trim();
  if (psychology !== undefined) record.psychology = psychology.trim();
  if (hook !== undefined) record.hook = hook.trim();
  if (creativeStructure !== undefined) record.creativeStructure = creativeStructure.trim();
  if (creativeAnalysisNotes !== undefined) record.creativeAnalysisNotes = creativeAnalysisNotes.trim();

  const finalLearning = creativeLearning || learningsNotes || '';
  record.creativeLearning = finalLearning.trim();
  record.learningsNotes = finalLearning.trim();

  if (creativeLearningNotes !== undefined) record.creativeLearningNotes = creativeLearningNotes.trim();
  if (creativeLearningAttachment !== undefined) record.creativeLearningAttachment = creativeLearningAttachment.trim();

  // If assigning Graphic Designer during Learnings submission
  let designerUser = null;
  if (assignedGraphicDesigner) {
    designerUser = await User.findById(assignedGraphicDesigner);
    if (!designerUser) {
      throw new ApiError(404, 'Selected Graphic Designer not found.');
    }
    if (designerUser.teamRole !== 'graphic_designer' && designerUser.role !== 'admin') {
      throw new ApiError(400, 'Assigned user must have teamRole "graphic_designer".');
    }
    record.assignedGraphicDesigner = designerUser._id;
    record.designerAssignedAt = now;
    record.designerAssignedBy = user._id;
  }

  await record.save();

  const prevTime = record.reportSubmittedAt
    ? new Date(record.reportSubmittedAt).getTime()
    : record.launchedAt
    ? new Date(record.launchedAt).getTime()
    : now.getTime();
  const durationMs = now.getTime() - prevTime;

  await recordTimelineEvent({
    creativeStrategyId: record._id,
    actor: user,
    action: TIMELINE_ACTION.LEARNINGS_SUBMITTED,
    stage: 'Creative Analysis & Direction',
    durationMs,
    notes: `Creative Analysis & Direction submitted by ${user.name}.${designerUser ? ` Assigned to Designer: ${designerUser.name}` : ''}`
  });

  // Notify assigned Graphic Designer
  const targetDesignerId = record.assignedGraphicDesigner;
  if (targetDesignerId) {
    await notificationService.createNotification({
      recipient: targetDesignerId,
      sender: user._id,
      senderName: user.name,
      title: 'New Creative Direction Assigned',
      message: `Creative direction assigned by ${user.name} for ${record.client?.name || 'Client'} / ${record.campaignName || 'Campaign'} / ${record.creativeName || record.creativesProposed || 'Creative'} (${record.currentTestingCycle}). Ready for Brief creation.`,
      creativeStrategy: record._id,
      cycleNumber: record.cycleNumber,
      type: 'LEARNINGS_SUBMITTED'
    });
  }

  const populated = await getCreativeStrategyById(record._id);
  broadcastEvent('CREATIVE_STRATEGY_UPDATED', populated);
  return populated;
};

export const assignGraphicDesigner = async (id, { designerId }, user) => {
  const record = await CreativeStrategy.findById(id).populate('client', 'name');
  if (!record) {
    throw new ApiError(404, 'Record not found');
  }

  if (record.status === WORKFLOW_STATUS.COMPLETED) {
    throw new ApiError(400, 'Completed cycles are permanently archived and immutable.');
  }

  if (user.role !== 'admin') {
    verifyOperationalAccess(record, user, 'creative_strategist', 'assignedCreativeStrategist');
  }

  const designer = await User.findById(designerId);
  if (!designer) {
    throw new ApiError(404, 'Graphic designer not found');
  }

  if (designer.teamRole !== 'graphic_designer' && designer.role !== 'admin') {
    throw new ApiError(400, 'Assigned user must have teamRole "graphic_designer".');
  }

  const now = new Date();
  record.assignedGraphicDesigner = designer._id;
  record.designerAssignedAt = now;
  record.designerAssignedBy = user._id;
  await record.save();

  await recordTimelineEvent({
    creativeStrategyId: record._id,
    actor: user,
    action: TIMELINE_ACTION.DESIGNER_ASSIGNED,
    stage: 'Designer Assignment',
    notes: `Assigned to Graphic Designer: ${designer.name}`
  });

  await notificationService.createNotification({
    recipient: designer._id,
    sender: user._id,
    senderName: user.name,
    title: 'Creative Work Assigned',
    message: `You were assigned by ${user.name} to create the Brief for ${record.client?.name || 'Client'} / ${record.creativeName || record.creativesProposed || 'Creative'} (${record.currentTestingCycle}).`,
    creativeStrategy: record._id,
    cycleNumber: record.cycleNumber,
    type: 'ASSIGNED'
  });

  const populated = await getCreativeStrategyById(record._id);
  broadcastEvent('CREATIVE_STRATEGY_UPDATED', populated);
  return populated;
};

export const createBrief = async (
  id,
  { briefTitle, briefDescription, briefAttachment, briefContent },
  user
) => {
  const record = await CreativeStrategy.findById(id).populate('client', 'name');
  if (!record) {
    throw new ApiError(404, 'Record not found');
  }

  if (record.status === WORKFLOW_STATUS.COMPLETED) {
    throw new ApiError(400, 'Completed cycles are permanently archived and immutable.');
  }

  verifyOperationalAccess(record, user, 'graphic_designer', 'assignedGraphicDesigner');

  if (
    record.status !== WORKFLOW_STATUS.LEARNINGS_SUBMITTED &&
    record.status !== WORKFLOW_STATUS.REVISION_REQUESTED
  ) {
    throw new ApiError(
      400,
      `Cannot submit brief: record is in status '${record.status}', expected 'LEARNINGS_SUBMITTED' or 'REVISION_REQUESTED'.`
    );
  }

  const now = new Date();
  record.status = WORKFLOW_STATUS.BRIEF_SUBMITTED;
  record.briefCreatedAt = record.briefCreatedAt || now;
  record.briefSubmittedAt = now;
  record.briefSubmittedBy = user._id;
  record.briefStatus = REVIEW_STATUS.PENDING;

  if (briefTitle) record.briefTitle = briefTitle.trim();
  const desc = briefDescription || briefContent || '';
  record.briefDescription = desc.trim();
  record.briefContent = desc.trim();
  if (briefAttachment) record.briefAttachment = briefAttachment.trim();

  await record.save();

  const prevTime = record.learningsSubmittedAt
    ? new Date(record.learningsSubmittedAt).getTime()
    : now.getTime();
  const durationMs = now.getTime() - prevTime;

  await recordTimelineEvent({
    creativeStrategyId: record._id,
    actor: user,
    action: TIMELINE_ACTION.BRIEF_CREATED,
    stage: 'Brief Creation',
    durationMs,
    notes: `Brief "${record.briefTitle || 'Untitled Brief'}" submitted by ${user.name}. Time taken: ${formatDuration(durationMs)}`
  });

  // Notify assigned Creative Strategist
  if (record.assignedCreativeStrategist) {
    await notificationService.createNotification({
      recipient: record.assignedCreativeStrategist,
      sender: user._id,
      senderName: user.name,
      title: 'Brief Submitted for Review',
      message: `Brief "${record.briefTitle || 'Untitled Brief'}" submitted by ${user.name} for ${record.client?.name || 'Client'} / ${record.creativeName || 'Creative'} (${record.currentTestingCycle}).`,
      creativeStrategy: record._id,
      cycleNumber: record.cycleNumber,
      type: 'BRIEF_SUBMITTED'
    });
  }

  const populated = await getCreativeStrategyById(record._id);
  broadcastEvent('CREATIVE_STRATEGY_UPDATED', populated);
  return populated;
};

export const reviewBrief = async (id, { status, feedback }, user) => {
  const record = await CreativeStrategy.findById(id).populate('client', 'name');
  if (!record) {
    throw new ApiError(404, 'Record not found');
  }

  if (record.status === WORKFLOW_STATUS.COMPLETED) {
    throw new ApiError(400, 'Completed cycles are permanently archived and immutable.');
  }

  verifyOperationalAccess(record, user, 'creative_strategist', 'assignedCreativeStrategist');

  if (record.status !== WORKFLOW_STATUS.BRIEF_SUBMITTED) {
    throw new ApiError(
      400,
      `Cannot review brief: record is in status '${record.status}', expected 'BRIEF_SUBMITTED'.`
    );
  }

  const now = new Date();
  record.briefReviewedAt = now;
  record.briefReviewedBy = user._id;
  record.briefReviewFeedback = feedback ? feedback.trim() : '';

  if (status === 'APPROVED') {
    record.status = WORKFLOW_STATUS.PRODUCTION;
    record.briefStatus = REVIEW_STATUS.APPROVED;
    record.briefApprovedAt = now;
    record.productionStartedAt = now;

    await record.save();

    await recordTimelineEvent({
      creativeStrategyId: record._id,
      actor: user,
      action: TIMELINE_ACTION.BRIEF_APPROVED,
      stage: 'Brief Review',
      notes: `Brief approved by ${user.name}. Production started.`
    });

    if (record.assignedGraphicDesigner) {
      await notificationService.createNotification({
        recipient: record.assignedGraphicDesigner,
        sender: user._id,
        senderName: user.name,
        title: 'Brief Approved — Start Production',
        message: `Your brief was approved by ${user.name}. You may now create and submit the final creative.`,
        creativeStrategy: record._id,
        cycleNumber: record.cycleNumber,
        type: 'BRIEF_APPROVED'
      });
    }
  } else {
    // REVISE or REJECTED
    record.status = WORKFLOW_STATUS.REVISION_REQUESTED;
    record.briefStatus = status === 'REVISE' ? REVIEW_STATUS.REVISE : REVIEW_STATUS.REJECTED;
    record.revisionRequestedAt = now;
    record.revisionNotes = feedback ? feedback.trim() : '';

    await record.save();

    await recordTimelineEvent({
      creativeStrategyId: record._id,
      actor: user,
      action: TIMELINE_ACTION.BRIEF_REVIEWED,
      stage: 'Brief Review',
      notes: `Brief ${status.toLowerCase()} by ${user.name}. Feedback: ${record.briefReviewFeedback || 'N/A'}`
    });

    if (record.assignedGraphicDesigner) {
      await notificationService.createNotification({
        recipient: record.assignedGraphicDesigner,
        sender: user._id,
        senderName: user.name,
        title: `Brief ${status === 'REVISE' ? 'Revision Requested' : 'Rejected'}`,
        message: `Feedback from ${user.name}: "${record.briefReviewFeedback || 'Please check feedback notes and revise.'}"`,
        creativeStrategy: record._id,
        cycleNumber: record.cycleNumber,
        type: 'REVISION_REQUESTED'
      });
    }
  }

  const populated = await getCreativeStrategyById(record._id);
  broadcastEvent('CREATIVE_STRATEGY_UPDATED', populated);
  return populated;
};

// Backward compatible approveBrief
export const approveBrief = async (id, user) => {
  return await reviewBrief(id, { status: 'APPROVED' }, user);
};

export const submitCreativeProduction = async (
  id,
  { creativeLink, framerLink, creativeAttachment, creativeSubmissionNotes, productionAssetsUrl },
  user
) => {
  const record = await CreativeStrategy.findById(id).populate('client', 'name');
  if (!record) {
    throw new ApiError(404, 'Record not found');
  }

  if (record.status === WORKFLOW_STATUS.COMPLETED) {
    throw new ApiError(400, 'Completed cycles are permanently archived and immutable.');
  }

  verifyOperationalAccess(record, user, 'graphic_designer', 'assignedGraphicDesigner');

  if (
    record.status !== WORKFLOW_STATUS.PRODUCTION &&
    record.status !== WORKFLOW_STATUS.REVISION_REQUESTED
  ) {
    throw new ApiError(
      400,
      `Cannot submit creative: record is in status '${record.status}', expected 'PRODUCTION' or 'REVISION_REQUESTED'.`
    );
  }

  if (record.briefStatus !== REVIEW_STATUS.APPROVED) {
    throw new ApiError(400, 'Cannot submit creative assets before the brief has been approved.');
  }

  const now = new Date();
  record.status = WORKFLOW_STATUS.INTERNAL_REVIEW;
  record.creativeSubmittedAt = now;
  record.creativeSubmittedBy = user._id;
  record.internalReviewStatus = REVIEW_STATUS.PENDING;

  if (creativeLink) record.creativeLink = creativeLink.trim();
  if (framerLink) record.framerLink = framerLink.trim();
  if (creativeAttachment) record.creativeAttachment = creativeAttachment.trim();
  if (creativeSubmissionNotes) record.creativeSubmissionNotes = creativeSubmissionNotes.trim();

  const assetUrl = creativeLink || productionAssetsUrl || framerLink || '';
  record.productionAssetsUrl = assetUrl.trim();

  await record.save();

  const prevTime = record.productionStartedAt
    ? new Date(record.productionStartedAt).getTime()
    : now.getTime();
  const durationMs = now.getTime() - prevTime;

  await recordTimelineEvent({
    creativeStrategyId: record._id,
    actor: user,
    action: TIMELINE_ACTION.CREATIVE_SUBMITTED,
    stage: 'Production',
    durationMs,
    notes: `Creative production submitted by ${user.name} for internal review. Creative Link: ${record.creativeLink || record.productionAssetsUrl || 'N/A'}`
  });

  // Notify assigned Creative Strategist
  if (record.assignedCreativeStrategist) {
    await notificationService.createNotification({
      recipient: record.assignedCreativeStrategist,
      sender: user._id,
      senderName: user.name,
      title: 'Creative Submitted for Internal Review',
      message: `Creative links submitted by ${user.name} for ${record.client?.name || 'Client'} / ${record.creativeName || 'Creative'} (${record.currentTestingCycle}). Ready for review.`,
      creativeStrategy: record._id,
      cycleNumber: record.cycleNumber,
      type: 'CREATIVE_SUBMITTED'
    });
  }

  const populated = await getCreativeStrategyById(record._id);
  broadcastEvent('CREATIVE_STRATEGY_UPDATED', populated);
  return populated;
};

export const reviewInternalCreative = async (id, { status, feedback, reviewNotes }, user) => {
  const record = await CreativeStrategy.findById(id).populate('client', 'name');
  if (!record) {
    throw new ApiError(404, 'Record not found');
  }

  if (record.status === WORKFLOW_STATUS.COMPLETED) {
    throw new ApiError(400, 'Completed cycles are permanently archived and immutable.');
  }

  verifyOperationalAccess(record, user, 'creative_strategist', 'assignedCreativeStrategist');

  if (record.status !== WORKFLOW_STATUS.INTERNAL_REVIEW) {
    throw new ApiError(
      400,
      `Cannot review creative: record is in status '${record.status}', expected 'INTERNAL_REVIEW'.`
    );
  }

  const now = new Date();
  const notes = feedback || reviewNotes || '';
  record.internalReviewAt = now;
  record.internalReviewBy = user._id;
  record.internalReviewFeedback = notes.trim();
  record.reviewNotes = notes.trim();

  if (status === 'APPROVED') {
    record.status = WORKFLOW_STATUS.CLIENT_REVIEW; // Moves to Final Approval stage
    record.internalReviewStatus = REVIEW_STATUS.APPROVED;
    record.clientReviewAt = now;

    await record.save();

    await recordTimelineEvent({
      creativeStrategyId: record._id,
      actor: user,
      action: TIMELINE_ACTION.INTERNAL_REVIEW_APPROVED,
      stage: 'Internal Review',
      notes: `Internal review approved by ${user.name}. Sent for Final Approver / Client review.`
    });

    // Notify all admins / Abhishek Sir
    const adminUsers = await User.find({ role: 'admin', status: 'active' }).select('_id');
    for (const admin of adminUsers) {
      await notificationService.createNotification({
        recipient: admin._id,
        sender: user._id,
        senderName: user.name,
        title: 'Creative Ready for Final Approval',
        message: `Internal review passed for ${record.client?.name || 'Client'} / ${record.creativeName || 'Creative'} (${record.currentTestingCycle}). Awaiting final approval.`,
        creativeStrategy: record._id,
        cycleNumber: record.cycleNumber,
        type: 'INTERNAL_REVIEW_APPROVED'
      });
    }
  } else {
    // REVISE or REJECTED
    record.status = WORKFLOW_STATUS.REVISION_REQUESTED;
    record.internalReviewStatus = status === 'REVISE' ? REVIEW_STATUS.REVISE : REVIEW_STATUS.REJECTED;
    record.revisionRequestedAt = now;
    record.revisionNotes = notes.trim();

    await record.save();

    await recordTimelineEvent({
      creativeStrategyId: record._id,
      actor: user,
      action: TIMELINE_ACTION.INTERNAL_REVIEW_DECISION,
      stage: 'Internal Review',
      notes: `Creative internal review ${status.toLowerCase()} by ${user.name}. Feedback: ${notes || 'N/A'}`
    });

    if (record.assignedGraphicDesigner) {
      await notificationService.createNotification({
        recipient: record.assignedGraphicDesigner,
        sender: user._id,
        senderName: user.name,
        title: `Creative ${status === 'REVISE' ? 'Revision Requested' : 'Rejected'}`,
        message: `Feedback from ${user.name}: "${notes || 'Please review notes and update creative production.'}"`,
        creativeStrategy: record._id,
        cycleNumber: record.cycleNumber,
        type: 'REVISION_REQUESTED'
      });
    }
  }

  const populated = await getCreativeStrategyById(record._id);
  broadcastEvent('CREATIVE_STRATEGY_UPDATED', populated);
  return populated;
};

// Backward-compatible approveInternalReview
export const approveInternalReview = async (id, data = {}, user) => {
  return await reviewInternalCreative(id, { status: 'APPROVED', ...data }, user);
};

export const clientReviewDecision = async (
  id,
  { decision, status, feedback, revisionNotes },
  user
) => {
  const record = await CreativeStrategy.findById(id).populate('client', 'name');
  if (!record) {
    throw new ApiError(404, 'Record not found');
  }

  if (record.status === WORKFLOW_STATUS.COMPLETED) {
    throw new ApiError(400, 'Completed cycles are permanently archived and immutable.');
  }

  verifyOperationalAccess(record, user, 'admin');

  if (record.status !== WORKFLOW_STATUS.CLIENT_REVIEW) {
    throw new ApiError(
      400,
      `Cannot perform final approval: record is in status '${record.status}', expected 'CLIENT_REVIEW'.`
    );
  }

  if (record.internalReviewStatus !== REVIEW_STATUS.APPROVED) {
    throw new ApiError(
      400,
      'Cannot perform final approval before internal creative review is approved.'
    );
  }

  const now = new Date();
  const effectiveStatus = (decision === 'APPROVED' || status === 'APPROVED') ? 'APPROVED' : (status || decision || 'REVISE');
  const notes = feedback || revisionNotes || '';

  if (effectiveStatus === 'APPROVED') {
    record.status = WORKFLOW_STATUS.READY_TO_LAUNCH;
    record.finalApprovalStatus = REVIEW_STATUS.APPROVED;
    record.finalApprovedAt = now;
    record.finalApprovedBy = user._id;
    record.clientApprovedAt = now;
    record.finalCreativesApproved = true;
    record.abhishekDecision = ABHISHEK_DECISION.APPROVED;
    record.finalApprovalFeedback = notes.trim();

    await record.save();

    await recordTimelineEvent({
      creativeStrategyId: record._id,
      actor: user,
      action: TIMELINE_ACTION.CLIENT_APPROVED,
      stage: 'Final Approval',
      notes: `Creative approved by ${user.name} (Final Approver). Marked as ready for launch.`
    });

    // Notify assigned Media Buyer
    if (record.assignedMediaBuyer) {
      await notificationService.createNotification({
        recipient: record.assignedMediaBuyer,
        sender: user._id,
        senderName: user.name,
        title: 'Creative Approved and Ready to Launch',
        message: `Creative approved by ${user.name} for ${record.client?.name || 'Client'} / ${record.campaignName || 'Campaign'} / ${record.creativeName || record.creativesProposed || 'Creative'} (${record.currentTestingCycle}). Ready for launch!`,
        creativeStrategy: record._id,
        cycleNumber: record.cycleNumber,
        type: 'READY_TO_LAUNCH'
      });
    }
  } else {
    record.status = WORKFLOW_STATUS.REVISION_REQUESTED;
    record.finalApprovalStatus = (effectiveStatus === 'REJECTED' || effectiveStatus === 'REJECT') ? REVIEW_STATUS.REJECTED : REVIEW_STATUS.REVISE;
    record.abhishekDecision = (effectiveStatus === 'REJECTED' || effectiveStatus === 'REJECT') ? ABHISHEK_DECISION.REJECTED : ABHISHEK_DECISION.REVISION_REQUESTED;
    record.revisionRequestedAt = now;
    record.revisionNotes = notes.trim();
    record.finalApprovalFeedback = notes.trim();

    await record.save();

    await recordTimelineEvent({
      creativeStrategyId: record._id,
      actor: user,
      action: TIMELINE_ACTION.REVISION_REQUESTED,
      stage: 'Final Approval',
      notes: `Final approval requested changes: ${notes || 'N/A'}`
    });

    // Notify Graphic Designer & Creative Strategist
    const notifiedRecipients = [record.assignedGraphicDesigner, record.assignedCreativeStrategist].filter(Boolean);
    for (const recipientId of notifiedRecipients) {
      await notificationService.createNotification({
        recipient: recipientId,
        sender: user._id,
        senderName: user.name,
        title: 'Final Approval Revisions Requested',
        message: `Feedback from ${user.name}: "${notes || 'Please check feedback notes.'}"`,
        creativeStrategy: record._id,
        cycleNumber: record.cycleNumber,
        type: 'REVISION_REQUESTED'
      });
    }
  }

  const populated = await getCreativeStrategyById(record._id);
  broadcastEvent('CREATIVE_STRATEGY_UPDATED', populated);
  return populated;
};

export const handoffToMediaBuyer = async (id, user) => {
  const record = await CreativeStrategy.findById(id).populate('client', 'name');
  if (!record) {
    throw new ApiError(404, 'Record not found');
  }

  if (record.status === WORKFLOW_STATUS.COMPLETED) {
    throw new ApiError(400, 'Completed cycles are permanently archived and immutable.');
  }

  const now = new Date();
  record.status = WORKFLOW_STATUS.HANDOFF;
  record.handoffAt = now;
  await record.save();

  await recordTimelineEvent({
    creativeStrategyId: record._id,
    actor: user,
    action: TIMELINE_ACTION.HANDED_OFF,
    stage: 'Handoff',
    notes: `Creative handed off to Media Buyer for campaign launch.`
  });

  if (record.assignedMediaBuyer) {
    await notificationService.createNotification({
      recipient: record.assignedMediaBuyer,
      sender: user._id,
      senderName: user.name,
      title: 'Creative Ready to Launch',
      message: `Creative handed off for launch by ${user.name} for ${record.client?.name || 'Client'} / ${record.creativeName || 'Creative'} (${record.currentTestingCycle}).`,
      creativeStrategy: record._id,
      cycleNumber: record.cycleNumber,
      type: 'HANDOFF'
    });
  }

  const populated = await getCreativeStrategyById(record._id);
  broadcastEvent('CREATIVE_STRATEGY_UPDATED', populated);
  return populated;
};

// Automatic Next Cycle Creation + Launch
export const completeAndCreateNextCycle = async (id, user, options = {}) => {
  const currentRecord = await CreativeStrategy.findById(id).populate('client', 'name');
  if (!currentRecord) {
    throw new ApiError(404, 'Record not found');
  }

  // RACE CONDITION / DUPLICATE NEXT CYCLE GUARD
  if (currentRecord.status === WORKFLOW_STATUS.COMPLETED || currentRecord.nextCycle) {
    throw new ApiError(
      400,
      'This cycle has already been completed and handed off to next cycle.'
    );
  }

  verifyOperationalAccess(currentRecord, user, 'media_buyer', 'assignedMediaBuyer');

  const allowedFinalStatuses = [
    WORKFLOW_STATUS.CLIENT_APPROVED,
    WORKFLOW_STATUS.READY_TO_LAUNCH,
    WORKFLOW_STATUS.HANDOFF
  ];
  if (
    !allowedFinalStatuses.includes(currentRecord.status) &&
    currentRecord.finalApprovalStatus !== REVIEW_STATUS.APPROVED
  ) {
    throw new ApiError(
      400,
      `Cannot launch next cycle: creative has not received final approval yet (current status: ${currentRecord.status}).`
    );
  }

  const now = new Date();
  currentRecord.status = WORKFLOW_STATUS.COMPLETED;
  currentRecord.completedAt = now;

  const nextCycleNum = (currentRecord.cycleNumber || 1) + 1;
  const nextTestingCycle = `Cycle ${nextCycleNum}`;

  // If autoLaunch is true (e.g. Media buyer records launch of next cycle), start observation period
  const isAutoLaunch = options.autoLaunch !== false; // default true
  const launchedAtTime = isAutoLaunch ? now : null;
  const durationHours = currentRecord.observationDurationHours || 72;
  const reportDueAtTime = isAutoLaunch ? new Date(now.getTime() + durationHours * 3600 * 1000) : null;
  const initialStatus = isAutoLaunch ? WORKFLOW_STATUS.LAUNCHED : WORKFLOW_STATUS.PENDING_LAUNCH;

  const nextRecord = await CreativeStrategy.create({
    client: currentRecord.client,
    campaign: currentRecord.campaign,
    adSet: currentRecord.adSet,
    creativeName: currentRecord.creativeName || currentRecord.creativesProposed || 'Creative',
    campaignName: currentRecord.campaignName,
    campaignLaunchDate: currentRecord.campaignLaunchDate,
    currentAdSetName: currentRecord.currentAdSetName,
    launchDate: isAutoLaunch ? now : null,
    launchedAt: launchedAtTime,
    reportDueAt: reportDueAtTime,
    observationDurationHours: durationHours,
    schedulingMode: currentRecord.schedulingMode || 'DURATION',
    cycleNumber: nextCycleNum,
    currentTestingCycle: nextTestingCycle,

    assignedMediaBuyer: currentRecord.assignedMediaBuyer,
    assignedCreativeStrategist: currentRecord.assignedCreativeStrategist,
    assignedGraphicDesigner: currentRecord.assignedGraphicDesigner,
    assignedTo: currentRecord.assignedTo,

    status: initialStatus,
    launchProof: options.launchProof || currentRecord.launchProof || '',
    parentItems: [currentRecord._id],
    nextCycleCreatedAt: now,
    createdBy: user._id
  });

  currentRecord.nextCycle = nextRecord._id;
  await currentRecord.save();

  if (currentRecord.adSet) {
    await AdSet.findByIdAndUpdate(currentRecord.adSet, {
      currentTestingCycle: nextCycleNum
    });
  }

  await recordTimelineEvent({
    creativeStrategyId: currentRecord._id,
    actor: user,
    action: TIMELINE_ACTION.CYCLE_COMPLETED,
    stage: 'Cycle Complete',
    notes: `${currentRecord.currentTestingCycle} completed permanently. Next: ${nextTestingCycle}.`
  });

  await recordTimelineEvent({
    creativeStrategyId: nextRecord._id,
    actor: user,
    action: isAutoLaunch ? TIMELINE_ACTION.CREATIVE_LAUNCHED : TIMELINE_ACTION.NEXT_CYCLE_CREATED,
    stage: isAutoLaunch ? 'Launch' : 'Cycle Creation',
    notes: isAutoLaunch
      ? `${nextTestingCycle} launched automatically. 72-hour observation period started. Report due at: ${reportDueAtTime.toISOString()}`
      : `${nextTestingCycle} created in PENDING_LAUNCH state. Media buyer must explicitly launch it.`
  });

  // Notify assigned Creative Strategist that next cycle is launched
  if (isAutoLaunch && nextRecord.assignedCreativeStrategist) {
    await notificationService.createNotification({
      recipient: nextRecord.assignedCreativeStrategist,
      sender: user._id,
      senderName: user.name,
      title: `${nextTestingCycle} Launched — 72H Observation Started`,
      message: `${nextTestingCycle} launched by Media Buyer ${user.name} for ${currentRecord.client?.name || 'Client'} / ${nextRecord.creativeName}. Report will unlock in 72 hours.`,
      creativeStrategy: nextRecord._id,
      cycleNumber: nextRecord.cycleNumber,
      type: 'CREATIVE_LAUNCHED'
    });
  }

  // Notify assigned Media Buyer
  if (nextRecord.assignedMediaBuyer) {
    await notificationService.createNotification({
      recipient: nextRecord.assignedMediaBuyer,
      sender: user._id,
      senderName: user.name,
      title: `${nextTestingCycle} Active`,
      message: `You successfully launched ${nextTestingCycle}. 72-hour observation clock has started.`,
      creativeStrategy: nextRecord._id,
      cycleNumber: nextRecord.cycleNumber,
      type: 'CREATIVE_LAUNCHED'
    });
  }

  broadcastEvent('CREATIVE_STRATEGY_UPDATED', currentRecord);
  broadcastEvent('CREATIVE_STRATEGY_CREATED', nextRecord);

  return {
    completedRecord: await getCreativeStrategyById(currentRecord._id),
    nextRecord: await getCreativeStrategyById(nextRecord._id)
  };
};

export const pauseCreative = async (id, user) => {
  const record = await CreativeStrategy.findById(id);
  if (!record) {
    throw new ApiError(404, 'Record not found');
  }

  if (record.status === WORKFLOW_STATUS.COMPLETED) {
    throw new ApiError(400, 'Completed cycles are permanently archived and immutable.');
  }

  verifyOperationalAccess(record, user, 'admin');

  record.status = WORKFLOW_STATUS.PAUSED;
  await record.save();

  await recordTimelineEvent({
    creativeStrategyId: record._id,
    actor: user,
    action: TIMELINE_ACTION.CYCLE_PAUSED,
    stage: 'Status',
    notes: `Cycle paused by ${user.name}.`
  });

  const populated = await getCreativeStrategyById(record._id);
  broadcastEvent('CREATIVE_STRATEGY_UPDATED', populated);
  return populated;
};

export const resumeCreative = async (id, user) => {
  const record = await CreativeStrategy.findById(id);
  if (!record) {
    throw new ApiError(404, 'Record not found');
  }

  if (record.status === WORKFLOW_STATUS.COMPLETED) {
    throw new ApiError(400, 'Completed cycles are permanently archived and immutable.');
  }

  verifyOperationalAccess(record, user, 'admin');

  // Restore active stage based on submitted data
  let nextStatus = WORKFLOW_STATUS.PENDING_LAUNCH;
  if (record.finalApprovalStatus === REVIEW_STATUS.APPROVED) {
    nextStatus = WORKFLOW_STATUS.READY_TO_LAUNCH;
  } else if (record.internalReviewStatus === REVIEW_STATUS.APPROVED) {
    nextStatus = WORKFLOW_STATUS.CLIENT_REVIEW;
  } else if (record.creativeSubmittedAt) {
    nextStatus = WORKFLOW_STATUS.INTERNAL_REVIEW;
  } else if (record.briefStatus === REVIEW_STATUS.APPROVED) {
    nextStatus = WORKFLOW_STATUS.PRODUCTION;
  } else if (record.briefSubmittedAt) {
    nextStatus = WORKFLOW_STATUS.BRIEF_SUBMITTED;
  } else if (record.learningsSubmittedAt) {
    nextStatus = WORKFLOW_STATUS.LEARNINGS_SUBMITTED;
  } else if (record.reportSubmittedAt) {
    nextStatus = WORKFLOW_STATUS.REPORT_SUBMITTED;
  } else if (record.launchedAt) {
    nextStatus = WORKFLOW_STATUS.LAUNCHED;
  }

  record.status = nextStatus;
  await record.save();

  await recordTimelineEvent({
    creativeStrategyId: record._id,
    actor: user,
    action: TIMELINE_ACTION.CYCLE_RESUMED,
    stage: 'Status',
    notes: `Cycle resumed by ${user.name}. Status restored to ${nextStatus}.`
  });

  const populated = await getCreativeStrategyById(record._id);
  broadcastEvent('CREATIVE_STRATEGY_UPDATED', populated);
  return populated;
};

export const getCreativeDeletePreview = async (id) => {
  const record = await CreativeStrategy.findById(id)
    .populate('client', 'name')
    .populate('campaign', 'name')
    .populate('adSet', 'name');
  if (!record) {
    throw new ApiError(404, 'Record not found');
  }

  // Count timeline events
  const timelineCount = await CreativeStrategyTimeline.countDocuments({ creativeStrategy: id });

  // Count related cycles if this creative spans multiple cycles
  const relatedCycles = await CreativeStrategy.countDocuments({
    $or: [{ _id: id }, { parentItems: id }, { nextCycle: id }]
  });

  return {
    recordId: record._id,
    creativeName: record.creativeName || record.creativesProposed || 'Creative',
    cycle: record.currentTestingCycle,
    clientName: record.client?.name || 'N/A',
    campaignName: record.campaign?.name || 'N/A',
    adSetName: record.adSet?.name || 'N/A',
    timelineCount,
    relatedCycles
  };
};

export const deleteCreativeStrategy = async (id) => {
  const record = await CreativeStrategy.findById(id);
  if (!record) {
    throw new ApiError(404, 'Record not found');
  }

  // Delete timeline events
  await CreativeStrategyTimeline.deleteMany({ creativeStrategy: id });
  // If linked in another record's nextCycle, clear that pointer
  await CreativeStrategy.updateMany({ nextCycle: id }, { nextCycle: null });
  await CreativeStrategy.updateMany({ parentItems: id }, { $pull: { parentItems: id } });

  await CreativeStrategy.findByIdAndDelete(id);

  broadcastEvent('CREATIVE_STRATEGY_DELETED', { id });
  return { deletedId: id };
};

export const getTargetingLocations = async () => {
  const adSets = await AdSet.find().select('includedLocations excludedLocations');
  const locationSet = new Set([
    'India',
    'United States',
    'United Kingdom',
    'Canada',
    'Australia',
    'United Arab Emirates',
    'Singapore',
    'Delhi NCR',
    'Mumbai',
    'Bengaluru',
    'Hyderabad',
    'Chennai',
    'Kolkata',
    'Pune',
    'Ahmedabad',
    'Tier 1 Cities',
    'Tier 2 Cities'
  ]);
  adSets.forEach((a) => {
    (a.includedLocations || []).forEach((loc) => loc && locationSet.add(loc.trim()));
    (a.excludedLocations || []).forEach((loc) => loc && locationSet.add(loc.trim()));
  });
  return Array.from(locationSet).filter(Boolean).sort();
};

export const uploadCreativeFile = async ({ fileData, fileName, mimeType }) => {
  const uploadResult = await uploadImage({
    base64Data: fileData,
    fileName: fileName || `creative-${Date.now()}.png`,
    type: 'after',
    mimeType: mimeType || 'image/png'
  });
  return uploadResult;
};

export const deleteCreativeFile = async (fileId) => {
  return await deleteImage({ fileId });
};

