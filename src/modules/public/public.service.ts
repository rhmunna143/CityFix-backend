import { prisma } from '../../config/db';
import redis from '../../config/redis';

const getPublicStats = async () => {
  const cacheKey = 'stats:public';
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const [totalResolved, perCategoryCounts] = await Promise.all([
    prisma.complaint.count({
      where: {
        status: { in: ['RESOLVED', 'CLOSED'] },
        deletedAt: null,
      },
    }),
    prisma.complaint.groupBy({
      by: ['categoryId'],
      _count: { categoryId: true },
      where: { deletedAt: null },
    }),
  ]);

  // Find average resolution time (rough estimate via DB if possible, or we can query status histories. For simplicity we will omit if complex, but PRD asks for average resolution time. Let's compute average duration from creation to resolved).
  const resolvedComplaints = await prisma.complaint.findMany({
    where: { status: { in: ['RESOLVED', 'CLOSED'] }, deletedAt: null },
    select: { createdAt: true, updatedAt: true },
    take: 1000, // Sample size for performance
  });

  let totalMs = 0;
  resolvedComplaints.forEach((c) => {
    totalMs += c.updatedAt.getTime() - c.createdAt.getTime();
  });
  const avgResolutionMs = resolvedComplaints.length ? totalMs / resolvedComplaints.length : 0;
  const avgResolutionHours = avgResolutionMs / (1000 * 60 * 60);

  const stats = {
    totalResolved,
    avgResolutionHours: Math.round(avgResolutionHours * 10) / 10,
    perCategoryCounts: perCategoryCounts.reduce(
      (acc, curr) => {
        acc[curr.categoryId] = curr._count.categoryId;
        return acc;
      },
      {} as Record<string, number>,
    ),
  };

  await redis.set(cacheKey, JSON.stringify(stats), 'EX', 300); // 5 min cache
  return stats;
};

export const PublicService = {
  getPublicStats,
};
