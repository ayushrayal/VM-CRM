import { z } from 'zod';
import { CREATIVE_STATUS, LEADERBOARD_PERIOD } from '../constants/creative.constants.js';

const numberPreprocess = (name = 'Number', isInteger = false) =>
  z.preprocess((val) => {
    if (val === undefined || val === null || val === '') return undefined;
    const num = Number(val);
    return isNaN(num) ? val : num;
  }, isInteger
    ? z.number({ required_error: `${name} is required`, invalid_type_error: `${name} must be a number` })
        .int(`${name} must be an integer`)
        .min(0, `${name} cannot be negative`)
    : z.number({ required_error: `${name} is required`, invalid_type_error: `${name} must be a number` })
        .min(0, `${name} cannot be negative`)
  );

const optionalNumberPreprocess = (name = 'Number', isInteger = false) =>
  z.preprocess((val) => {
    if (val === undefined || val === null || val === '') return undefined;
    const num = Number(val);
    return isNaN(num) ? val : num;
  }, isInteger
    ? z.number({ invalid_type_error: `${name} must be a number` })
        .int(`${name} must be an integer`)
        .min(0, `${name} cannot be negative`)
        .optional()
    : z.number({ invalid_type_error: `${name} must be a number` })
        .min(0, `${name} cannot be negative`)
        .optional()
  );

export const createCreativeSchema = z.object({
  body: z.object({
    clientName: z.string({ required_error: 'Client name is required' }).trim().min(1, 'Client name is required').max(150),
    adName: z.string({ required_error: 'Ad name is required' }).trim().min(1, 'Ad name is required').max(200),
    roas: numberPreprocess('ROAS', false),
    purchases: numberPreprocess('Purchases', true),
    status: z.enum(Object.values(CREATIVE_STATUS), {
      errorMap: () => ({ message: 'Invalid creative status' })
    }),
    // Explicitly disallow or ignore frontend score/creator injection
    creatorId: z.any().optional(),
    creatorName: z.any().optional(),
    score: z.any().optional()
  })
});

export const updateCreativeSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid creative ID format')
  }),
  body: z.object({
    clientName: z.string().trim().min(1, 'Client name cannot be empty').max(150).optional(),
    adName: z.string().trim().min(1, 'Ad name cannot be empty').max(200).optional(),
    roas: optionalNumberPreprocess('ROAS', false),
    purchases: optionalNumberPreprocess('Purchases', true),
    status: z.enum(Object.values(CREATIVE_STATUS), {
      errorMap: () => ({ message: 'Invalid creative status' })
    }).optional(),
    creatorId: z.any().optional(),
    creatorName: z.any().optional(),
    score: z.any().optional()
  })
});

export const creativeIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid creative ID format')
  })
});

export const leaderboardQuerySchema = z.object({
  query: z.object({
    period: z.enum(Object.values(LEADERBOARD_PERIOD), {
      errorMap: () => ({ message: 'Invalid leaderboard period' })
    }).optional().default(LEADERBOARD_PERIOD.ALL_TIME)
  })
});

export const listCreativesQuerySchema = z.object({
  query: z.object({
    status: z.string().optional(),
    creatorId: z.string().optional(),
    clientName: z.string().optional(),
    search: z.string().optional()
  })
});
