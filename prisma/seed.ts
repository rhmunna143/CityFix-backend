import { Role } from '@prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { env } from '../src/config/env';
import { prisma } from '../src/config/db';

dotenv.config();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Create Default Departments
  const roadsDept = await prisma.department.upsert({
    where: { name: 'Roads & Infrastructure' },
    update: {},
    create: {
      name: 'Roads & Infrastructure',
      description: 'Maintains city roads, bridges, and infrastructure.',
    },
  });
  
  await prisma.department.upsert({
    where: { name: 'Sanitation' },
    update: {},
    create: {
      name: 'Sanitation',
      description: 'Handles waste management and street cleaning.',
    },
  });

  // 2. Create Default Categories
  await prisma.category.upsert({
    where: { name: 'Pothole' },
    update: {},
    create: {
      name: 'Pothole',
      description: 'Report potholes on city roads',
      departmentId: roadsDept.id,
      slaHours: 48,
    },
  });

  await prisma.category.upsert({
    where: { name: 'Tree Removal Permit' },
    update: {},
    create: {
      name: 'Tree Removal Permit',
      description: 'Apply for a tree removal permit (Paid)',
      departmentId: roadsDept.id,
      slaHours: 120,
      isChargeable: true,
      basePrice: 50.0,
    },
  });

  // 3. Create Admin User
  const adminPassword = await bcrypt.hash(env.ADMIN_PASSWORD, 10);
  await prisma.user.upsert({
    where: { email: env.ADMIN_EMAIL },
    update: {},
    create: {
      name: 'Super Admin',
      email: env.ADMIN_EMAIL,
      password: adminPassword,
      role: Role.ADMIN,
      isSuperAdmin: true,
    },
  });

  // 4. Create Staff User (in Roads & Infrastructure)
  const staffPassword = await bcrypt.hash(env.STAFF_PASSWORD, 10);
  const staff = await prisma.user.upsert({
    where: { email: env.STAFF_EMAIL },
    update: {},
    create: {
      name: 'Roads Dept Lead',
      email: env.STAFF_EMAIL,
      password: staffPassword,
      role: Role.STAFF,
    },
  });

  await prisma.staffProfile.upsert({
    where: { userId: staff.id },
    update: {},
    create: {
      userId: staff.id,
      departmentId: roadsDept.id,
      isDepartmentLead: true,
      employeeCode: 'EMP-ROADS-001',
    },
  });

  // 5. Create Citizen User
  const citizenPassword = await bcrypt.hash(env.CITIZEN_PASSWORD, 10);
  await prisma.user.upsert({
    where: { email: env.CITIZEN_EMAIL },
    update: {},
    create: {
      name: 'Jane Citizen',
      email: env.CITIZEN_EMAIL,
      password: citizenPassword,
      role: Role.CITIZEN,
    },
  });

  console.log('✅ Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
