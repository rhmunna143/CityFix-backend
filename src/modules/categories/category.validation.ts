import { z } from 'zod';

export const createCategorySchema = z.object({
  body: z.object({
    name: z.string().min(2),
    description: z.string().min(5).optional(),
    departmentId: z.string().uuid(),
    slaHours: z.number().int().min(1),
    isChargeable: z.boolean().optional(),
    basePrice: z.number().optional(),
  }),
});

export const updateCategorySchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    description: z.string().min(5).optional(),
    departmentId: z.string().uuid().optional(),
    slaHours: z.number().int().min(1).optional(),
    isChargeable: z.boolean().optional(),
    basePrice: z.number().optional(),
    isActive: z.boolean().optional(),
  }),
});
