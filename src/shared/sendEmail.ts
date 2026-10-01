import nodemailer from 'nodemailer';
import { env } from '../config/env';

export const sendEmail = async (options: {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}) => {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
    console.warn('[Email Mock] SMTP configuration is missing. Mocking email sending.');
    console.log(`[Email Mock] to: ${options.to}, subject: ${options.subject}`);
    if (options.html) console.log(`[Email Mock] html: ${options.html}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465, // true for 465, false for other ports
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });

  const mailOptions = {
    from: env.SMTP_FROM || env.SMTP_USER,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`Error sending email to ${options.to}:`, error);
    throw new Error('Failed to send email');
  }
};
