import { z } from 'zod';

export const createAdSetSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, 'Ad Set name is required').max(200),
    campaignId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid campaign ID'),
    launchDate: z.string().nullable().optional(),
    budget: z.number().nullable().optional(),
    ageGroup: z.object({
      start: z.number().min(13).max(100).optional(),
      end: z.number().min(13).max(100).optional()
    }).optional(),
    gender: z.enum(['Male', 'Female', 'Both']).optional(),
    includedLocations: z.array(z.string()).optional(),
    excludedLocations: z.array(z.string()).optional(),
    targeting: z.enum(['Broad', 'Interest']).optional(),
    interests: z.array(z.string()).optional(),
    partOfCurrentCycle: z.boolean().optional(),
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
