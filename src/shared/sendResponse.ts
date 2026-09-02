import { Response } from 'express';

type IApiReponse<T> = {
  success: boolean;
  message: string;
  data?: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export const sendResponse = <T>(res: Response, data: IApiReponse<T> & { statusCode: number }) => {
  const responseData: IApiReponse<T> = {
    success: data.success,
    message: data.message,
    data: data.data,
    meta: data.meta,
  };

  res.status(data.statusCode).json(responseData);
};
