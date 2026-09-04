import { prisma } from '../../config/db';
import { AppError } from '../../shared/AppError';
import { QueryBuilder } from '../../shared/queryBuilder';
import { ICreateDepartmentPayload, IUpdateDepartmentPayload } from './department.interface';

const createDepartment = async (payload: ICreateDepartmentPayload) => {
  const existing = await prisma.department.findUnique({
    where: { name: payload.name },
  });

  if (existing) {
    throw new AppError(409, 'Department with this name already exists');
  }

  const result = await prisma.department.create({
    data: payload,
  });

  return result;
};

const getAllDepartments = async (query: Record<string, any>) => {
  const deptQuery = new QueryBuilder(query)
    .filter(['name', 'isActive'])
    .sort();

  const page = Number(query.page || 1);
  const limit = Number(query.limit || 10);
  const skip = (page - 1) * limit;

  // Enforce soft deletes
  const where = { ...deptQuery.prismaQuery.where, deletedAt: null };

  const departments = await prisma.department.findMany({
    where,
    orderBy: deptQuery.prismaQuery.orderBy,
    skip,
    take: limit,
  });

  const total = await prisma.department.count({ where });

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    data: departments,
  };
};

const updateDepartment = async (id: string, payload: IUpdateDepartmentPayload) => {
  const department = await prisma.department.findUnique({
    where: { id, deletedAt: null },
  });

  if (!department) {
    throw new AppError(404, 'Department not found');
  }

  if (payload.name && payload.name !== department.name) {
    const existing = await prisma.department.findUnique({
      where: { name: payload.name },
    });
    if (existing) {
      throw new AppError(409, 'Department with this name already exists');
    }
  }

  const result = await prisma.department.update({
    where: { id },
    data: payload,
  });

  return result;
};

const deleteDepartment = async (id: string) => {
  const department = await prisma.department.findUnique({
    where: { id, deletedAt: null },
  });

  if (!department) {
    throw new AppError(404, 'Department not found');
  }

  // Soft delete
  await prisma.department.update({
    where: { id },
    data: {
      isActive: false,
      deletedAt: new Date(),
    },
  });

  return null;
};

export const DepartmentService = {
  createDepartment,
  getAllDepartments,
  updateDepartment,
  deleteDepartment,
};
