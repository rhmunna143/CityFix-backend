import { prisma } from '../../config/db';
import { AppError } from '../../shared/AppError';
import { IUploadAttachmentPayload } from './attachment.interface';
import { uploadToCloudinary, deleteFromCloudinary } from '../../config/cloudinary';
import { Role } from '@prisma/client';

const uploadAttachment = async (
  user: { id: string; role: Role; isSuperAdmin: boolean },
  payload: IUploadAttachmentPayload,
  file: Express.Multer.File,
) => {
  const complaint = await prisma.complaint.findUnique({
    where: { id: payload.complaintId, deletedAt: null },
    include: { assignments: { where: { isCurrent: true } } },
  });

  if (!complaint) throw new AppError(404, 'Complaint not found');

  if (payload.stage === 'SUBMISSION') {
    if (user.role !== Role.CITIZEN || complaint.citizenId !== user.id) {
      throw new AppError(403, 'Only the owning citizen can upload submission attachments');
    }
  } else if (payload.stage === 'RESOLUTION') {
    if (user.role !== Role.STAFF) {
      throw new AppError(403, 'Only assigned staff can upload resolution attachments');
    }
    const assignment = complaint.assignments[0];
    if (!assignment || assignment.staffId !== user.id) {
      throw new AppError(403, 'Only assigned staff can upload resolution attachments');
    }
  }

  const { secure_url, public_id } = await uploadToCloudinary(file, 'attachments');

  return prisma.attachment.create({
    data: {
      complaintId: payload.complaintId,
      uploadedById: user.id,
      url: secure_url,
      publicId: public_id,
      fileType: payload.fileType,
      stage: payload.stage,
    },
  });
};

const deleteAttachment = async (
  user: { id: string; role: Role; isSuperAdmin: boolean },
  id: string,
) => {
  const attachment = await prisma.attachment.findUnique({ where: { id } });

  if (!attachment) throw new AppError(404, 'Attachment not found');

  if (user.role !== Role.ADMIN && attachment.uploadedById !== user.id) {
    throw new AppError(403, 'You can only delete your own attachments');
  }

  await deleteFromCloudinary(attachment.publicId);

  await prisma.attachment.delete({
    where: { id },
  });

  return null;
};

export const AttachmentService = {
  uploadAttachment,
  deleteAttachment,
};
