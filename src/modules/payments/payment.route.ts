import { Router } from 'express';
import { PaymentController } from './payment.controller';
import { validateRequest } from '../../middlewares/validateRequest';
import { authenticate } from '../../middlewares/auth';
import * as schemas from './payment.validation';

const router = Router();

// Webhook must not go through the global JSON parser,
// so it needs to use express.raw(). We will configure this in src/app.ts
// or define it here. Actually, if it's already parsed as JSON in app.ts,
// it will fail here. So we should handle the raw parsing specifically for this route.
router.post('/webhook', PaymentController.handleWebhook);

router.use(authenticate);

router.post(
  '/initiate',
  validateRequest(schemas.initiatePaymentSchema),
  PaymentController.initiatePayment,
);

router.get('/my-history', PaymentController.getMyHistory);

router.get('/:id', PaymentController.getPaymentById);

export const PaymentRoutes = router;
