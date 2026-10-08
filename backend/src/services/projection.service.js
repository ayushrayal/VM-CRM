import { ProjectProjection } from '../models/ProjectProjection.js';
import { Client } from '../models/Client.js';
import { ApiError } from '../utils/ApiError.js';
import { calculateProjectionMetrics } from '../utils/projectionCalculations.js';
import { broadcastEvent } from './sse.service.js';

export const getAllProjections = async (filter = {}) => {
  const query = {};

  if (filter.month) {
    query.month = Number(filter.month);
  }
  if (filter.year) {
    query.year = Number(filter.year);
  }
  const clientId = filter.clientId || filter.client;
  if (clientId) {
    query.client = clientId;
  }

  const projections = await ProjectProjection.find(query)
    .populate('client', 'name clientName code status baselineROAS currentROAS')
    .populate('createdBy', 'name email')
    .sort({ year: -1, month: -1, createdAt: -1 });

  return projections.map((proj) => {
    const projObj = proj.toObject();
    projObj.calculations = calculateProjectionMetrics(projObj);
    return projObj;
  });
};

export const getProjectionById = async (projectionId) => {
  const projection = await ProjectProjection.findById(projectionId)
    .populate('client', 'name clientName code status baselineROAS currentROAS')
    .populate('budgetHistory.updatedBy', 'name email')
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email');

  if (!projection) {
    throw new ApiError(404, 'Projection not found');
  }

  const projObj = projection.toObject();
  // Sort daily tracking by date ascending for clean display
  if (Array.isArray(projObj.dailyTracking)) {
    projObj.dailyTracking.sort((a, b) => a.date.localeCompare(b.date));
  }
  projObj.calculations = calculateProjectionMetrics(projObj);
  return projObj;
};

export const createProjection = async ({
  client,
  clientId,
  month,
  year,
  targetSpend,
  targetRevenue,
  targetROAS,
  currentDailyBudget,
  notes = '',
  userId
}) => {
  const targetClientId = clientId || client;
  if (!targetClientId) {
    throw new ApiError(400, 'Client is required');
  }

  const clientDoc = await Client.findById(targetClientId);
  if (!clientDoc) {
    throw new ApiError(404, 'Client not found in CRM');
  }

  const numMonth = Number(month);
  const numYear = Number(year);

  // Prevent duplicate monthly projection for same client/month/year
  const existing = await ProjectProjection.findOne({
    client: targetClientId,
    year: numYear,
    month: numMonth
  });

  if (existing) {
    throw new ApiError(
      400,
      `A projection for client '${clientDoc.name}' already exists for ${String(numMonth).padStart(2, '0')}/${numYear}.`
    );
  }

  const numDailyBudget = Number(currentDailyBudget) || 0;
  const effectiveDate = `${numYear}-${String(numMonth).padStart(2, '0')}-01`;

  const newProjection = await ProjectProjection.create({
    client: targetClientId,
    month: numMonth,
    year: numYear,
    targetSpend: Number(targetSpend) || 0,
    targetRevenue: Number(targetRevenue) || 0,
    targetROAS: Number(targetROAS) || 0,
    currentDailyBudget: numDailyBudget,
    budgetHistory: [
      {
        budget: numDailyBudget,
        effectiveDate,
        updatedAt: new Date(),
        updatedBy: userId
      }
    ],
    dailyTracking: [],
    notes: (notes || '').trim(),
    createdBy: userId,
    updatedBy: userId
  });

  const populated = await ProjectProjection.findById(newProjection._id)
    .populate('client', 'name clientName code status baselineROAS currentROAS')
    .populate('createdBy', 'name email');

  const projObj = populated.toObject();
  projObj.calculations = calculateProjectionMetrics(projObj);

  broadcastEvent('PROJECTION_CREATED', projObj);
  return projObj;
};

export const updateProjection = async (projectionId, updateData, userId) => {
  const projection = await ProjectProjection.findById(projectionId);
  if (!projection) {
    throw new ApiError(404, 'Projection not found');
  }

  // Update targets if provided
  if (updateData.targetSpend !== undefined) {
    projection.targetSpend = Number(updateData.targetSpend);
  }
  if (updateData.targetRevenue !== undefined) {
    projection.targetRevenue = Number(updateData.targetRevenue);
  }
  if (updateData.targetROAS !== undefined) {
    projection.targetROAS = Number(updateData.targetROAS);
  }
  if (updateData.notes !== undefined) {
    projection.notes = (updateData.notes || '').trim();
  }

  // Handle currentDailyBudget update & budget history preservation
  if (
    updateData.currentDailyBudget !== undefined &&
    Number(updateData.currentDailyBudget) !== projection.currentDailyBudget
  ) {
    const newBudget = Number(updateData.currentDailyBudget);
    const todayStr = new Date().toISOString().split('T')[0];

    projection.currentDailyBudget = newBudget;
    projection.budgetHistory.push({
      budget: newBudget,
      effectiveDate: todayStr,
      updatedAt: new Date(),
      updatedBy: userId
    });
  }

  projection.updatedBy = userId;
  await projection.save();

  const populated = await ProjectProjection.findById(projection._id)
    .populate('client', 'name clientName code status baselineROAS currentROAS')
    .populate('budgetHistory.updatedBy', 'name email')
    .populate('updatedBy', 'name email');

  const projObj = populated.toObject();
  if (Array.isArray(projObj.dailyTracking)) {
    projObj.dailyTracking.sort((a, b) => a.date.localeCompare(b.date));
  }
  projObj.calculations = calculateProjectionMetrics(projObj);

  broadcastEvent('PROJECTION_UPDATED', projObj);
  return projObj;
};

