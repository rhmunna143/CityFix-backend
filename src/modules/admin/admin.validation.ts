import { z } from 'zod';
import { Role } from '@prisma/client';

export const changeRoleSchema = z.object({
  body: z.object({
    role: z.enum([Role.CITIZEN, Role.STAFF, Role.ADMIN]),
    departmentId: z.string().uuid().optional(), // Required if role is STAFF
    isDepartmentLead: z.boolean().optional(),
    employeeCode: z.string().optional(),
  }),
});

export const deactivateUserSchema = z.object({
  body: z.object({
    isActive: z.boolean(),
  }),
});
