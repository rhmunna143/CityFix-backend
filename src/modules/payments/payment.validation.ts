import { z } from 'zod';
import { PaymentPurpose } from '@prisma/client';

export const initiatePaymentSchema = z.object({
  body: z.object({
    complaintId: z.string().uuid(),
    purpose: z.nativeEnum(PaymentPurpose),
  }),
});
