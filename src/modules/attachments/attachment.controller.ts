import { Request, Response } from 'express';
import { catchAsync } from '../../shared/catchAsync';
import { sendResponse } from '../../shared/sendResponse';
import { AttachmentService } from './attachment.service';
import { AppError } from '../../shared/AppError';
import { IUploadAttachmentPayload } from './attachment.interface';

const uploadAttachment = catchAsync(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new AppError(400, 'File is required');
  }

  const payload: IUploadAttachmentPayload = {
    complaintId: req.params.id as string,
    stage: req.body.stage,
    fileType: req.body.fileType,
  };

  const result = await AttachmentService.uploadAttachment(req.user!, payload, req.file);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Attachment uploaded successfully',
    data: result,
  });
});

const deleteAttachment = catchAsync(async (req: Request, res: Response) => {
  await AttachmentService.deleteAttachment(req.user!, req.params.id as string);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Attachment deleted successfully',
    data: null,
  });
});

export const AttachmentController = {
  uploadAttachment,
  deleteAttachment,
};
