import { z } from 'zod';
import * as schemas from './complaint.validation';

export type ICreateComplaintPayload = z.infer<typeof schemas.createComplaintSchema>['body'];
export type IUpdateComplaintStatusPayload = z.infer<typeof schemas.updateComplaintStatusSchema>['body'];
