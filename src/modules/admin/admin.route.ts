import { Router } from 'express';
import { AdminController } from './admin.controller';
import { validateRequest } from '../../middlewares/validateRequest';
import { authenticate, authorize } from '../../middlewares/auth';
import { Role } from '@prisma/client';
import * as schemas from './admin.validation';

const router = Router();

router.use(authenticate);
router.use(authorize(Role.ADMIN));

router.get('/users', AdminController.getUsers);

router.patch(
  '/users/:id/role',
  validateRequest(schemas.changeRoleSchema),
  AdminController.changeUserRole,
);

router.patch(
  '/users/:id/deactivate',
  validateRequest(schemas.deactivateUserSchema),
  AdminController.deactivateUser,
);

router.get('/dashboard-stats', AdminController.getDashboardStats);

router.get('/audit-logs', AdminController.getAuditLogs);

export const AdminRoutes = router;
