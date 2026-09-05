import { Request, Response } from 'express';
import { catchAsync } from '../../shared/catchAsync';
import { sendResponse } from '../../shared/sendResponse';
import { ComplaintService } from './complaint.service';

const createComplaint = catchAsync(async (req: Request, res: Response) => {
  const result = await ComplaintService.createComplaint(req.user!.id, req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Complaint created successfully',
    data: result,
  });
});

const getAllComplaints = catchAsync(async (req: Request, res: Response) => {
  const result = await ComplaintService.getAllComplaints(req.user!, req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Complaints retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

const getComplaintById = catchAsync(async (req: Request, res: Response) => {
  const result = await ComplaintService.getComplaintById(req.user!, req.params.id as string);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Complaint retrieved successfully',
    data: result,
  });
});

const updateComplaintStatus = catchAsync(async (req: Request, res: Response) => {
  const result = await ComplaintService.updateComplaintStatus(
    req.user!,
    req.params.id as string,
    req.body,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Complaint status updated successfully',
    data: result,
  });
});

const reopenComplaint = catchAsync(async (req: Request, res: Response) => {
  const result = await ComplaintService.reopenComplaint(req.user!.id, req.params.id as string);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Complaint reopened successfully',
    data: result,
  });
});

const deleteComplaint = catchAsync(async (req: Request, res: Response) => {
  await ComplaintService.deleteComplaint(req.user!, req.params.id as string);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Complaint deleted successfully',
    data: null,
  });
});

const searchComplaints = catchAsync(async (req: Request, res: Response) => {
  const result = await ComplaintService.searchComplaints(req.user!, req.query.q as string);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Complaints searched successfully',
    data: result,
  });
});

const getMyAssigned = catchAsync(async (req: Request, res: Response) => {
  const result = await ComplaintService.getMyAssigned(req.user!.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Assigned complaints retrieved successfully',
    data: result,
  });
});

export const ComplaintController = {
  createComplaint,
  getAllComplaints,
  getComplaintById,
  updateComplaintStatus,
  reopenComplaint,
  deleteComplaint,
  searchComplaints,
  getMyAssigned,
};
