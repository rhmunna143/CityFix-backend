import { Router } from 'express';
import { AssignmentController } from './assignment.controller';
import { validateRequest } from '../../middlewares/validateRequest';
import { authenticate, authorize } from '../../middlewares/auth';
import * as schemas from './assignment.validation';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

// We define reassign here, but the assign route lives mostly on the complaint endpoint logic in index or handled via this file.
// The PRD says:
// POST /complaints/:id/assign 🔒 — STAFF(lead)/ADMIN
// PATCH /assignments/:id/reassign 🔒 — STAFF(lead)/ADMIN

router.post(
  '/complaints/:id/assign',
  authorize(Role.STAFF, Role.ADMIN),
  validateRequest(schemas.assignComplaintSchema),
  AssignmentController.assignComplaint,
);

router.patch(
  '/assignments/:id/reassign',
  authorize(Role.STAFF, Role.ADMIN),
  validateRequest(schemas.reassignComplaintSchema),
  AssignmentController.reassignComplaint,
);

export const AssignmentRoutes = router;
