import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../shared/AppError';
import { catchAsync } from '../shared/catchAsync';
import { prisma } from '../config/db';
import { Role } from '@prisma/client';

export const authenticate = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  let token = req.cookies?.accessToken;

  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    throw new AppError(401, 'You are not logged in. Please log in to get access.');
  }

  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });
    
    if (!user || !user.isActive) {
      throw new AppError(401, 'The user belonging to this token no longer exists or is inactive.');
    }
    
    req.user = {
      id: user.id,
      role: user.role,
      email: user.email,
      isSuperAdmin: user.isSuperAdmin,
    };
    next();
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw err; // Let global error handler catch TokenExpiredError
  }
});

export const authorize = (...roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, 'You are not logged in.'));
    }
    
    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, 'You do not have permission to perform this action.'));
    }
    
    next();
  };
};

export const authorizeSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AppError(401, 'You are not logged in.'));
  }
  
  if (!req.user.isSuperAdmin) {
    return next(new AppError(403, 'You do not have permission to perform this action. Super Admin only.'));
  }
  
  next();
};
