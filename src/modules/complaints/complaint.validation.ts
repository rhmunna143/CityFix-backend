import { z } from 'zod';
import { ComplaintStatus } from '@prisma/client';

export const createComplaintSchema = z.object({
  body: z.object({
    categoryId: z.string().uuid(),
    title: z.string().min(5),
    description: z.string().min(10),
    latitude: z.number(),
    longitude: z.number(),
    address: z.string().min(5),
    isPriority: z.boolean().optional(),
  }),
});

export const updateComplaintStatusSchema = z.object({
  body: z.object({
    status: z.nativeEnum(ComplaintStatus),
    resolutionNote: z.string().optional(),
  }),
});
