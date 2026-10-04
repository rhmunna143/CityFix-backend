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
import { AdminRoutes } from '../modules/admin/admin.route';
import { PublicRoutes } from '../modules/public/public.route';

const router = Router();

const moduleRoutes = [
  {
    path: '/payments',
    route: PaymentRoutes,
  },
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
    path: '/admin',
    route: AdminRoutes,
  },
  {
    path: '/public',
    route: PublicRoutes,
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
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
