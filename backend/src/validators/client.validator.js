import { z } from 'zod';

const roasField = z.preprocess((val) => {
  if (val === undefined || val === null || val === '') return 0;
  const num = Number(val);
  return isNaN(num) ? val : num;
}, z.number().min(0, 'ROAS cannot be negative').optional().default(0));

const optionalRoasField = z.preprocess((val) => {
  if (val === undefined || val === null || val === '') return undefined;
  const num = Number(val);
  return isNaN(num) ? val : num;
}, z.number().min(0, 'ROAS cannot be negative').optional());

export const createClientSchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(2, 'Client name must be at least 2 characters').max(100).optional(),
      clientName: z.string().trim().min(2, 'Client name must be at least 2 characters').max(100).optional(),
      code: z.string().trim().max(20).optional(),
      description: z.string().trim().optional(),
      baselineROAS: roasField,
      currentROAS: roasField,
      status: z.enum(['active', 'archived']).optional()
    })
    .refine((data) => Boolean(data.name || data.clientName), {
      message: 'Client name is required',
      path: ['clientName']
    })
});

export const updateClientSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid client ID')
  }),
  body: z.object({
    name: z.string().trim().min(2, 'Client name must be at least 2 characters').max(100).optional(),
    clientName: z.string().trim().min(2, 'Client name must be at least 2 characters').max(100).optional(),
    code: z.string().trim().max(20).optional(),
    description: z.string().trim().optional(),
    baselineROAS: optionalRoasField,
    currentROAS: optionalRoasField,
    status: z.enum(['active', 'archived']).optional()
  })
});

export const clientIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid client ID')
  })
});
