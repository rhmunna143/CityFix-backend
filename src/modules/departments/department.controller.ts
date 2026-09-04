import { Request, Response } from 'express';
import { catchAsync } from '../../shared/catchAsync';
import { sendResponse } from '../../shared/sendResponse';
import { DepartmentService } from './department.service';

const createDepartment = catchAsync(async (req: Request, res: Response) => {
  const result = await DepartmentService.createDepartment(req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Department created successfully',
    data: result,
  });
});

const getAllDepartments = catchAsync(async (req: Request, res: Response) => {
  const result = await DepartmentService.getAllDepartments(req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Departments retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

const updateDepartment = catchAsync(async (req: Request, res: Response) => {
  const result = await DepartmentService.updateDepartment(req.params.id as string, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Department updated successfully',
    data: result,
  });
});

const deleteDepartment = catchAsync(async (req: Request, res: Response) => {
  await DepartmentService.deleteDepartment(req.params.id as string);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Department deleted successfully',
    data: null,
  });
});

export const DepartmentController = {
  createDepartment,
  getAllDepartments,
  updateDepartment,
  deleteDepartment,
};
