import cron from 'node-cron';
import { prisma } from '../config/db';
import { AuditAction, ComplaintStatus, NotificationType } from '@prisma/client';
import { AuditLogService } from '../modules/auditLogs/auditLog.service';
import { NotificationService } from '../modules/notifications/notification.service';

const checkSLABreaches = async () => {
  try {
    const now = new Date();

    const breachedComplaints = await prisma.complaint.findMany({
      where: {
        status: {
          in: [ComplaintStatus.ASSIGNED, ComplaintStatus.IN_PROGRESS],
        },
        isSlaBreached: false,
        slaDeadline: {
          lt: now,
        },
        deletedAt: null,
      },
      include: {
        department: {
          include: {
            staffProfiles: {
              where: { isDepartmentLead: true },
            },
          },
        },
      },
    });

    if (breachedComplaints.length === 0) return;

    for (const complaint of breachedComplaints) {
      await prisma.$transaction(async (tx) => {
        await tx.complaint.update({
          where: { id: complaint.id },
          data: { isSlaBreached: true },
        });
      });

      await AuditLogService.logAction(
        AuditAction.UPDATE,
        'Complaint',
        complaint.id,
        null, // System action
        { isSlaBreached: false },
        { isSlaBreached: true },
      );

      // Notify department leads
      for (const lead of complaint.department.staffProfiles) {
        await NotificationService.sendNotification(
          lead.userId,
          NotificationType.SLA_BREACH,
          'SLA Breached!',
          `Complaint ${complaint.referenceCode} has breached its SLA deadline.`,
          complaint.id,
        );
      }

      // We should also notify all ADMIN users according to PRD
      const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
      for (const admin of admins) {
        await NotificationService.sendNotification(
          admin.id,
          NotificationType.SLA_BREACH,
          'SLA Breached (Admin Alert)',
          `Complaint ${complaint.referenceCode} in department ${complaint.department.name} breached its SLA.`,
          complaint.id,
        );
      }
    }
    console.log(`[SLA Check] Processed ${breachedComplaints.length} SLA breaches.`);
  } catch (error) {
    console.error('[SLA Check] Error:', error);
  }
};

// Run hourly
export const startSLACronJob = () => {
  cron.schedule('0 * * * *', checkSLABreaches);
  console.log('SLA Cron Job scheduled (hourly).');
};
