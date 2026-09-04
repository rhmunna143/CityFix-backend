import { z } from 'zod';
import * as schemas from './category.validation';

export type ICreateCategoryPayload = z.infer<typeof schemas.createCategorySchema>['body'];
export type IUpdateCategoryPayload = z.infer<typeof schemas.updateCategorySchema>['body'];
