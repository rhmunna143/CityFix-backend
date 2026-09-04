import { Router } from 'express';
import { ComplaintController } from './complaint.controller';
import { validateRequest } from '../../middlewares/validateRequest';
import { authenticate, authorize } from '../../middlewares/auth';
import * as schemas from './complaint.validation';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

// Specific routes first
router.get(
  '/search',
  authorize(Role.STAFF, Role.ADMIN),
  ComplaintController.searchComplaints
);

router.get(
  '/my-assigned',
  authorize(Role.STAFF),
  ComplaintController.getMyAssigned
);

// General routes
router.post(
  '/',
  authorize(Role.CITIZEN),
  validateRequest(schemas.createComplaintSchema),
  ComplaintController.createComplaint
);

router.get('/', ComplaintController.getAllComplaints);

router.get('/:id', ComplaintController.getComplaintById);

router.patch(
  '/:id/status',
  authorize(Role.STAFF, Role.ADMIN),
  validateRequest(schemas.updateComplaintStatusSchema),
  ComplaintController.updateComplaintStatus
);

router.post(
  '/:id/reopen',
  authorize(Role.CITIZEN),
  ComplaintController.reopenComplaint
);

router.delete(
  '/:id',
  authorize(Role.CITIZEN, Role.ADMIN),
  ComplaintController.deleteComplaint
);

export const ComplaintRoutes = router;
