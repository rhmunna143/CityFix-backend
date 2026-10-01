import { prisma } from '../../config/db';
import { NotificationType } from '@prisma/client';
import { QueryBuilder } from '../../shared/queryBuilder';
import { sendEmail } from '../../shared/sendEmail';

const sendNotification = async (
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  relatedComplaintId?: string | null,
) => {
  const notif = await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      body,
      relatedComplaintId,
    },
  });

  // Fetch user to send email notification
  prisma.user.findUnique({ where: { id: userId } }).then(user => {
    if (user && user.email) {
      sendEmail({
        to: user.email,
        subject: title,
        text: body,
        html: `<p>${body}</p>`,
      }).catch(err => console.error('Failed to send notification email', err));
    }
  }).catch(err => console.error('Error fetching user for email notification', err));

  return notif;
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
