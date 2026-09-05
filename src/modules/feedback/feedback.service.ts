import { prisma } from '../../config/db';
import { AppError } from '../../shared/AppError';
import { ICreateFeedbackPayload } from './feedback.interface';
import { ComplaintStatus, Role } from '@prisma/client';

const submitFeedback = async (
  user: { id: string; role: Role; isSuperAdmin: boolean },
  complaintId: string,
  payload: ICreateFeedbackPayload
) => {
  if (user.role !== Role.CITIZEN) {
    throw new AppError(403, 'Only citizens can submit feedback');
  }

  const complaint = await prisma.complaint.findUnique({
    where: { id: complaintId, deletedAt: null },
    include: { feedback: true },
  });

  if (!complaint) throw new AppError(404, 'Complaint not found');
  if (complaint.citizenId !== user.id) throw new AppError(403, 'You can only submit feedback for your own complaints');
  
  if (complaint.status !== ComplaintStatus.CLOSED) {
    throw new AppError(400, 'Feedback can only be submitted for CLOSED complaints');
  }
  
  if (complaint.feedback) {
    throw new AppError(400, 'Feedback has already been submitted for this complaint');
  }

  return prisma.feedback.create({
    data: {
      complaintId,
      citizenId: user.id,
      rating: payload.rating,
      comment: payload.comment,
    },
  });
};

const getFeedback = async (complaintId: string) => {
  const complaint = await prisma.complaint.findUnique({
    where: { id: complaintId, deletedAt: null },
  });

  if (!complaint) throw new AppError(404, 'Complaint not found');

  return prisma.feedback.findUnique({
    where: { complaintId },
  });
};

export const FeedbackService = {
  submitFeedback,
  getFeedback,
};
