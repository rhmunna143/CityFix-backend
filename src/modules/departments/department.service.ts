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

  const where: any = { ...deptQuery.prismaQuery.where };
  if (query.status === 'deleted') {
    where.deletedAt = { not: null };
  } else if (query.status === 'all') {
    // No filter on deletedAt
  } else {
    where.deletedAt = null; // Default behavior
  }

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
      name: `${department.name}_DELETED_${Date.now()}`,
      isActive: false,
      deletedAt: new Date(),
    },
  });

  return null;
};

const restoreDepartment = async (id: string) => {
  const department = await prisma.department.findUnique({
    where: { id },
  });

  if (!department) throw new AppError(404, 'Department not found');
  if (!department.deletedAt) throw new AppError(400, 'Department is not in trash');

  let restoredName = department.name;
  const match = department.name.match(/^(.*)_DELETED_\d+$/);
  
  if (match) {
    const originalName = match[1];
    const existing = await prisma.department.findUnique({
      where: { name: originalName },
    });
    if (!existing) {
      restoredName = originalName;
    }
  }

  const result = await prisma.department.update({
    where: { id },
    data: {
      name: restoredName,
      isActive: true,
      deletedAt: null,
    },
  });

  return result;
};

export const DepartmentService = {
  createDepartment,
  getAllDepartments,
  updateDepartment,
  deleteDepartment,
  restoreDepartment,
};
