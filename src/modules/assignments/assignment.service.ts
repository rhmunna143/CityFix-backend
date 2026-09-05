import { prisma } from '../../config/db';
import { AppError } from '../../shared/AppError';
import { IAssignComplaintPayload } from './assignment.interface';
import { ComplaintStatus, Role, AuditAction, NotificationType } from '@prisma/client';
import { AuditLogService } from '../auditLogs/auditLog.service';
import { NotificationService } from '../notifications/notification.service';

const verifyLeadOrAdmin = async (
  user: { id: string; role: Role; isSuperAdmin: boolean },
  departmentId: string,
) => {
  if (user.role === Role.ADMIN) return true;

  if (user.role === Role.STAFF) {
    const staff = await prisma.staffProfile.findUnique({ where: { userId: user.id } });
    if (!staff) throw new AppError(403, 'Staff profile not found');
    if (!staff.isDepartmentLead)
      throw new AppError(403, 'Must be a department lead to assign complaints');
    if (staff.departmentId !== departmentId)
      throw new AppError(403, 'Cannot assign complaints outside your department');
    return true;
  }

  throw new AppError(403, 'Forbidden');
};

const assignComplaint = async (
  user: { id: string; role: Role; isSuperAdmin: boolean },
  complaintId: string,
  payload: IAssignComplaintPayload,
) => {
  const complaint = await prisma.complaint.findUnique({
    where: { id: complaintId, deletedAt: null },
    include: { assignments: { where: { isCurrent: true } } },
  });

  if (!complaint) throw new AppError(404, 'Complaint not found');

  if (
    complaint.status !== ComplaintStatus.SUBMITTED &&
    complaint.status !== ComplaintStatus.REOPENED
  ) {
    throw new AppError(400, 'Complaint is not in a submittable or reopened state');
  }

  // Pending payment check
  const category = await prisma.category.findUnique({ where: { id: complaint.categoryId } });
  if (category?.isChargeable) {
    const payments = await prisma.payment.findMany({
      where: { complaintId, status: 'SUCCEEDED' },
    });
    if (payments.length === 0) {
      throw new AppError(400, 'Cannot assign: complaint is pending payment');
    }
  }

  await verifyLeadOrAdmin(user, complaint.departmentId);

  const staffToAssign = await prisma.staffProfile.findUnique({
    where: { userId: payload.staffId },
  });

  if (!staffToAssign || staffToAssign.departmentId !== complaint.departmentId) {
    throw new AppError(400, 'Staff member not found or belongs to a different department');
  }

  const result = await prisma.$transaction(async (tx) => {
    // If there was an old assignment (edge case), close it
    if (complaint.assignments.length > 0) {
      await tx.assignment.updateMany({
        where: { complaintId, isCurrent: true },
        data: { isCurrent: false, unassignedAt: new Date() },
      });
    }

    const newAssignment = await tx.assignment.create({
      data: {
        complaintId,
        staffId: payload.staffId,
        assignedById: user.id,
        isCurrent: true,
      },
    });

    await tx.complaint.update({
      where: { id: complaintId },
      data: { status: ComplaintStatus.ASSIGNED },
    });

    await tx.statusHistory.create({
      data: {
        complaintId,
        fromStatus: complaint.status,
        toStatus: ComplaintStatus.ASSIGNED,
        changedById: user.id,
      },
    });

    return newAssignment;
  });

  await AuditLogService.logAction(AuditAction.ASSIGN, 'Complaint', complaintId, user.id, null, {
    staffId: payload.staffId,
  });

  await NotificationService.sendNotification(
    payload.staffId,
    NotificationType.ASSIGNMENT,
    'New Assignment',
    `You have been assigned to complaint ${complaint.referenceCode}`,
    complaintId,
  );

  await NotificationService.sendNotification(
    complaint.citizenId,
    NotificationType.STATUS_UPDATE,
    'Complaint Assigned',
    `Your complaint ${complaint.referenceCode} has been assigned to a technician.`,
    complaintId,
  );

  return result;
};

const reassignComplaint = async (
  user: { id: string; role: Role; isSuperAdmin: boolean },
  assignmentId: string,
  payload: IAssignComplaintPayload,
) => {
  const existingAssignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: { complaint: true },
  });

  if (!existingAssignment) throw new AppError(404, 'Assignment not found');
  if (!existingAssignment.isCurrent) throw new AppError(400, 'This assignment is already closed');

  const complaint = existingAssignment.complaint;

  if (
    complaint.status === ComplaintStatus.RESOLVED ||
    complaint.status === ComplaintStatus.CLOSED
  ) {
    throw new AppError(400, 'Cannot reassign a resolved or closed complaint');
  }

  await verifyLeadOrAdmin(user, complaint.departmentId);

  const staffToAssign = await prisma.staffProfile.findUnique({
    where: { userId: payload.staffId },
  });

  if (!staffToAssign || staffToAssign.departmentId !== complaint.departmentId) {
    throw new AppError(400, 'Staff member not found or belongs to a different department');
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.assignment.update({
      where: { id: assignmentId },
      data: { isCurrent: false, unassignedAt: new Date() },
    });

    const newAssignment = await tx.assignment.create({
      data: {
        complaintId: complaint.id,
        staffId: payload.staffId,
        assignedById: user.id,
        isCurrent: true,
      },
    });

    return newAssignment;
  });

  await AuditLogService.logAction(
    AuditAction.ASSIGN,
    'Complaint',
    complaint.id,
    user.id,
    { staffId: existingAssignment.staffId },
    { staffId: payload.staffId },
  );

  await NotificationService.sendNotification(
    payload.staffId,
    NotificationType.ASSIGNMENT,
    'New Re-assignment',
    `You have been reassigned to complaint ${complaint.referenceCode}`,
    complaint.id,
  );

  return result;
};

export const AssignmentService = {
  assignComplaint,
  reassignComplaint,
};
