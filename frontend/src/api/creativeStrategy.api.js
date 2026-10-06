import { api } from './axios';

export const getCreativeStrategies = async (params = {}) => {
  const response = await api.get('/creative-strategy', { params });
  return response.data;
};

export const getCreativeStrategyById = async (id) => {
  const response = await api.get(`/creative-strategy/${id}`);
  return response.data;
};

export const getTimeline = async (id) => {
  const response = await api.get(`/creative-strategy/${id}/timeline`);
  return response.data;
};

export const createCreativeStrategy = async (data) => {
  const response = await api.post('/creative-strategy', data);
  return response.data;
};

export const unifiedCreateCreativeStrategy = async (data) => {
  const response = await api.post('/creative-strategy/unified-create', data);
  return response.data;
};

export const getTargetingLocations = async () => {
  const response = await api.get('/creative-strategy/targeting-locations');
  return response.data;
};

export const uploadCreativeFile = async (data) => {
  const response = await api.post('/creative-strategy/upload', data);
  return response.data;
};

export const deleteCreativeFile = async (fileId) => {
  const response = await api.delete(`/creative-strategy/upload/${fileId}`);
  return response.data;
};

export const updateCreativeStrategy = async (id, data) => {
  const response = await api.patch(`/creative-strategy/${id}`, data);
  return response.data;
};

export const getCreativeDeletePreview = async (id) => {
  const response = await api.get(`/creative-strategy/${id}/delete-preview`);
  return response.data;
};

export const deleteCreativeStrategy = async (id) => {
  const response = await api.delete(`/creative-strategy/${id}`);
  return response.data;
};

// Workflow stage actions
export const launchCreative = async (id, data = {}) => {
  const response = await api.post(`/creative-strategy/${id}/launch`, data);
  return response.data;
};

export const submitReport = async (id, data) => {
  const response = await api.post(`/creative-strategy/${id}/report`, data);
  return response.data;
};

export const submitPerformanceAnalysis = async (id, data) => {
  const response = await api.post(`/creative-strategy/${id}/performance-analysis`, data);
  return response.data;
};

export const submitLearnings = async (id, data) => {
  const response = await api.post(`/creative-strategy/${id}/learnings`, data);
  return response.data;
};

export const assignGraphicDesigner = async (id, designerId) => {
  const response = await api.post(`/creative-strategy/${id}/assign-designer`, { designerId });
  return response.data;
};

export const createBrief = async (id, data) => {
  const response = await api.post(`/creative-strategy/${id}/brief`, data);
  return response.data;
};

export const reviewBrief = async (id, data) => {
  const response = await api.post(`/creative-strategy/${id}/review-brief`, data);
  return response.data;
};

export const approveBrief = async (id) => {
  const response = await api.post(`/creative-strategy/${id}/approve-brief`);
  return response.data;
};

export const submitProduction = async (id, data) => {
  const response = await api.post(`/creative-strategy/${id}/production`, data);
  return response.data;
};

export const reviewInternalCreative = async (id, data) => {
  const response = await api.post(`/creative-strategy/${id}/internal-review`, data);
  return response.data;
};

export const approveInternalReview = async (id, data = {}) => {
  const response = await api.post(`/creative-strategy/${id}/approve-internal-review`, data);
  return response.data;
};

export const clientReviewDecision = async (id, data) => {
  const response = await api.post(`/creative-strategy/${id}/client-review`, data);
  return response.data;
};

export const finalApproval = async (id, data) => {
  const response = await api.post(`/creative-strategy/${id}/final-approval`, data);
  return response.data;
};

export const handoffToMediaBuyer = async (id) => {
  const response = await api.post(`/creative-strategy/${id}/handoff`);
  return response.data;
};

export const completeAndCreateNextCycle = async (id, data = {}) => {
  const response = await api.post(`/creative-strategy/${id}/complete-cycle`, data);
  return response.data;
};

export const pauseCreative = async (id) => {
  const response = await api.post(`/creative-strategy/${id}/pause`);
  return response.data;
};

export const resumeCreative = async (id) => {
  const response = await api.post(`/creative-strategy/${id}/resume`);
  return response.data;
};
