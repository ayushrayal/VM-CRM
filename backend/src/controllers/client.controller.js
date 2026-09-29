import * as clientService from '../services/client.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const handleGetAllClients = async (req, res, next) => {
  try {
    const clients = await clientService.getAllClients();
    res.status(200).json(new ApiResponse(200, clients, 'Clients retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const handleGetClientById = async (req, res, next) => {
  try {
    const client = await clientService.getClientById(req.params.id);
    res.status(200).json(new ApiResponse(200, client, 'Client retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const handleCreateClient = async (req, res, next) => {
  try {
    const client = await clientService.createClient({
      ...req.body,
      userId: req.user._id
    });
    res.status(201).json(new ApiResponse(201, client, 'Client created successfully'));
  } catch (error) {
    next(error);
  }
};

export const handleUpdateClient = async (req, res, next) => {
  try {
    const client = await clientService.updateClient(req.params.id, req.body);
    res.status(200).json(new ApiResponse(200, client, 'Client updated successfully'));
  } catch (error) {
    next(error);
  }
};

export const handleGetClientDeletePreview = async (req, res, next) => {
  try {
    const preview = await clientService.getClientDeletePreview(req.params.id);
    res.status(200).json(new ApiResponse(200, preview, 'Client delete preview retrieved'));
  } catch (error) {
    next(error);
  }
};

export const handleDeleteClient = async (req, res, next) => {
  try {
    const result = await clientService.deleteClient(req.params.id);
    res.status(200).json(new ApiResponse(200, result, 'Client and associated records deleted'));
  } catch (error) {
    next(error);
  }
};
