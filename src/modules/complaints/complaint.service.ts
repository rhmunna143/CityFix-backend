import { prisma } from '../../config/db';
import { AppError } from '../../shared/AppError';
import { QueryBuilder } from '../../shared/queryBuilder';
import { ICreateComplaintPayload, IUpdateComplaintStatusPayload } from './complaint.interface';
import { ComplaintStatus, Role, Prisma, AuditAction, NotificationType } from '@prisma/client';
import { AuditLogService } from '../auditLogs/auditLog.service';
import { NotificationService } from '../notifications/notification.service';

const generateReferenceCode = async () => {
  const year = new Date().getFullYear();
  const count = await prisma.complaint.count();
  const paddedCount = String(count + 1).padStart(5, '0');
  return `CMP-${year}-${paddedCount}`;
};

const createComplaint = async (citizenId: string, payload: ICreateComplaintPayload) => {
  const category = await prisma.category.findUnique({
    where: { id: payload.categoryId, deletedAt: null },
  });

  if (!category) {
    throw new AppError(404, 'Category not found');
  }

  const referenceCode = await generateReferenceCode();

  // Calculate SLA deadline
  const slaDeadline = new Date();
  slaDeadline.setHours(slaDeadline.getHours() + category.slaHours);

  // If category is chargeable, the status stays SUBMITTED but it goes into PENDING_PAYMENT logic
  // (We'll just set it to SUBMITTED for now, payment webhook will handle the rest)

  const result = await prisma.complaint.create({
    data: {
      ...payload,
      referenceCode,
      citizenId,
      departmentId: category.departmentId,
      slaDeadline,
    },
  });

  return result;
};

const getAllComplaints = async (user: { id: string; role: Role }, query: Record<string, any>) => {
  const compQuery = new QueryBuilder(query)
    .filter(['status', 'categoryId', 'departmentId', 'isPriority'])
    .sort();

  const page = Number(query.page || 1);
  const limit = Number(query.limit || 10);
  const skip = (page - 1) * limit;

  let where: Prisma.ComplaintWhereInput = { ...compQuery.prismaQuery.where, deletedAt: null };

  if (user.role === Role.CITIZEN) {
    where.citizenId = user.id;
  } else if (user.role === Role.STAFF) {
    const staff = await prisma.staffProfile.findUnique({ where: { userId: user.id } });
    if (!staff) throw new AppError(403, 'Staff profile not found');
    where.departmentId = staff.departmentId;
  }

  const complaints = await prisma.complaint.findMany({
    where,
    orderBy: compQuery.prismaQuery.orderBy,
    skip,
    take: limit,
    include: {
      category: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
    },
  });

  const total = await prisma.complaint.count({ where });

  return {
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    data: complaints,
  };
};

const getComplaintById = async (user: { id: string; role: Role }, id: string) => {
  const complaint = await prisma.complaint.findUnique({
    where: { id, deletedAt: null },
    include: {
      category: { select: { id: true, name: true, slaHours: true } },
      department: { select: { id: true, name: true } },
      citizen: { select: { id: true, name: true, email: true, phone: true } },
      attachments: true,
      statusHistories: true,
      assignments: {
        where: { isCurrent: true },
        include: { staff: { select: { id: true, name: true } } },
      },
    },
  });

  if (!complaint) {
    throw new AppError(404, 'Complaint not found');
  }

  if (user.role === Role.CITIZEN && complaint.citizenId !== user.id) {
    throw new AppError(403, 'You do not have permission to view this complaint');
  }

  if (user.role === Role.STAFF) {
    const staff = await prisma.staffProfile.findUnique({ where: { userId: user.id } });
    if (staff?.departmentId !== complaint.departmentId) {
      throw new AppError(403, 'Complaint belongs to a different department');
    }
  }

  return complaint;
};

