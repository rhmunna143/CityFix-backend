import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { catchAsync } from '../shared/catchAsync';

export const validateRequest = (schema: ZodSchema) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
      cookies: req.cookies,
    });
    next();
  });
};
