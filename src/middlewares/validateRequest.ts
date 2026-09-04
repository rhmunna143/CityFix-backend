import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { catchAsync } from '../shared/catchAsync';

export const validateRequest = (schema: ZodSchema) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const parsed = (await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
      cookies: req.cookies,
    })) as any;

    if (parsed.body !== undefined) {
      req.body = parsed.body;
    }
    if (parsed.query !== undefined) {
      for (const k in req.query) delete req.query[k];
      Object.assign(req.query, parsed.query);
    }
    if (parsed.params !== undefined) {
      for (const k in req.params) delete req.params[k];
      Object.assign(req.params, parsed.params);
    }
    if (parsed.cookies !== undefined) {
      for (const k in req.cookies) delete req.cookies[k];
      Object.assign(req.cookies, parsed.cookies);
    }

    next();
  });
};
