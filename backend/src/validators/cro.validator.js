import { z } from 'zod';
import { CRO_EXPERIMENT_STATUS, LEADERBOARD_PERIOD } from '../constants/cro.constants.js';

const imageItemSchema = z.object({
  url: z.string().trim().min(1, 'Image URL cannot be empty'),
  name: z.string().trim().optional().default(''),
  fileId: z.string().trim().optional().default('')
});

const resultsSchema = z.object({
  salesBefore: z.number().min(0, 'Sales before cannot be negative').nullable().optional(),
  salesAfter: z.number().min(0, 'Sales after cannot be negative').nullable().optional(),
  prepaidBefore: z.number().min(0).max(100, 'Prepaid % must be between 0 and 100').nullable().optional(),
  prepaidAfter: z.number().min(0).max(100, 'Prepaid % must be between 0 and 100').nullable().optional(),
  cancellationBefore: z.number().min(0).max(100, 'Cancellation % must be between 0 and 100').nullable().optional(),
  cancellationAfter: z.number().min(0).max(100, 'Cancellation % must be between 0 and 100').nullable().optional()
});

export const createCroExperimentSchema = z.object({
  body: z
    .object({
      clientName: z.string().trim().min(1, 'Client name is required').max(150),
      hypothesisTitle: z.string().trim().min(2, 'Hypothesis title must be at least 2 characters').max(200),
      hypothesis: z.string().trim().min(5, 'Hypothesis must be at least 5 characters'),
      startDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: 'Invalid start date format'
      }),
      endDate: z
        .string()
        .refine((val) => !isNaN(Date.parse(val)), {
          message: 'Invalid end date format'
        })
        .nullable()
        .optional(),
      status: z.enum(Object.values(CRO_EXPERIMENT_STATUS)).optional().default(CRO_EXPERIMENT_STATUS.IDEA),
      beforeImages: z.array(imageItemSchema).optional().default([]),
      afterImages: z.array(imageItemSchema).optional().default([]),
      results: resultsSchema.optional().default({})
    })
    .refine(
      (data) => {
        if (data.startDate && data.endDate) {
          return new Date(data.endDate) >= new Date(data.startDate);
        }
        return true;
      },
      {
        message: 'End date must be greater than or equal to start date',
        path: ['endDate']
      }
    )
});

export const updateCroExperimentSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid experiment ID format')
  }),
  body: z
    .object({
      clientName: z.string().trim().min(1).max(150).optional(),
      hypothesisTitle: z.string().trim().min(2).max(200).optional(),
      hypothesis: z.string().trim().min(5).optional(),
      startDate: z
        .string()
        .refine((val) => !isNaN(Date.parse(val)), {
          message: 'Invalid start date format'
        })
        .optional(),
      endDate: z
        .string()
        .refine((val) => !isNaN(Date.parse(val)), {
          message: 'Invalid end date format'
        })
        .nullable()
        .optional(),
      status: z.enum(Object.values(CRO_EXPERIMENT_STATUS)).optional(),
      beforeImages: z.array(imageItemSchema).optional(),
      afterImages: z.array(imageItemSchema).optional(),
      results: resultsSchema.optional()
    })
    .refine(
      (data) => {
        if (data.startDate && data.endDate) {
          return new Date(data.endDate) >= new Date(data.startDate);
        }
        return true;
      },
      {
        message: 'End date must be greater than or equal to start date',
        path: ['endDate']
      }
    )
});

export const croExperimentIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid experiment ID format')
  })
});

export const leaderboardQuerySchema = z.object({
  query: z.object({
    period: z.enum(Object.values(LEADERBOARD_PERIOD)).optional().default(LEADERBOARD_PERIOD.ALL_TIME)
  })
});

export const listCroExperimentsQuerySchema = z.object({
  query: z.object({
    status: z.string().optional(),
    creatorId: z.string().optional(),
    mine: z.string().optional(),
    clientName: z.string().optional(),
    search: z.string().optional()
  })
});
