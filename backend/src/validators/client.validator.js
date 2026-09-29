import { z } from 'zod';

export const createClientSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Client name must be at least 2 characters').max(100),
    code: z.string().trim().max(20).optional(),
    description: z.string().trim().optional()
  })
});

export const updateClientSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid client ID')
  }),
  body: z.object({
    name: z.string().trim().min(2).max(100).optional(),
    code: z.string().trim().max(20).optional(),
    description: z.string().trim().optional()
  })
});

export const clientIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid client ID')
  })
});
