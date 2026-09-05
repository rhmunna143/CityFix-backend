import { z } from 'zod';

export const deleteAttachmentSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});
