import { Request, Response } from 'express';
import { catchAsync } from '../../shared/catchAsync';
import { sendResponse } from '../../shared/sendResponse';
import { PaymentService } from './payment.service';

const initiatePayment = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.initiatePayment(req.user!.id, req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Payment session initiated',
    data: result,
  });
});

const handleWebhook = catchAsync(async (req: Request, res: Response) => {
  // express.raw() adds req.body as a Buffer if properly configured
  const signature = req.headers['stripe-signature'] as string;
  
  await PaymentService.handleWebhook(req.body, signature);

  res.status(200).json({ received: true });
});

const getMyHistory = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.getMyHistory(req.user!.id, req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Payment history retrieved',
    meta: result.meta,
    data: result.data,
  });
});

const getPaymentById = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.getPaymentById(req.user!, req.params.id as string);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Payment retrieved',
    data: result,
  });
});

export const PaymentController = {
  initiatePayment,
  handleWebhook,
  getMyHistory,
  getPaymentById,
};
