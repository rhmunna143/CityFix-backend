import { Request, Response } from 'express';
import { catchAsync } from '../../shared/catchAsync';
import { sendResponse } from '../../shared/sendResponse';
import { AdminService } from './admin.service';

const getUsers = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.getUsers(req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Users retrieved',
    meta: result.meta,
    data: result.data,
  });
});

const changeUserRole = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.changeUserRole(req.user!.id, req.params.id as string, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'User role updated',
    data: result,
  });
});

const deactivateUser = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.deactivateUser(
    req.user!.id,
    req.params.id as string,
    req.body.isActive,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: `User ${req.body.isActive ? 'activated' : 'deactivated'}`,
    data: result,
  });
});

const getDashboardStats = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.getDashboardStats();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Dashboard stats retrieved',
    data: result,
  });
});

const getAuditLogs = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.getAuditLogs(req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Audit logs retrieved',
    meta: result.meta,
    data: result.data,
  });
});

export const AdminController = {
  getUsers,
  changeUserRole,
  deactivateUser,
  getDashboardStats,
  getAuditLogs,
};
