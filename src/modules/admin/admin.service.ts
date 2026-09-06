import { prisma } from '../../config/db';
import { AppError } from '../../shared/AppError';
import { Role, AuditAction } from '@prisma/client';
import { QueryBuilder } from '../../shared/queryBuilder';
import { AuditLogService } from '../auditLogs/auditLog.service';
import redis from '../../config/redis';

const getUsers = async (query: Record<string, any>) => {
  const qb = new QueryBuilder(query).filter(['role', 'isActive']).sort();

  const page = Number(query.page || 1);
  const limit = Number(query.limit || 10);
  const skip = (page - 1) * limit;

  const users = await prisma.user.findMany({
    where: qb.prismaQuery.where,
    orderBy: qb.prismaQuery.orderBy,
    skip,
    take: limit,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      staffProfile: true,
    },
  });

  const total = await prisma.user.count({ where: qb.prismaQuery.where });

  return {
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    data: users,
  };
};

const changeUserRole = async (
  adminId: string,
  userId: string,
  payload: { role: Role; departmentId?: string; isDepartmentLead?: boolean; employeeCode?: string },
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { staffProfile: true },
  });
  if (!user) throw new AppError(404, 'User not found');
  if (user.isSuperAdmin) throw new AppError(403, 'Cannot modify super admin role');

  if (payload.role === Role.STAFF) {
    if (!payload.departmentId || !payload.employeeCode) {
      throw new AppError(400, 'departmentId and employeeCode are required for STAFF role');
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: { role: payload.role },
    });

    if (payload.role === Role.STAFF) {
      if (user.staffProfile) {
        await tx.staffProfile.update({
          where: { userId },
          data: {
            departmentId: payload.departmentId,
            isDepartmentLead: payload.isDepartmentLead || false,
            employeeCode: payload.employeeCode,
          },
        });
      } else {
        await tx.staffProfile.create({
          data: {
            userId,
            departmentId: payload.departmentId!,
            isDepartmentLead: payload.isDepartmentLead || false,
            employeeCode: payload.employeeCode!,
          },
        });
      }
    } else {
      // If downgraded from STAFF, delete profile
      if (user.staffProfile) {
        await tx.staffProfile.delete({ where: { userId } });
      }
    }

    await AuditLogService.logAction(
      AuditAction.ROLE_CHANGE,
      'User',
      userId,
      adminId,
      { role: user.role },
      { role: payload.role },
    );

    return updatedUser;
  });

  return result;
};

const deactivateUser = async (adminId: string, userId: string, isActive: boolean) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, 'User not found');
  if (user.isSuperAdmin) throw new AppError(403, 'Cannot deactivate super admin');

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { isActive },
  });

  await AuditLogService.logAction(
    AuditAction.UPDATE,
    'User',
    userId,
    adminId,
    { isActive: user.isActive },
    { isActive },
  );

  return updated;
};

const getDashboardStats = async () => {
  const cacheKey = 'admin:dashboard:stats';
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const [totalUsers, totalDepartments, totalComplaints, complaintsByStatus, totalRevenue] =
    await Promise.all([
      prisma.user.count(),
      prisma.department.count({ where: { deletedAt: null } }),
      prisma.complaint.count({ where: { deletedAt: null } }),
      prisma.complaint.groupBy({
        by: ['status'],
        _count: { status: true },
        where: { deletedAt: null },
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: 'SUCCEEDED' },
      }),
    ]);

  const stats = {
    totalUsers,
    totalDepartments,
    totalComplaints,
    complaintsByStatus: complaintsByStatus.reduce(
      (acc, curr) => {
        acc[curr.status] = curr._count.status;
        return acc;
      },
      {} as Record<string, number>,
    ),
    totalRevenue: totalRevenue._sum.amount || 0,
  };

  await redis.set(cacheKey, JSON.stringify(stats), 'EX', 120); // 2 min cache
  return stats;
};

const getAuditLogs = async (query: Record<string, any>) => {
  const qb = new QueryBuilder(query).filter(['entityType', 'action']).sort();

  const page = Number(query.page || 1);
  const limit = Number(query.limit || 20);
  const skip = (page - 1) * limit;

  const logs = await prisma.auditLog.findMany({
    where: qb.prismaQuery.where,
    orderBy: qb.prismaQuery.orderBy || { createdAt: 'desc' },
    skip,
    take: limit,
  });

  const total = await prisma.auditLog.count({ where: qb.prismaQuery.where });

  return {
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    data: logs,
  };
};

export const AdminService = {
  getUsers,
  changeUserRole,
  deactivateUser,
  getDashboardStats,
  getAuditLogs,
};
