import { z } from 'zod';
import * as schemas from './auth.validation';

export type IRegisterPayload = z.infer<typeof schemas.registerSchema>['body'];
export type ILoginPayload = z.infer<typeof schemas.loginSchema>['body'];
export type IGoogleLoginPayload = z.infer<typeof schemas.googleSchema>['body'];
export type IRefreshTokenPayload = z.infer<typeof schemas.refreshTokenSchema>['body'];
export type IForgotPasswordPayload = z.infer<typeof schemas.forgotPasswordSchema>['body'];
export type IVerifyOtpPayload = z.infer<typeof schemas.verifyOtpSchema>['body'];
export type IResetPasswordPayload = z.infer<typeof schemas.resetPasswordSchema>['body'];
