import { Request, Response } from 'express';
import { catchAsync } from '../../shared/catchAsync';
import { sendResponse } from '../../shared/sendResponse';
import { NotificationService } from './notification.service';

const getMyNotifications = catchAsync(async (req: Request, res: Response) => {
  const result = await NotificationService.getMyNotifications(req.user!.id, req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Notifications retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

const markAsRead = catchAsync(async (req: Request, res: Response) => {
  await NotificationService.markAsRead(req.user!.id, req.params.id as string);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Notification marked as read',
    data: null,
  });
});

export const NotificationController = {
  getMyNotifications,
  markAsRead,
};
