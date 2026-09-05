import { z } from 'zod';

export const assignComplaintSchema = z.object({
  body: z.object({
    staffId: z.string().uuid(),
  }),
});

export const reassignComplaintSchema = z.object({
  body: z.object({
    staffId: z.string().uuid(),
  }),
});
