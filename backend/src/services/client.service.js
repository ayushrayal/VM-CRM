import { Client } from '../models/Client.js';
import { Campaign } from '../models/Campaign.js';
import { AdSet } from '../models/AdSet.js';
import { CreativeStrategy } from '../models/CreativeStrategy.js';
import { CreativeStrategyTimeline } from '../models/CreativeStrategyTimeline.js';
import { ProjectProjection } from '../models/ProjectProjection.js';
import { ApiError } from '../utils/ApiError.js';
import { broadcastEvent } from './sse.service.js';

export const getAllClients = async (filter = {}) => {
  const query = {};
  if (filter.status) {
    query.status = filter.status;
  } else {
    // By default include all non-archived clients (both 'active' and legacy records where status is unset)
    query.status = { $ne: 'archived' };
  }
  return await Client.find(query).sort({ name: 1 });
};

export const getClientById = async (clientId) => {
  const client = await Client.findById(clientId);
  if (!client) {
    throw new ApiError(404, 'Client not found');
  }
  return client;
};

export const createClient = async ({
  name,
  clientName,
  code,
  description,
  baselineROAS = 0,
  currentROAS,
  status = 'active',
  userId
}) => {
  const cleanName = (clientName || name || '').trim();
  if (!cleanName) {
    throw new ApiError(400, 'Client name is required');
  }

  const normalized = cleanName.toLowerCase();
  const existing = await Client.findOne({ normalizedName: normalized });
  if (existing) {
    throw new ApiError(400, `A client with the name '${cleanName}' already exists`);
  }

  const numBaseline = Number(baselineROAS) || 0;
  const numCurrent = currentROAS !== undefined && currentROAS !== null
    ? Number(currentROAS) || 0
    : numBaseline;

  const client = await Client.create({
    name: cleanName,
    clientName: cleanName,
    normalizedName: normalized,
    code: code ? code.trim().toUpperCase() : cleanName.substring(0, 4).toUpperCase(),
    description: description ? description.trim() : '',
    baselineROAS: numBaseline,
    currentROAS: numCurrent,
    status: status || 'active',
    createdBy: userId
  });

  broadcastEvent('CLIENT_CREATED', client);
  return client;
};

export const updateClient = async (clientId, updateData) => {
  const client = await Client.findById(clientId);
  if (!client) {
    throw new ApiError(404, 'Client not found');
  }

  const nextName = (updateData.clientName || updateData.name || '').trim();
  if (nextName && nextName.toLowerCase() !== client.normalizedName) {
    const existing = await Client.findOne({
      normalizedName: nextName.toLowerCase(),
      _id: { $ne: clientId }
    });
    if (existing) {
      throw new ApiError(400, `A client with the name '${nextName}' already exists`);
    }
    client.name = nextName;
    client.clientName = nextName;
    client.normalizedName = nextName.toLowerCase();
  }

  if (updateData.code !== undefined) {
    client.code = updateData.code.trim().toUpperCase();
  }
  if (updateData.description !== undefined) {
    client.description = updateData.description.trim();
  }
  if (updateData.baselineROAS !== undefined) {
    client.baselineROAS = Number(updateData.baselineROAS) || 0;
  }
  if (updateData.currentROAS !== undefined) {
    client.currentROAS = Number(updateData.currentROAS) || 0;
  }
  if (updateData.status !== undefined) {
    client.status = updateData.status;
  }

  await client.save();
  broadcastEvent('CLIENT_UPDATED', client);
  return client;
};

export const getClientDeletePreview = async (clientId) => {
  const client = await Client.findById(clientId);
  if (!client) {
    throw new ApiError(404, 'Client not found');
  }

  const campaignsCount = await Campaign.countDocuments({ client: clientId });
  const adSetsCount = await AdSet.countDocuments({ client: clientId });
  const recordsCount = await CreativeStrategy.countDocuments({ client: clientId });

  return {
    clientId: client._id,
    clientName: client.name,
    campaignsCount,
    adSetsCount,
    recordsCount
  };
};

export const deleteClient = async (clientId) => {
  const client = await Client.findById(clientId);
  if (!client) {
    throw new ApiError(404, 'Client not found');
  }

  // Find all Creative Strategy records to clean up timelines
  const records = await CreativeStrategy.find({ client: clientId }).select('_id');
  const recordIds = records.map((r) => r._id);

  if (recordIds.length > 0) {
    await CreativeStrategyTimeline.deleteMany({ creativeStrategy: { $in: recordIds } });
    await CreativeStrategy.deleteMany({ _id: { $in: recordIds } });
  }

  await AdSet.deleteMany({ client: clientId });
  await Campaign.deleteMany({ client: clientId });
  await ProjectProjection.deleteMany({ client: clientId });
  
  // NOTE: Historical performance records (CreativePerformance and CROExperiment)
  // are explicitly PRESERVED and not deleted!
  await Client.findByIdAndDelete(clientId);

  broadcastEvent('CLIENT_DELETED', { clientId });

  return {
    deletedClientId: clientId,
    clientName: client.name,
    recordsDeleted: recordIds.length
  };
};
