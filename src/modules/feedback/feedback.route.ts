import { Router } from 'express';
import { FeedbackController } from './feedback.controller';
import { validateRequest } from '../../middlewares/validateRequest';
import { authenticate, authorize } from '../../middlewares/auth';
import * as schemas from './feedback.validation';
import { Role } from '@prisma/client';

const router = Router();

// GET is public
router.get('/complaints/:id/feedback', FeedbackController.getFeedback);

router.use(authenticate);

router.post(
  '/complaints/:id/feedback',
  authorize(Role.CITIZEN),
  validateRequest(schemas.createFeedbackSchema),
  FeedbackController.submitFeedback
);

export const FeedbackRoutes = router;
