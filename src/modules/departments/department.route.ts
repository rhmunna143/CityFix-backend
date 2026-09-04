import { Router } from 'express';
import { DepartmentController } from './department.controller';
import { validateRequest } from '../../middlewares/validateRequest';
import { authenticate, authorize } from '../../middlewares/auth';
import * as schemas from './department.validation';
import { Role } from '@prisma/client';

const router = Router();

router.get('/', DepartmentController.getAllDepartments);

router.use(authenticate);

router.post(
  '/',
  authorize(Role.ADMIN),
  validateRequest(schemas.createDepartmentSchema),
  DepartmentController.createDepartment
);

router.patch(
  '/:id',
  authorize(Role.ADMIN),
  validateRequest(schemas.updateDepartmentSchema),
  DepartmentController.updateDepartment
);

router.delete('/:id', authorize(Role.ADMIN), DepartmentController.deleteDepartment);

export const DepartmentRoutes = router;
