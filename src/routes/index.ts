import { Router } from 'express';
import { AuthRoutes } from '../modules/auth/auth.route';
import { UsersRoutes } from '../modules/users/users.route';
import { DepartmentRoutes } from '../modules/departments/department.route';
import { CategoryRoutes } from '../modules/categories/category.route';
import { ComplaintRoutes } from '../modules/complaints/complaint.route';

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
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
