import { prisma } from '../../config/db';
import { AuditAction } from '@prisma/client';
import { QueryBuilder } from '../../shared/queryBuilder';

const logAction = async (
  action: AuditAction,
  entityType: string,
  entityId: string,
  actorId?: string | null,
  before?: any,
  after?: any,
  ipAddress?: string | null,
) => {
  // We fire and forget this usually, or await it in a transaction
  return prisma.auditLog.create({
    data: {
      action,
      entityType,
      entityId,
      actorId,
      before: before ? JSON.parse(JSON.stringify(before)) : null,
      after: after ? JSON.parse(JSON.stringify(after)) : null,
      ipAddress,
    },
  });
};

const getAuditLogs = async (query: Record<string, any>) => {
  const auditQuery = new QueryBuilder(query).filter(['action', 'entityType', 'actorId']).sort();

  const page = Number(query.page || 1);
  const limit = Number(query.limit || 20);
  const skip = (page - 1) * limit;

  const logs = await prisma.auditLog.findMany({
    where: auditQuery.prismaQuery.where,
    orderBy: auditQuery.prismaQuery.orderBy,
    skip,
    take: limit,
    include: {
      actor: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  const total = await prisma.auditLog.count({
    where: auditQuery.prismaQuery.where,
  });

  return {
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    data: logs,
  };
};

export const AuditLogService = {
  logAction,
  getAuditLogs,
};
