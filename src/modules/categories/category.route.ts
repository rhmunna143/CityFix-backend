import { Router } from 'express';
import { CategoryController } from './category.controller';
import { validateRequest } from '../../middlewares/validateRequest';
import { authenticate, authorize } from '../../middlewares/auth';
import * as schemas from './category.validation';
import { Role } from '@prisma/client';

const router = Router();

router.get('/', CategoryController.getAllCategories);

router.use(authenticate);

router.post(
  '/',
  authorize(Role.ADMIN),
  validateRequest(schemas.createCategorySchema),
  CategoryController.createCategory,
);

router.patch(
  '/:id',
  authorize(Role.ADMIN),
  validateRequest(schemas.updateCategorySchema),
  CategoryController.updateCategory,
);

router.delete('/:id', authorize(Role.ADMIN), CategoryController.deleteCategory);

export const CategoryRoutes = router;
