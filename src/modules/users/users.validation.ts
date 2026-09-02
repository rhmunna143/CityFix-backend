import { z } from 'zod';
import { Role } from '@prisma/client';

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    phone: z.string().optional(),
  }),
});

export const changeRoleSchema = z.object({
  body: z.object({
    role: z.nativeEnum(Role),
  }),
});
