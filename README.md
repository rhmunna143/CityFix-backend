# CityFix Backend API

CityFix is a robust backend API for managing municipal service requests and complaints. It allows citizens to submit issues, departments to manage requests, and administrators to gain insights and control over the platform.

## Architecture & Tech Stack
- **Node.js + Express**: Core web server
- **TypeScript**: Static typing for robust development
- **Prisma + PostgreSQL**: Database ORM and relational storage
- **Redis (ioredis)**: Caching layer and rate-limiting store
- **Zod**: Strict request validation
- **Stripe**: Payment processing for priority and chargeable requests
- **Cloudinary**: Cloud image/document storage
- **Multer**: Memory-based multipart/form-data handling
- **Helmet + CORS**: Security middleware

## Setup Instructions

1. **Clone & Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment Variables**
   Create a `.env` file based on the provided `.env.example` file.
   ```bash
   cp .env.example .env
   ```
   Fill in your PostgreSQL URL, Redis URL, Cloudinary, and Stripe credentials.

3. **Database Setup**
   ```bash
   npx prisma migrate dev
   npm run seed
   ```
   *The seed script will create default departments, categories, and one user for each Role (Citizen, Staff, Admin) using passwords from the environment.*

4. **Run the Application**
   ```bash
   npm run dev
   ```

## Roles & Access
1. **Citizen**: Submits complaints, views own history, pays for priority features.
2. **Staff**: Belongs to a department. Assigned to resolve complaints. Can upload resolution evidence. `isDepartmentLead` flag allows managers to re-assign complaints within their department.
3. **Admin**: System oversight, manages users, categories, departments, and views global analytics.

## Submission Details

### Important Files
- `DOCS/CityFix-backend.postman_collection.json`: A complete Postman collection containing all 45+ endpoints.
- `src/config/env.ts`: Centralized, strictly validated environment variables.
- `prisma/schema.prisma`: The database schema implementing complex relations, enums, and soft-deletes.

### Testing Locally
Use the seeded credentials found in `.env` to test the various roles across the Postman collection. Ensure Redis and Postgres are running.

### Stripe Webhook
For local testing of payments, use the Stripe CLI to forward webhooks to `http://localhost:3000/api/v1/payments/webhook`.
