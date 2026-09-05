import { prisma } from '../../config/db';
import { NotificationType } from '@prisma/client';
import { QueryBuilder } from '../../shared/queryBuilder';

const sendNotification = async (
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  relatedComplaintId?: string | null,
) => {
  return prisma.notification.create({
    data: {
      userId,
      type,
      title,
      body,
      relatedComplaintId,
    },
  });
};

const getMyNotifications = async (userId: string, query: Record<string, any>) => {
  const notifQuery = new QueryBuilder(query).filter(['isRead', 'type']).sort();

  const page = Number(query.page || 1);
  const limit = Number(query.limit || 20);
  const skip = (page - 1) * limit;

  const where = { ...notifQuery.prismaQuery.where, userId };

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: notifQuery.prismaQuery.orderBy,
    skip,
    take: limit,
  });

  const total = await prisma.notification.count({ where });

  return {
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    data: notifications,
  };
};

const markAsRead = async (userId: string, id: string) => {
  const notif = await prisma.notification.findUnique({ where: { id } });
  if (!notif || notif.userId !== userId) {
    return null;
  }
  return prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });
};

export const NotificationService = {
  sendNotification,
  getMyNotifications,
  markAsRead,
};
