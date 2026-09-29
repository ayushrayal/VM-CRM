import { Client } from '../models/Client.js';
import { Campaign } from '../models/Campaign.js';
import { AdSet } from '../models/AdSet.js';
import { CreativeStrategy } from '../models/CreativeStrategy.js';
import { CreativeStrategyTimeline } from '../models/CreativeStrategyTimeline.js';
import { ApiError } from '../utils/ApiError.js';
import { broadcastEvent } from './sse.service.js';

export const getAllClients = async () => {
  return await Client.find().sort({ name: 1 });
};

export const getClientById = async (clientId) => {
  const client = await Client.findById(clientId);
  if (!client) {
    throw new ApiError(404, 'Client not found');
  }
  return client;
};

export const createClient = async ({ name, code, description, userId }) => {
  const existing = await Client.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } });
  if (existing) {
    throw new ApiError(400, 'A client with this name already exists');
  }

  const client = await Client.create({
    name: name.trim(),
    code: code ? code.trim().toUpperCase() : name.trim().substring(0, 4).toUpperCase(),
    description: description ? description.trim() : '',
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

  if (updateData.name && updateData.name.trim() !== client.name) {
    const existing = await Client.findOne({
      name: { $regex: new RegExp(`^${updateData.name.trim()}$`, 'i') },
      _id: { $ne: clientId }
    });
    if (existing) {
      throw new ApiError(400, 'A client with this name already exists');
    }
    client.name = updateData.name.trim();
  }

  if (updateData.code !== undefined) {
    client.code = updateData.code.trim().toUpperCase();
  }
  if (updateData.description !== undefined) {
    client.description = updateData.description.trim();
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

  // Find all records to clean up timelines
  const records = await CreativeStrategy.find({ client: clientId }).select('_id');
  const recordIds = records.map((r) => r._id);

  if (recordIds.length > 0) {
    await CreativeStrategyTimeline.deleteMany({ creativeStrategy: { $in: recordIds } });
    await CreativeStrategy.deleteMany({ _id: { $in: recordIds } });
  }

  await AdSet.deleteMany({ client: clientId });
  await Campaign.deleteMany({ client: clientId });
  await Client.findByIdAndDelete(clientId);

  broadcastEvent('CLIENT_DELETED', { clientId });

  return {
    deletedClientId: clientId,
    clientName: client.name,
    recordsDeleted: recordIds.length
  };
};
