import { Request, Response } from 'express';
import { catchAsync } from '../../shared/catchAsync';
import { sendResponse } from '../../shared/sendResponse';
import { PublicService } from './public.service';

const getPublicStats = catchAsync(async (req: Request, res: Response) => {
  const result = await PublicService.getPublicStats();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Public stats retrieved',
    data: result,
  });
});

export const PublicController = {
  getPublicStats,
};
