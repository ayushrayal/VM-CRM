import { z } from 'zod';

export const createAdSetSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, 'Ad Set name is required').max(200),
    campaignId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid campaign ID'),
    launchDate: z.string().nullable().optional(),
    status: z.enum(['ACTIVE', 'PAUSED', 'COMPLETED', 'DRAFT']).optional(),
    currentTestingCycle: z.number().int().min(1).optional()
  })
});

export const updateAdSetSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ad set ID')
  }),
  body: z.object({
    name: z.string().trim().min(1).max(200).optional(),
    launchDate: z.string().nullable().optional(),
    status: z.enum(['ACTIVE', 'PAUSED', 'COMPLETED', 'DRAFT']).optional(),
    currentTestingCycle: z.number().int().min(1).optional()
  })
});

export const adSetIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ad set ID')
  })
});
