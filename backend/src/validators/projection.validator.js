import { z } from 'zod';

const positiveNumber = (field) =>
  z.preprocess((val) => {
    if (val === undefined || val === null || val === '') return undefined;
    const num = Number(val);
    return isNaN(num) ? val : num;
  }, z.number().min(0, `${field} cannot be negative`));

export const createProjectionSchema = z.object({
  body: z.object({
    clientId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid client ID').optional(),
    client: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid client ID').optional(),
    month: z.preprocess((val) => Number(val), z.number().int().min(1, 'Month must be between 1 and 12').max(12, 'Month must be between 1 and 12')),
    year: z.preprocess((val) => Number(val), z.number().int().min(2000, 'Year must be valid').max(2100, 'Year must be valid')),
    targetSpend: positiveNumber('Target spend'),
    targetRevenue: positiveNumber('Target revenue'),
    targetROAS: positiveNumber('Target ROAS'),
    currentDailyBudget: positiveNumber('Current daily budget'),
    notes: z.string().trim().optional()
  }).refine((data) => Boolean(data.clientId || data.client), {
    message: 'Client ID is required',
    path: ['clientId']
  })
});

export const updateProjectionSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid projection ID')
  }),
  body: z.object({
    targetSpend: positiveNumber('Target spend').optional(),
    targetRevenue: positiveNumber('Target revenue').optional(),
    targetROAS: positiveNumber('Target ROAS').optional(),
    currentDailyBudget: positiveNumber('Current daily budget').optional(),
    notes: z.string().trim().optional()
  })
});

export const addDailyTrackingSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid projection ID')
  }),
  body: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
    actualSpend: positiveNumber('Actual spend'),
    actualRevenue: positiveNumber('Actual revenue'),
    notes: z.string().trim().optional()
  })
});

export const addBulkDailyTrackingSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid projection ID')
  }),
  body: z.object({
    entries: z
      .array(
        z.object({
          date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
          actualSpend: positiveNumber('Actual spend'),
          actualRevenue: positiveNumber('Actual revenue'),
          notes: z.string().trim().optional()
        })
      )
      .min(1, 'At least one daily entry is required in batch'),
    overwriteExisting: z.boolean().optional().default(false)
  }).superRefine((data, ctx) => {
    const seen = new Set();
    data.entries.forEach((entry, index) => {
      if (seen.has(entry.date)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate date '${entry.date}' found in submission batch`,
          path: ['entries', index, 'date']
        });
      }
      seen.add(entry.date);
    });
  })
});

export const updateDailyTrackingSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid projection ID'),
    dailyId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid daily entry ID')
  }),
  body: z.object({
    actualSpend: positiveNumber('Actual spend').optional(),
    actualRevenue: positiveNumber('Actual revenue').optional(),
    notes: z.string().trim().optional()
  })
});

export const projectionIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid projection ID')
  })
});

export const dailyIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid projection ID'),
    dailyId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid daily entry ID')
  })
});

export const projectionQuerySchema = z.object({
  query: z.object({
    month: z.preprocess((val) => (val ? Number(val) : undefined), z.number().int().min(1).max(12).optional()),
    year: z.preprocess((val) => (val ? Number(val) : undefined), z.number().int().min(2000).max(2100).optional()),
    clientId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid client ID').optional(),
    client: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid client ID').optional()
  })
});
