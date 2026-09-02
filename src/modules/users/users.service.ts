import { prisma } from '../../config/db';
import { AppError } from '../../shared/AppError';
import { IUpdateProfilePayload, IChangeRolePayload } from './users.interface';
import { QueryBuilder } from '../../shared/queryBuilder';

const getMyProfile = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      avatarUrl: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  return user;
};

const updateMyProfile = async (userId: string, payload: IUpdateProfilePayload) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data: payload,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      avatarUrl: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return user;
};

const updateAvatar = async (userId: string, avatarUrl: string) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl },
    select: {
      id: true,
      avatarUrl: true,
    },
  });

  return user;
};

const getAllUsers = async (query: Record<string, any>) => {
  const userQuery = new QueryBuilder(query).filter(['name', 'email']).sort();

  const page = Number(query.page || 1);
  const limit = Number(query.limit || 10);
  const skip = (page - 1) * limit;

  const users = await prisma.user.findMany({
    where: userQuery.prismaQuery.where,
    orderBy: userQuery.prismaQuery.orderBy,
    skip,
    take: limit,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      avatarUrl: true,
      isActive: true,
      createdAt: true,
    },
  });

  const total = await prisma.user.count({ where: userQuery.prismaQuery.where });

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    data: users,
  };
};

const getUserById = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      avatarUrl: true,
      isActive: true,
      createdAt: true,
      staffProfile: true,
    },
  });

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  return user;
};

const changeRole = async (id: string, payload: IChangeRolePayload) => {
  const user = await prisma.user.update({
    where: { id },
    data: { role: payload.role },
    select: {
      id: true,
      name: true,
      role: true,
    },
  });

  return user;
};

const deleteUser = async (id: string) => {
  await prisma.user.update({
    where: { id },
    data: {
      isActive: false,
      deletedAt: new Date(),
    },
  });

  return null;
};

export const UsersService = {
  getMyProfile,
  updateMyProfile,
  updateAvatar,
  getAllUsers,
  getUserById,
  changeRole,
  deleteUser,
};
