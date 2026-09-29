import { z } from 'zod';
import mongoose from 'mongoose';

export const teamRequestIdParamSchema = z.object({
  params: z.object({
    id: z
      .string({ required_error: 'User ID parameter is required' })
      .refine((val) => mongoose.Types.ObjectId.isValid(val), {
        message: 'Invalid user ID format. Must be a valid 24-character hexadecimal ObjectId.'
      })
  })
});

export const updateUserTeamRoleSchema = z.object({
  params: z.object({
    id: z
      .string({ required_error: 'User ID parameter is required' })
      .refine((val) => mongoose.Types.ObjectId.isValid(val), {
        message: 'Invalid user ID format. Must be a valid 24-character hexadecimal ObjectId.'
      })
  }),
  body: z.object({
    teamRole: z.enum(['media_buyer', 'creative_strategist', 'graphic_designer', 'none', 'unassigned']).nullable().optional()
  })
});
