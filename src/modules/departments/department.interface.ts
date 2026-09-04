import { z } from 'zod';
import * as schemas from './department.validation';

export type ICreateDepartmentPayload = z.infer<typeof schemas.createDepartmentSchema>['body'];
export type IUpdateDepartmentPayload = z.infer<typeof schemas.updateDepartmentSchema>['body'];
