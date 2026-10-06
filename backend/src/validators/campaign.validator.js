import { z } from 'zod';

export const createCampaignSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, 'Campaign name is required').max(200),
    clientId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid client ID'),
    launchDate: z.string().nullable().optional(),
    campaignType: z.enum(['CBO', 'ABO']).optional(),
    budget: z.number().nullable().optional(),
    objective: z.enum(['Lead Generation', 'Sales', 'Catalog Sales']).optional(),
    status: z.enum(['ACTIVE', 'PAUSED', 'COMPLETED', 'DRAFT']).optional(),
    notes: z.string().trim().optional()
  })
});

export const updateCampaignSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid campaign ID')
  }),
  body: z.object({
    name: z.string().trim().min(1).max(200).optional(),
    launchDate: z.string().nullable().optional(),
    status: z.enum(['ACTIVE', 'PAUSED', 'COMPLETED', 'DRAFT']).optional(),
    notes: z.string().trim().optional()
  })
});

export const campaignIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid campaign ID')
  })
});
