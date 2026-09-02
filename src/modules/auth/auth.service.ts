import { prisma } from '../../config/db';
import { redis } from '../../config/redis';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { AppError } from '../../shared/AppError';
import { OAuth2Client } from 'google-auth-library';
import {
  IRegisterPayload,
  ILoginPayload,
  IGoogleLoginPayload,
  IRefreshTokenPayload,
  IForgotPasswordPayload,
  IVerifyOtpPayload,
  IResetPasswordPayload,
} from './auth.interface';

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

function exclude<User, Key extends keyof User>(
  user: User,
  keys: Key[]
): Omit<User, Key> {
  const userWithoutKeys = { ...user };
  for (const key of keys) {
    delete userWithoutKeys[key];
  }
  return userWithoutKeys;
}

const generateTokens = (user: { id: string; role: string; email: string }) => {
  const payload = { userId: user.id, role: user.role, email: user.email };
  const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as any,
  });
  const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as any,
  });
  return { accessToken, refreshToken };
};

const register = async (payload: IRegisterPayload) => {
  const existingUser = await prisma.user.findUnique({
    where: { email: payload.email },
  });

  if (existingUser) {
    throw new AppError(409, 'User with this email already exists');
  }

  const hashedPassword = await bcrypt.hash(payload.password, 12);
  const user = await prisma.user.create({
    data: {
      name: payload.name,
      email: payload.email,
      password: hashedPassword,
      phone: payload.phone,
    },
  });

  const tokens = generateTokens(user);
  const userWithoutPassword = exclude(user, ['password']);
  return { user: userWithoutPassword, tokens };
};

const login = async (payload: ILoginPayload) => {
  const user = await prisma.user.findUnique({
    where: { email: payload.email },
  });

  if (!user || !user.isActive) {
    throw new AppError(401, 'Invalid credentials or user inactive');
  }

  if (!user.password) {
    throw new AppError(401, 'Please login with Google');
  }

  const isPasswordValid = await bcrypt.compare(payload.password, user.password);
  if (!isPasswordValid) {
    throw new AppError(401, 'Invalid credentials');
  }

  const tokens = generateTokens(user);
  const userWithoutPassword = exclude(user, ['password']);
  return { user: userWithoutPassword, tokens };
};

const googleLogin = async (payload: IGoogleLoginPayload) => {
  let ticket;
  try {
    ticket = await googleClient.verifyIdToken({
      idToken: payload.idToken,
      audience: env.GOOGLE_CLIENT_ID,
    });
  } catch (error) {
    throw new AppError(401, 'Invalid Google ID token');
  }

  const payloadGCP = ticket.getPayload();
  if (!payloadGCP || !payloadGCP.email) {
    throw new AppError(400, 'Could not retrieve email from Google');
  }

  let user = await prisma.user.findUnique({
    where: { email: payloadGCP.email },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        name: payloadGCP.name || 'Google User',
        email: payloadGCP.email,
        googleId: payloadGCP.sub,
        avatarUrl: payloadGCP.picture,
        isActive: true,
      },
    });
  } else if (!user.googleId) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { googleId: payloadGCP.sub },
    });
  }

  if (!user.isActive) {
    throw new AppError(401, 'Your account is inactive');
  }

  const tokens = generateTokens(user);
  const userWithoutPassword = exclude(user, ['password']);
  return { user: userWithoutPassword, tokens };
};

const refreshToken = async (payload: IRefreshTokenPayload) => {
  if (!payload.refreshToken) {
    throw new AppError(400, 'Refresh token is required');
  }

  let decoded;
  try {
    decoded = jwt.verify(payload.refreshToken, env.JWT_REFRESH_SECRET) as jwt.JwtPayload;
  } catch (error) {
    throw new AppError(401, 'Invalid refresh token');
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
  });

  if (!user || !user.isActive) {
    throw new AppError(401, 'User no longer exists or is inactive');
  }

  const tokens = generateTokens(user);
  return { tokens };
};

const forgotPassword = async (payload: IForgotPasswordPayload) => {
  const user = await prisma.user.findUnique({
    where: { email: payload.email },
  });

  if (!user || !user.isActive) {
    throw new AppError(404, 'User not found');
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  await redis.set(`pwd_reset_otp:${payload.email}`, otp, 'EX', 10 * 60);

  // TODO: Send email with OTP (mocked for now)
  console.log(`[Email Mock] OTP for ${payload.email} is ${otp}`);

  return { message: 'OTP sent to your email' };
};

const verifyOtp = async (payload: IVerifyOtpPayload) => {
  const otp = await redis.get(`pwd_reset_otp:${payload.email}`);

  if (!otp || otp !== payload.otp) {
    throw new AppError(400, 'Invalid or expired OTP');
  }

  return { message: 'OTP verified successfully' };
};

const resetPassword = async (payload: IResetPasswordPayload) => {
  const otp = await redis.get(`pwd_reset_otp:${payload.email}`);

  if (!otp || otp !== payload.otp) {
    throw new AppError(400, 'Invalid or expired OTP');
  }

  const hashedPassword = await bcrypt.hash(payload.newPassword, 12);
  await prisma.user.update({
    where: { email: payload.email },
    data: { password: hashedPassword },
  });

  await redis.del(`pwd_reset_otp:${payload.email}`);

  return { message: 'Password reset successfully' };
};

export const AuthService = {
  register,
  login,
  googleLogin,
  refreshToken,
  forgotPassword,
  verifyOtp,
  resetPassword,
};
