import { PaymentPurpose } from '@prisma/client';

export interface IInitiatePaymentPayload {
  complaintId: string;
  purpose: PaymentPurpose;
}
