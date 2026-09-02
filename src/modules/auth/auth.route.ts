import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validateRequest } from '../../middlewares/validateRequest';
import { authLimiter } from '../../middlewares/rateLimiter';
import { authenticate } from '../../middlewares/auth';
import * as schemas from './auth.validation';

const router = Router();

router.post(
  '/register',
  authLimiter,
  validateRequest(schemas.registerSchema),
  AuthController.register,
);

router.post('/login', authLimiter, validateRequest(schemas.loginSchema), AuthController.login);

router.post(
  '/google',
  authLimiter,
  validateRequest(schemas.googleSchema),
  AuthController.googleLogin,
);

router.post(
  '/refresh-token',
  validateRequest(schemas.refreshTokenSchema),
  AuthController.refreshToken,
);

router.post(
  '/forgot-password',
  authLimiter,
  validateRequest(schemas.forgotPasswordSchema),
  AuthController.forgotPassword,
);

router.post(
  '/verify-otp',
  authLimiter,
  validateRequest(schemas.verifyOtpSchema),
  AuthController.verifyOtp,
);

router.post(
  '/reset-password',
  authLimiter,
  validateRequest(schemas.resetPasswordSchema),
  AuthController.resetPassword,
);

router.post('/logout', authenticate, AuthController.logout);

export const AuthRoutes = router;
