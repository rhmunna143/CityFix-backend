# CityFix - Municipal Complaint Management Backend

CityFix is a robust backend API for managing municipal service requests and complaints. It allows citizens to submit issues, departments to manage requests, and administrators to gain insights and control over the platform.

## 🚀 Live Links
- **Live API Base URL**: [https://cityfix-backend-lime.vercel.app](https://cityfix-backend-lime.vercel.app)
- **Postman Collection**: [View & Run Postman Collection](https://restless-space-585979.postman.co/workspace/My-Workspace~72196ab5-c6eb-4d40-822b-93b6c1904f36/collection/31457961-eefa1afc-6667-4960-923f-c68f20d7507e?action=share&creator=31457961&active-environment=31457961-c39462c3-ddc3-40ac-a468-2330298e9ca1)
- **Video Walkthrough**: [Watch the video for the project Walkthrough](https://youtu.be/EK1uk7Hcv54)

---

## 🔐 Demo Credentials

Use the following credentials to test the role-based access control (RBAC) across the API:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@cityfix.local` | `securepassword123` |
| **Staff (Lead)** | `staff@cityfix.local` | `securepassword123` |
| **Citizen** | `citizen@cityfix.local` | `securepassword123` |

- **Postman Environment**: [See the postman collection's env here](./DOCS/CityFix-env.postman_environment.json)

*Note: You can use these credentials directly on the live URL via the `/api/v1/auth/login` endpoint to receive a JWT access token.*

---

## 🛠 Tech Stack
- **Node.js + Express**: Core web server
- **TypeScript**: Static typing for robust development
- **Prisma + PostgreSQL**: Database ORM and relational storage
- **Redis (ioredis)**: Caching layer and global rate-limiting store
- **Zod**: Strict request validation
- **Stripe**: Payment processing for priority and chargeable requests
- **Cloudinary**: Cloud image/document storage
- **Multer**: Memory-based multipart/form-data handling
- **Helmet + CORS**: API Security
- **Vercel**: Edge/Serverless deployment

---

## ✨ Features

- **Robust Authentication & RBAC**: Secure JWT-based authentication with distinct roles (`CITIZEN`, `STAFF`, `ADMIN`, `SUPER_ADMIN`).
- **State Machine Workflow**: Complaints transition strictly through `SUBMITTED -> ASSIGNED -> IN_PROGRESS -> RESOLVED -> CLOSED` using atomic Prisma transactions.
- **Dynamic File Uploads**: Image evidence processing using Multer (`memoryStorage`), compressed by `sharp`, and streamed directly to Cloudinary.
- **Payment Gateway**: Integrated Stripe checkout for premium priority processing and chargeable municipal services.
- **Webhook Signature Verification**: Cryptographically secure Stripe webhook listener.
- **Audit Trails**: Immutable system logging capturing critical state and role transitions for absolute transparency.
- **Analytics & Caching**: Intensive data aggregation endpoints (Admin Dashboards, Public Stats) highly optimized with Redis caching.

### 🌟 Unique Features
1. **Automated SLA Enforcement**: A background cron job periodically scans the database for `ASSIGNED` or `IN_PROGRESS` complaints that have breached their SLA deadlines, automatically flagging them and triggering notifications.
2. **Dynamic Priority Recalculation**: When a citizen pays for priority processing via Stripe, the webhook automatically shortens their SLA deadline based on environment multipliers and bumps them up the queue.
3. **Atomic Role Mutations**: When an Admin promotes a user to `STAFF`, the backend transactionally generates their interconnected `StaffProfile` (department linking). Demoting them safely orphans/archives it.

---

## 🚧 Challenges Faced

1. **Vercel Serverless File System Restrictions**: Vercel executes serverless functions in read-only environments. We initially encountered `ENOENT: mkdir` errors when legacy upload middleware tried creating local temp folders. We overcame this by completely migrating our file processing to RAM (`multer.memoryStorage()`) and streaming raw buffers via Cloudinary's `upload_stream`.
2. **Stripe Webhook Raw Body Parsing**: Express's global `express.json()` parser consumes request streams, causing Stripe's cryptographic signature validation to fail. We solved this by conditionally applying `express.raw({ type: 'application/json' })` strictly to the webhook endpoint *before* the global JSON parser.
3. **Multi-Instance Rate Limiting**: Simple in-memory rate limiting leaks memory and fails horizontally on cloud deployments. We integrated `rate-limit-redis` tied to our `ioredis` instance, centralizing IP tracking across the entire distributed architecture.
4. **Environment Variable Integrity on Boot**: Serverless instances crashing silently due to missing environment configurations. We implemented a strict Zod parser (`src/config/env.ts`) that runs immediately upon script execution, safely falling back to defaults or intelligently formatting missing URI prefixes before binding.

---

## ⚙️ Local Setup Instructions

1. **Clone the Repository**
   ```bash
   git clone https://github.com/rhmunna143/CityFix-backend.git
   cd CityFix-backend
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Create a `.env` file based on the provided `.env.example` file.
   ```bash
   cp .env.example .env
   ```
   Fill in your PostgreSQL URL, Redis URL, Cloudinary, and Stripe credentials.

4. **Database Setup**
   ```bash
   npx prisma migrate dev
   npm run db:seed
   ```
   *The seed script safely populates departments, categories, and injects the demo credentials.*

5. **Run the Application**
   ```bash
   npm run dev
   ```

---

## 📡 API Endpoints Listing

The complete API catalog is beautifully documented in the linked Postman Workspace. Below is a high-level summary of the modules:

### 1. Auth (`/api/v1/auth`)
- `POST /register`: Create a new citizen account
- `POST /login`: Authenticate and receive JWT tokens
- `POST /refresh-token`: Rotate access credentials
- `POST /google`: OAuth 2.0 login integration

### 2. Users & Admin (`/api/v1/users`, `/api/v1/admin`)
- `GET /users/me`: Fetch authenticated profile
- `PATCH /users/me/avatar`: Upload profile picture (Cloudinary)
- `GET /admin/users`: View all platform users
- `PATCH /admin/users/:id/role`: Promote/demote users
- `PATCH /admin/users/:id/deactivate`: Suspend accounts
- `GET /admin/audit-logs`: View system transitions
- `GET /admin/dashboard-stats`: Global analytics

### 3. Complaints (`/api/v1/complaints`)
- `POST /`: Submit a new municipal complaint
- `GET /`: View paginated complaints (Role-dependent visibility)
- `GET /:id`: View detailed complaint
- `PATCH /:id/status`: Update status lifecycle (`STAFF` only)
- `POST /:id/attachments`: Upload supplementary evidence

### 4. Departments & Categories (`/api/v1/departments`, `/api/v1/categories`)
- Standard CRUD operations (Admin protected).
- Public-facing read operations heavily cached via Redis.

### 5. Payments (`/api/v1/payments`)
- `POST /initiate`: Generate Stripe checkout for Priority / Service fees
- `POST /webhook`: Asynchronous Stripe listener
- `GET /history`: View personal transaction logs

### 6. Assignments & Feedback (`/api/v1/assignments`, `/api/v1/feedback`)
- `POST /assignments`: Assign a ticket to a staff member
- `POST /feedback`: Rate a `CLOSED` complaint 1-5 stars

### 7. Public Stats (`/api/v1/public/stats`)
- `GET /`: View open API insights, resolution times, and department loads.
