import { Router } from 'express';
import { AuditLogController } from './auditLog.controller';
import { authenticate, authorize } from '../../middlewares/auth';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

// Only ADMIN can view audit logs
router.get('/', authorize(Role.ADMIN), AuditLogController.getAuditLogs);

export const AuditLogRoutes = router;
