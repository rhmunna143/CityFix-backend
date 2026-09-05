import { Router } from 'express';
import { AuthRoutes } from '../modules/auth/auth.route';
import { UsersRoutes } from '../modules/users/users.route';
import { DepartmentRoutes } from '../modules/departments/department.route';
import { CategoryRoutes } from '../modules/categories/category.route';
import { ComplaintRoutes } from '../modules/complaints/complaint.route';
import { AuditLogRoutes } from '../modules/auditLogs/auditLog.route';
import { NotificationRoutes } from '../modules/notifications/notification.route';
import { AssignmentRoutes } from '../modules/assignments/assignment.route';
import { AttachmentRoutes } from '../modules/attachments/attachment.route';
import { FeedbackRoutes } from '../modules/feedback/feedback.route';
import { PaymentRoutes } from '../modules/payments/payment.route';

const router = Router();

const moduleRoutes = [
  {
    path: '/auth',
    route: AuthRoutes,
  },
  {
    path: '/users',
    route: UsersRoutes,
  },
  {
    path: '/departments',
    route: DepartmentRoutes,
  },
  {
    path: '/categories',
    route: CategoryRoutes,
  },
  {
    path: '/complaints',
    route: ComplaintRoutes,
  },
  {
    path: '/audit-logs',
    route: AuditLogRoutes,
  },
  {
    path: '/notifications',
    route: NotificationRoutes,
  },
  {
    path: '/',
    route: AssignmentRoutes,
  },
  {
    path: '/',
    route: AttachmentRoutes,
  },
  {
    path: '/',
    route: FeedbackRoutes,
  },
  {
    path: '/payments',
    route: PaymentRoutes,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
