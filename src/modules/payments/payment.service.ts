import { prisma } from '../../config/db';
import stripe from '../../config/stripe';
import { env } from '../../config/env';
import { AppError } from '../../shared/AppError';
import { IInitiatePaymentPayload } from './payment.interface';
import { PaymentPurpose, PaymentStatus, Role, AuditAction } from '@prisma/client';
import { QueryBuilder } from '../../shared/queryBuilder';
import { AuditLogService } from '../auditLogs/auditLog.service';
import Stripe from 'stripe';

const initiatePayment = async (userId: string, payload: IInitiatePaymentPayload) => {
  const complaint = await prisma.complaint.findUnique({
    where: { id: payload.complaintId, deletedAt: null },
    include: { category: true },
  });

  if (!complaint) throw new AppError(404, 'Complaint not found');
  
  if (complaint.citizenId !== userId)
    throw new AppError(403, 'You can only pay for your own complaints');

  let amount = 0;
  let productName = '';

  if (payload.purpose === PaymentPurpose.PRIORITY_FEE) {
    if (complaint.isPriority) {
      throw new AppError(400, 'Complaint is already marked as priority');
    }
    amount = env.PRIORITY_FEE;
    productName = `Priority Processing Fee - ${complaint.referenceCode}`;
  } else if (payload.purpose === PaymentPurpose.SERVICE_CHARGE) {
    if (!complaint.category.isChargeable) {
      throw new AppError(400, 'This complaint category is not chargeable');
    }

    // Check if already paid
    const existingPayment = await prisma.payment.findFirst({
      where: {
        complaintId: payload.complaintId,
        purpose: PaymentPurpose.SERVICE_CHARGE,
        status: PaymentStatus.SUCCEEDED,
      },
    });
    if (existingPayment) {
      throw new AppError(400, 'Service charge already paid for this complaint');
    }

    amount = Number(complaint.category.basePrice || 0);
    if (amount <= 0) throw new AppError(400, 'Invalid base price configuration');
    productName = `Service Charge - ${complaint.category.name}`;
  }

  // Create Stripe Checkout Session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: productName,
          },
          unit_amount: amount * 100, // Stripe expects cents
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `http://localhost:${env.PORT}/success`,
    cancel_url: `http://localhost:${env.PORT}/cancel`,
    metadata: {
      userId,
      complaintId: payload.complaintId,
      purpose: payload.purpose,
    },
  });

  // Save pending payment to DB
  const payment = await prisma.payment.create({
    data: {
      userId,
      complaintId: payload.complaintId,
      purpose: payload.purpose,
      amount: amount,
      currency: 'usd',
      stripeSessionId: session.id,
      status: PaymentStatus.PENDING,
    },
  });

  return { payment, sessionUrl: session.url };
};

const handleWebhook = async (rawBody: string | Buffer, signature: string) => {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    throw new AppError(500, 'Stripe webhook secret not configured');
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    throw new AppError(400, `Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    const payment = await prisma.payment.findUnique({
      where: { stripeSessionId: session.id },
    });

    if (!payment) {
      console.error(`Payment not found for session ${session.id}`);
      return;
    }

    // Idempotency check
    if (payment.status === PaymentStatus.SUCCEEDED) {
      return;
    }

    await prisma.$transaction(async (tx) => {
      // 1. Mark payment as SUCCEEDED
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.SUCCEEDED,
          paidAt: new Date(),
          stripePaymentIntentId: session.payment_intent as string,
        },
      });

      // 2. Business logic based on purpose
      const complaintId = payment.complaintId!;
      const complaint = await tx.complaint.findUnique({
        where: { id: complaintId },
        include: { category: true },
      });

      if (complaint) {
        if (payment.purpose === PaymentPurpose.PRIORITY_FEE) {
          // Adjust SLA based on multiplier
          const originalSlaHours = complaint.category.slaHours;
          const newSlaHours = originalSlaHours * env.PRIORITY_SLA_MULTIPLIER;
          const newSlaDeadline = new Date(
            complaint.createdAt.getTime() + newSlaHours * 60 * 60 * 1000,
          );

          await tx.complaint.update({
            where: { id: complaintId },
            data: {
              isPriority: true,
              slaDeadline: newSlaDeadline,
            },
          });

          await AuditLogService.logAction(
            AuditAction.UPDATE,
            'Complaint',
            complaintId,
            payment.userId,
            { isPriority: false },
            { isPriority: true },
          );
        }
        // If SERVICE_CHARGE, it's just marked as paid, which unblocks assignment checking.
      }

      await AuditLogService.logAction(
        AuditAction.PAYMENT,
        'Payment',
        payment.id,
        payment.userId,
        { status: PaymentStatus.PENDING },
        { status: PaymentStatus.SUCCEEDED },
      );
    });
  }
};

const getMyHistory = async (userId: string, query: Record<string, any>) => {
  const qb = new QueryBuilder(query).filter(['status', 'purpose']).sort();

  const page = Number(query.page || 1);
  const limit = Number(query.limit || 20);
  const skip = (page - 1) * limit;

  const where = { ...qb.prismaQuery.where, userId };

  const payments = await prisma.payment.findMany({
    where,
    orderBy: qb.prismaQuery.orderBy,
    skip,
    take: limit,
  });

  const total = await prisma.payment.count({ where });

  return {
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    data: payments,
  };
};

const getPaymentById = async (
  user: { id: string; role: Role; isSuperAdmin: boolean },
  id: string,
) => {
  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment) throw new AppError(404, 'Payment not found');

  if (user.role !== Role.ADMIN && payment.userId !== user.id) {
    throw new AppError(403, 'Not authorized to view this payment');
  }

  return payment;
};

export const PaymentService = {
  initiatePayment,
  handleWebhook,
  getMyHistory,
  getPaymentById,
};