export const addOrUpdateDailyTracking = async (projectionId, dailyData, userId) => {
  const projection = await ProjectProjection.findById(projectionId);
  if (!projection) {
    throw new ApiError(404, 'Projection not found');
  }

  // Validate date matches projection's month & year
  const [entryYear, entryMonth] = dailyData.date.split('-').map(Number);
  if (entryYear !== projection.year || entryMonth !== projection.month) {
    throw new ApiError(
      400,
      `Date '${dailyData.date}' does not match projection period (${String(projection.month).padStart(2, '0')}/${projection.year}).`
    );
  }

  // Check if date entry already exists (upsert behavior)
  const existingIndex = projection.dailyTracking.findIndex((e) => e.date === dailyData.date);

  if (existingIndex > -1) {
    // Update existing record rather than create a duplicate
    projection.dailyTracking[existingIndex].actualSpend = Number(dailyData.actualSpend) || 0;
    projection.dailyTracking[existingIndex].actualRevenue = Number(dailyData.actualRevenue) || 0;
    if (dailyData.notes !== undefined) {
      projection.dailyTracking[existingIndex].notes = (dailyData.notes || '').trim();
    }
    projection.dailyTracking[existingIndex].updatedAt = new Date();
  } else {
    // Add new daily record
    projection.dailyTracking.push({
      date: dailyData.date,
      actualSpend: Number(dailyData.actualSpend) || 0,
      actualRevenue: Number(dailyData.actualRevenue) || 0,
      notes: (dailyData.notes || '').trim(),
      updatedAt: new Date()
    });
  }

  // Sort daily entries chronologically
  projection.dailyTracking.sort((a, b) => a.date.localeCompare(b.date));
  projection.updatedBy = userId;
  await projection.save();

  const populated = await ProjectProjection.findById(projection._id)
    .populate('client', 'name clientName code status baselineROAS currentROAS')
    .populate('budgetHistory.updatedBy', 'name email');

  const projObj = populated.toObject();
  projObj.calculations = calculateProjectionMetrics(projObj);

  broadcastEvent('PROJECTION_UPDATED', projObj);
  return projObj;
};

export const updateDailyTrackingEntry = async (projectionId, dailyId, updateData, userId) => {
  const projection = await ProjectProjection.findById(projectionId);
  if (!projection) {
    throw new ApiError(404, 'Projection not found');
  }

  const entry = projection.dailyTracking.id(dailyId);
  if (!entry) {
    throw new ApiError(404, 'Daily tracking entry not found');
  }

  if (updateData.actualSpend !== undefined) {
    entry.actualSpend = Number(updateData.actualSpend) || 0;
  }
  if (updateData.actualRevenue !== undefined) {
    entry.actualRevenue = Number(updateData.actualRevenue) || 0;
  }
  if (updateData.notes !== undefined) {
    entry.notes = (updateData.notes || '').trim();
  }
  entry.updatedAt = new Date();

  projection.updatedBy = userId;
  await projection.save();

  const populated = await ProjectProjection.findById(projection._id)
    .populate('client', 'name clientName code status baselineROAS currentROAS');

  const projObj = populated.toObject();
  if (Array.isArray(projObj.dailyTracking)) {
    projObj.dailyTracking.sort((a, b) => a.date.localeCompare(b.date));
  }
  projObj.calculations = calculateProjectionMetrics(projObj);

  broadcastEvent('PROJECTION_UPDATED', projObj);
  return projObj;
};

export const deleteDailyTrackingEntry = async (projectionId, dailyId, userId) => {
  const projection = await ProjectProjection.findById(projectionId);
  if (!projection) {
    throw new ApiError(404, 'Projection not found');
  }

  const entry = projection.dailyTracking.id(dailyId);
  if (!entry) {
    throw new ApiError(404, 'Daily tracking entry not found');
  }

  projection.dailyTracking.pull(dailyId);
  projection.updatedBy = userId;
  await projection.save();

  const populated = await ProjectProjection.findById(projection._id)
    .populate('client', 'name clientName code status baselineROAS currentROAS');

  const projObj = populated.toObject();
  if (Array.isArray(projObj.dailyTracking)) {
    projObj.dailyTracking.sort((a, b) => a.date.localeCompare(b.date));
  }
  projObj.calculations = calculateProjectionMetrics(projObj);

  broadcastEvent('PROJECTION_UPDATED', projObj);
  return projObj;
};

export const deleteProjection = async (projectionId) => {
  const projection = await ProjectProjection.findById(projectionId);
  if (!projection) {
    throw new ApiError(404, 'Projection not found');
  }

  await ProjectProjection.findByIdAndDelete(projectionId);
  broadcastEvent('PROJECTION_DELETED', { projectionId });

  return {
    deletedProjectionId: projectionId,
    client: projection.client,
    month: projection.month,
    year: projection.year
  };
};
