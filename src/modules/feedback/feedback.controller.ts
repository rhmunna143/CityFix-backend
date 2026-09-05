import { Request, Response } from 'express';
import { catchAsync } from '../../shared/catchAsync';
import { sendResponse } from '../../shared/sendResponse';
import { FeedbackService } from './feedback.service';

const submitFeedback = catchAsync(async (req: Request, res: Response) => {
  const result = await FeedbackService.submitFeedback(
    req.user!,
    req.params.id as string,
    req.body
  );
  
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Feedback submitted successfully',
    data: result,
  });
});

const getFeedback = catchAsync(async (req: Request, res: Response) => {
  const result = await FeedbackService.getFeedback(req.params.id as string);
  
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Feedback retrieved successfully',
    data: result,
  });
});

export const FeedbackController = {
  submitFeedback,
  getFeedback,
};
