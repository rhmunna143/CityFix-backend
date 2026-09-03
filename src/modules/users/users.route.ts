import { Router } from 'express';
import { UsersController } from './users.controller';
import { validateRequest } from '../../middlewares/validateRequest';
import { authenticate, authorize, authorizeSuperAdmin } from '../../middlewares/auth';
import { fileUpload } from '../../shared/fileUpload';
import * as schemas from './users.validation';
import { Role } from '@prisma/client';

const router = Router();

// All user routes require authentication
router.use(authenticate);

// Profile routes
router.get('/me', UsersController.getMyProfile);

router.put('/me', validateRequest(schemas.updateProfileSchema), UsersController.updateMyProfile);

router.patch('/me/avatar', fileUpload.single('file'), UsersController.updateAvatar);

// Admin only routes
router.get('/', authorize(Role.ADMIN), UsersController.getAllUsers);

router.get('/:id', authorize(Role.ADMIN), UsersController.getUserById);

// Super admin only routes
router.patch(
  '/:id/role',
  authorizeSuperAdmin,
  validateRequest(schemas.changeRoleSchema),
  UsersController.changeRole
);

router.delete('/:id', authorizeSuperAdmin, UsersController.deleteUser);

export const UsersRoutes = router;