const updateComplaintStatus = async (
  user: { id: string; role: Role },
  id: string,
  payload: IUpdateComplaintStatusPayload,
) => {
  const complaint = await prisma.complaint.findUnique({
    where: { id, deletedAt: null },
    include: { assignments: { where: { isCurrent: true } } },
  });

  if (!complaint) throw new AppError(404, 'Complaint not found');

  if (user.role === Role.STAFF) {
    const currentAssignment = complaint.assignments[0];
    if (!currentAssignment || currentAssignment.staffId !== user.id) {
      throw new AppError(403, 'You are not assigned to this complaint');
    }
  }

  // State machine enforcement
  const validTransitions: Record<string, string[]> = {
    SUBMITTED: ['ASSIGNED', 'REJECTED'],
    ASSIGNED: ['IN_PROGRESS'],
    IN_PROGRESS: ['RESOLVED'],
    RESOLVED: ['CLOSED'], // Citizen closes, or Admin
    REOPENED: ['ASSIGNED'],
  };

  const allowed = validTransitions[complaint.status] || [];
  if (!allowed.includes(payload.status)) {
    throw new AppError(
      400,
      `Invalid status transition from ${complaint.status} to ${payload.status}`,
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.complaint.update({
      where: { id },
      data: {
        status: payload.status,
        resolutionNote: payload.resolutionNote || complaint.resolutionNote,
      },
    });

    await tx.statusHistory.create({
      data: {
        complaintId: id,
        fromStatus: complaint.status,
        toStatus: payload.status,
        changedById: user.id,
        note: payload.resolutionNote,
      },
    });

    return updated;
  });

  await AuditLogService.logAction(
    AuditAction.STATUS_CHANGE,
    'Complaint',
    id,
    user.id,
    { status: complaint.status },
    { status: payload.status, resolutionNote: payload.resolutionNote },
  );

  await NotificationService.sendNotification(
    complaint.citizenId,
    NotificationType.STATUS_UPDATE,
    'Complaint Status Updated',
    `Your complaint ${complaint.referenceCode} status changed to ${payload.status}.`,
    id,
  );

  return result;
};

const reopenComplaint = async (citizenId: string, id: string) => {
  const complaint = await prisma.complaint.findUnique({
    where: { id, deletedAt: null },
  });

  if (!complaint) throw new AppError(404, 'Complaint not found');
  if (complaint.citizenId !== citizenId) throw new AppError(403, 'Not your complaint');
  if (complaint.status !== ComplaintStatus.RESOLVED) {
    throw new AppError(400, 'Only resolved complaints can be reopened');
  }
  if (complaint.reopenCount >= 1) {
    throw new AppError(400, 'Complaint has already been reopened the maximum number of times');
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.complaint.update({
      where: { id },
      data: {
        status: ComplaintStatus.REOPENED,
        reopenCount: complaint.reopenCount + 1,
      },
    });

    await tx.statusHistory.create({
      data: {
        complaintId: id,
        fromStatus: complaint.status,
        toStatus: ComplaintStatus.REOPENED,
        changedById: citizenId,
      },
    });

    return updated;
  });

  await AuditLogService.logAction(
    AuditAction.STATUS_CHANGE,
    'Complaint',
    id,
    citizenId,
    { status: complaint.status, reopenCount: complaint.reopenCount },
    { status: ComplaintStatus.REOPENED, reopenCount: complaint.reopenCount + 1 },
  );

  return result;
};

const deleteComplaint = async (user: { id: string; role: Role }, id: string) => {
  const complaint = await prisma.complaint.findUnique({
    where: { id, deletedAt: null },
  });

  if (!complaint) throw new AppError(404, 'Complaint not found');

  if (user.role === Role.CITIZEN) {
    if (complaint.citizenId !== user.id) throw new AppError(403, 'Not your complaint');
    if (complaint.status !== ComplaintStatus.SUBMITTED) {
      throw new AppError(400, 'Can only delete submitted complaints before assignment');
    }
  }

  await prisma.complaint.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await AuditLogService.logAction(AuditAction.DELETE, 'Complaint', id, user.id);

  return null;
};

const searchComplaints = async (user: { id: string; role: Role }, q: string) => {
  if (!q) throw new AppError(400, 'Search query is required');

  let where: Prisma.ComplaintWhereInput = {
    deletedAt: null,
    OR: [
      { title: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { referenceCode: { contains: q, mode: 'insensitive' } },
    ],
  };

  if (user.role === Role.STAFF) {
    const staff = await prisma.staffProfile.findUnique({ where: { userId: user.id } });
    if (!staff) throw new AppError(403, 'Staff profile not found');
    where.departmentId = staff.departmentId;
  }

  const complaints = await prisma.complaint.findMany({
    where,
    take: 20,
    include: {
      category: { select: { id: true, name: true } },
    },
  });

  return complaints;
};

const getMyAssigned = async (staffId: string) => {
  const assignments = await prisma.assignment.findMany({
    where: { staffId, isCurrent: true },
    include: {
      complaint: {
        include: {
          category: { select: { id: true, name: true } },
          citizen: { select: { id: true, name: true, phone: true } },
        },
      },
    },
  });

  return assignments.map((a) => a.complaint).filter((c) => c.deletedAt === null);
};

export const ComplaintService = {
  createComplaint,
  getAllComplaints,
  getComplaintById,
  updateComplaintStatus,
  reopenComplaint,
  deleteComplaint,
  searchComplaints,
  getMyAssigned,
};
