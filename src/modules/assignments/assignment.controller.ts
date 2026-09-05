import { Request, Response } from 'express';
import { catchAsync } from '../../shared/catchAsync';
import { sendResponse } from '../../shared/sendResponse';
import { AssignmentService } from './assignment.service';

const assignComplaint = catchAsync(async (req: Request, res: Response) => {
  const result = await AssignmentService.assignComplaint(
    req.user!,
    req.params.id as string,
    req.body,
  );

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Complaint assigned successfully',
    data: result,
  });
});

const reassignComplaint = catchAsync(async (req: Request, res: Response) => {
  const result = await AssignmentService.reassignComplaint(
    req.user!,
    req.params.id as string,
    req.body,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Complaint reassigned successfully',
    data: result,
  });
});

export const AssignmentController = {
  assignComplaint,
  reassignComplaint,
};
