import { Router } from 'express';
import { AttachmentController } from './attachment.controller';
import { authenticate } from '../../middlewares/auth';
import { upload } from '../../middlewares/upload';

const router = Router();

router.use(authenticate);

// We define delete here, but the upload route lives mostly on the complaint endpoint logic in index or handled via this file.
// The PRD says:
// POST /complaints/:id/attachments 🔒 — owning CITIZEN or assigned STAFF
// DELETE /attachments/:id 🔒 — uploader/ADMIN

router.post(
  '/complaints/:id/attachments',
  upload.single('file'),
  AttachmentController.uploadAttachment,
);

router.delete('/attachments/:id', AttachmentController.deleteAttachment);

export const AttachmentRoutes = router;
