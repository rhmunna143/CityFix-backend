import { Request, Response } from 'express';
import { catchAsync } from '../../shared/catchAsync';
import { sendResponse } from '../../shared/sendResponse';
import { AuditLogService } from './auditLog.service';

const getAuditLogs = catchAsync(async (req: Request, res: Response) => {
  const result = await AuditLogService.getAuditLogs(req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Audit logs retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

export const AuditLogController = {
  getAuditLogs,
};
