import { z } from 'zod';
import * as schemas from './users.validation';

export type IUpdateProfilePayload = z.infer<typeof schemas.updateProfileSchema>['body'];
export type IChangeRolePayload = z.infer<typeof schemas.changeRoleSchema>['body'];
