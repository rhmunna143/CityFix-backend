import { Request, Response } from 'express';
import { catchAsync } from '../../shared/catchAsync';
import { sendResponse } from '../../shared/sendResponse';
import { UsersService } from './users.service';
import { AppError } from '../../shared/AppError';
import { uploadToCloudinary } from '../../config/cloudinary';

const getMyProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await UsersService.getMyProfile(req.user!.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Profile retrieved successfully',
    data: result,
  });
});

const updateMyProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await UsersService.updateMyProfile(req.user!.id, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Profile updated successfully',
    data: result,
  });
});

const updateAvatar = catchAsync(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new AppError(400, 'No file uploaded');
  }

  const avatarUrl = await uploadToCloudinary(req.file, 'avatars');
  const result = await UsersService.updateAvatar(req.user!.id, avatarUrl);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Avatar updated successfully',
    data: result,
  });
});

const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const result = await UsersService.getAllUsers(req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Users retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

const getUserById = catchAsync(async (req: Request, res: Response) => {
  const result = await UsersService.getUserById(req.params.id as string);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'User retrieved successfully',
    data: result,
  });
});

const changeRole = catchAsync(async (req: Request, res: Response) => {
  const result = await UsersService.changeRole(req.params.id as string, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Role changed successfully',
    data: result,
  });
});

const deleteUser = catchAsync(async (req: Request, res: Response) => {
  await UsersService.deleteUser(req.params.id as string);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'User deleted successfully',
    data: null,
  });
});

export const UsersController = {
  getMyProfile,
  updateMyProfile,
  updateAvatar,
  getAllUsers,
  getUserById,
  changeRole,
  deleteUser,
};
