import { z } from 'zod';
import { CRO_EXPERIMENT_STATUS, LEADERBOARD_PERIOD } from '../constants/cro.constants.js';

const imageItemSchema = z.object({
  url: z.string().trim().min(1, 'Image URL cannot be empty'),
  name: z.preprocess(
    (val) => (val === null || val === undefined ? '' : String(val).trim()),
    z.string().optional().default('')
  ),
  fileId: z.preprocess(
    (val) => (val === null || val === undefined ? '' : String(val).trim()),
    z.string().optional().default('')
  )
});

const dateNullable = z.preprocess((val) => {
  if (val === '' || val === null || val === undefined) return null;
  const str = String(val).trim();
  return str === '' ? null : str;
}, z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid end date format' }).nullable().optional());

const startDateSchema = z.preprocess((val) => {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}, z.string().min(1, 'Start date is required').refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid start date format' }));

const nullableNumber = (max = undefined, min = 0, name = '') =>
  z.preprocess((val) => {
    if (val === undefined) return undefined;
    if (val === '' || val === null) return null;
    const num = Number(val);
    return isNaN(num) ? val : num;
  }, z.number().min(min, `${name} cannot be negative`).refine((val) => (max !== undefined ? val <= max : true), { message: `${name} cannot exceed ${max}` }).nullable().optional());

const createResultsSchema = z.object({
  salesBefore: nullableNumber(undefined, 0, 'Sales before').default(null),
  salesAfter: nullableNumber(undefined, 0, 'Sales after').default(null),
  prepaidBefore: nullableNumber(100, 0, 'Prepaid %').default(null),
  prepaidAfter: nullableNumber(100, 0, 'Prepaid %').default(null),
  cancellationBefore: nullableNumber(100, 0, 'Cancellation %').default(null),
  cancellationAfter: nullableNumber(100, 0, 'Cancellation %').default(null)
});

const updateResultsSchema = z.object({
  salesBefore: nullableNumber(undefined, 0, 'Sales before'),
  salesAfter: nullableNumber(undefined, 0, 'Sales after'),
  prepaidBefore: nullableNumber(100, 0, 'Prepaid %'),
  prepaidAfter: nullableNumber(100, 0, 'Prepaid %'),
  cancellationBefore: nullableNumber(100, 0, 'Cancellation %'),
  cancellationAfter: nullableNumber(100, 0, 'Cancellation %')
});

const improvementsSchema = z
  .object({
    salesPercent: z.number().nullable().optional(),
    prepaidPercentagePoints: z.number().nullable().optional(),
    cancellationPercentagePoints: z.number().nullable().optional()
  })
  .nullable()
  .optional();

const scoreSchema = z
  .object({
    salesPoints: z.number().optional(),
    prepaidPoints: z.number().optional(),
    cancellationPoints: z.number().optional(),
    totalPoints: z.number().optional()
  })
  .nullable()
  .optional();

export const createCroExperimentSchema = z.object({
  body: z
    .object({
      clientName: z.string().trim().min(1, 'Client name is required').max(150),
      hypothesisTitle: z.string().trim().min(1, 'Hypothesis title is required').max(200),
      hypothesis: z.string().trim().min(1, 'Hypothesis description is required'),
      startDate: startDateSchema,
      endDate: dateNullable.default(null),
      status: z.enum(Object.values(CRO_EXPERIMENT_STATUS)).optional().default(CRO_EXPERIMENT_STATUS.IDEA),
      beforeImages: z.array(imageItemSchema).optional().default([]),
      afterImages: z.array(imageItemSchema).optional().default([]),
      results: createResultsSchema.optional().default({}),
      improvements: improvementsSchema,
      score: scoreSchema
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
      hypothesisTitle: z.string().trim().min(1).max(200).optional(),
      hypothesis: z.string().trim().min(1).optional(),
      startDate: z
        .string()
        .refine((val) => !isNaN(Date.parse(val)), {
          message: 'Invalid start date format'
        })
        .optional(),
      endDate: dateNullable,
      status: z.enum(Object.values(CRO_EXPERIMENT_STATUS)).optional(),
      beforeImages: z.array(imageItemSchema).optional(),
      afterImages: z.array(imageItemSchema).optional(),
      results: updateResultsSchema.optional(),
      improvements: improvementsSchema,
      score: scoreSchema
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

export const deleteCroUploadParamSchema = z.object({
  params: z.object({
    fileId: z.string().trim().min(1, 'fileId is required')
  })
});

export const deleteCroExperimentImageParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid experiment ID format'),
    fileId: z.string().trim().min(1, 'fileId is required')
  })
});

