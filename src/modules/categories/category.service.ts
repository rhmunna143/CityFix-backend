import { prisma } from '../../config/db';
import { redis } from '../../config/redis';
import { AppError } from '../../shared/AppError';
import { QueryBuilder } from '../../shared/queryBuilder';
import { ICreateCategoryPayload, IUpdateCategoryPayload } from './category.interface';

const CACHE_KEY = 'categories:all';

const invalidateCache = async () => {
  await redis.del(CACHE_KEY);
};

const createCategory = async (payload: ICreateCategoryPayload) => {
  const existing = await prisma.category.findUnique({
    where: { name: payload.name },
  });

  if (existing) {
    throw new AppError(409, 'Category with this name already exists');
  }

  const dept = await prisma.department.findUnique({
    where: { id: payload.departmentId, deletedAt: null },
  });

  if (!dept) {
    throw new AppError(404, 'Department not found');
  }

  const result = await prisma.category.create({
    data: payload,
  });

  await invalidateCache();
  return result;
};

const getAllCategories = async (query: Record<string, any>) => {
  const isCacheable = !query.page && !query.limit && !query.departmentId;

  if (isCacheable) {
    const cached = await redis.get(CACHE_KEY);
    if (cached) {
      return {
        meta: null,
        data: JSON.parse(cached),
      };
    }
  }

  const catQuery = new QueryBuilder(query)
    .filter(['name', 'isActive', 'departmentId'])
    .sort();

  const page = Number(query.page || 1);
  const limit = Number(query.limit || 50); // Larger default limit for categories
  const skip = (page - 1) * limit;

  const where = { ...catQuery.prismaQuery.where, deletedAt: null };

  const categories = await prisma.category.findMany({
    where,
    orderBy: catQuery.prismaQuery.orderBy,
    skip,
    take: limit,
    include: {
      department: {
        select: { id: true, name: true },
      },
    },
  });

  if (isCacheable) {
    await redis.set(CACHE_KEY, JSON.stringify(categories), 'EX', 10 * 60); // 10 mins
  }

  const total = await prisma.category.count({ where });

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    data: categories,
  };
};

const updateCategory = async (id: string, payload: IUpdateCategoryPayload) => {
  const category = await prisma.category.findUnique({
    where: { id, deletedAt: null },
  });

  if (!category) {
    throw new AppError(404, 'Category not found');
  }

  if (payload.name && payload.name !== category.name) {
    const existing = await prisma.category.findUnique({
      where: { name: payload.name },
    });
    if (existing) {
      throw new AppError(409, 'Category with this name already exists');
    }
  }

  if (payload.departmentId) {
    const dept = await prisma.department.findUnique({
      where: { id: payload.departmentId, deletedAt: null },
    });
    if (!dept) throw new AppError(404, 'Department not found');
  }

  const result = await prisma.category.update({
    where: { id },
    data: payload,
  });

  await invalidateCache();
  return result;
};

const deleteCategory = async (id: string) => {
  const category = await prisma.category.findUnique({
    where: { id, deletedAt: null },
  });

  if (!category) {
    throw new AppError(404, 'Category not found');
  }

  await prisma.category.update({
    where: { id },
    data: {
      isActive: false,
      deletedAt: new Date(),
    },
  });

  await invalidateCache();
  return null;
};

export const CategoryService = {
  createCategory,
  getAllCategories,
  updateCategory,
  deleteCategory,
};
