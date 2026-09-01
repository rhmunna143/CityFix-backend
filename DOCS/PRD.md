# PRD — CityFix: City Complaint & Service Request Platform (Backend API)

**Document owner:** Nemo (Solution Architect)
**Prepared for:** AI coding agents implementing this project phase-by-phase
**Status:** Approved for implementation
**Version:** 1.0

---

## 0. How to Use This Document

This PRD is the **single source of truth** for implementation. Any AI coding tool (Claude Code, Cursor, Copilot Workspace, etc.) picking up this project should:

1. Implement strictly module-by-module, following the folder structure in §5.
2. Never touch a module outside the current phase (see §12) unless it's a shared/common dependency.
3. Follow the response contract in §4.2 for **every** endpoint, no exceptions.
4. Treat `errors[]`, Zod validation, and RBAC middleware as non-negotiable cross-cutting concerns applied to every module, not optional add-ons.
5. Re-use shared utilities (`src/shared`, `src/lib`, `src/middlewares`) instead of duplicating logic per module (DRY).
6. Companion docs to produce alongside this PRD during implementation: `feature_update.md` (running changelog per phase), `API_CONTRACT.md` or Postman collection, and `.env.example`.

---

## 1. Executive Summary

**CityFix** is a backend-only RESTful API that lets citizens report civic issues (potholes, garbage, streetlight outages, water leaks, etc.) or request paid municipal services (e.g., bulk waste pickup, tree-removal permits), have them routed to the correct city department, assigned to staff/technicians, tracked through a status workflow with SLA enforcement, and resolved with citizen feedback — all while giving city administrators full oversight, analytics, and audit visibility.

This satisfies the assignment's mandatory backend requirements: 3 RBAC roles, PostgreSQL + Prisma, Stripe payments, Redis caching, rate limiting, soft deletes, audit logs, pagination/filtering/search, and 20+ documented APIs.

---

## 2. Problem Statement

Municipal service requests today are handled through disconnected phone calls, walk-ins, or paper forms. This causes:

- No visibility for citizens into complaint status.
- No enforced SLA or escalation when departments are slow.
- No structured routing to the correct department/technician.
- No analytics for city admins to see hotspots, bottlenecks, or department performance.
- No mechanism to charge for optional/premium municipal services (e.g., expedited handling, permit fees).

**CityFix solves this** by digitizing the full lifecycle: submission → routing → assignment → work → resolution → feedback, with a paid "priority/expedited" lane and paid permit-type service requests handled via Stripe.

---

## 3. Users & Roles

> Assignment mandates **exactly 3 fixed primary roles**. Sub-responsibilities (Technician, Dept. Manager) are modeled as **granular permissions/scopes inside the STAFF role**, not as separate roles, to stay compliant while preserving the domain richness suggested in the idea hub.

| Role                 | Enum Value | Description                                                                                                                                                                                                                                                                                         |
| -------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Citizen**          | `CITIZEN`  | Registers, submits complaints/service requests, tracks status, pays for premium/paid services, gives feedback.                                                                                                                                                                                      |
| **Department Staff** | `STAFF`    | Belongs to one `Department`. Receives assigned complaints, updates investigation/work status, uploads resolution evidence. A `isDepartmentLead` boolean flag on the Staff profile grants manager-level actions (reassign within department, view department analytics) without creating a 4th role. |
| **City Admin**       | `ADMIN`    | Full system access: manages departments, categories, users, role assignment, SLA configs, sees platform-wide analytics, audit logs, and dashboard stats. Also seeded as `SUPER_ADMIN` capability via a `isSuperAdmin` flag (single super admin from `.env`, cannot be deleted).                     |

**Demo seed accounts** (created on first boot if no users exist, credentials pulled from `.env`):

- `ADMIN_EMAIL` / `ADMIN_PASSWORD` → 1 Super Admin
- `STAFF_EMAIL` / `STAFF_PASSWORD` → 1 Staff (seeded into "Roads & Infrastructure" department, `isDepartmentLead=true`)
- `CITIZEN_EMAIL` / `CITIZEN_PASSWORD` → 1 Citizen

---

## 4. Global Engineering Standards

### 4.1 Tech Stack (fixed)

| Layer              | Choice                                                                  |
| ------------------ | ----------------------------------------------------------------------- |
| Runtime/Framework  | Node.js, TypeScript, Express.js                                         |
| ORM/DB             | Prisma + PostgreSQL                                                     |
| Validation         | Zod                                                                     |
| Auth               | Custom JWT (access + refresh) + Google OAuth (GCP Social Login)         |
| Caching/Rate-limit | Redis (ioredis)                                                         |
| File storage       | Multer → Cloudinary                                                     |
| Payments           | Stripe (Checkout Session + Webhooks)                                    |
| Docs               | Postman Collection (exported JSON committed to repo) + optional Swagger |
| Deployment         | Render (API) + Render/Neon (Postgres) + Upstash/Render (Redis)          |

### 4.2 API Response Contract (mandatory, every endpoint)

```json
// Success
{ "success": true, "message": "Operation successful", "data": { } }

// Paginated success
{ "success": true, "message": "Operation successful", "data": { "items": [], "meta": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 } } }

// Error
{ "success": false, "message": "Something went wrong", "errors": [ { "field": "email", "message": "Invalid email format" } ] }
```

Implemented via a shared `sendResponse()` util and a **centralized global error-handling middleware** (`src/middlewares/globalErrorHandler.ts`) that normalizes Zod errors, Prisma errors (`P2002`, `P2025`, etc.), JWT errors, and custom `AppError` instances into this shape. Every controller wraps handlers in a shared `catchAsync()` HOF — no per-route try/catch duplication.

### 4.3 Versioning

All routes mounted under `/api/v1/...` via a single `src/routes/index.ts` aggregator that imports each module's `*.route.ts`.

### 4.4 Cross-Cutting Middleware (`src/middlewares`)

- `auth.ts` → `authenticate` (verifies Bearer JWT), `authorize(...roles)` (RBAC gate)
- `validateRequest.ts` → generic Zod schema validator (body/query/params)
- `rateLimiter.ts` → `express-rate-limit` (global + stricter limiter on `/auth/*` and `/payments/*`)
- `globalErrorHandler.ts`, `notFound.ts`
- `helmet`, `cors` configured in `src/app.ts`

### 4.5 Soft Delete Convention

Every core model has `deletedAt DateTime?`. All "list"/"get" queries default to `where: { deletedAt: null }` via a shared Prisma query helper. "Delete" endpoints set `deletedAt` rather than removing rows.

### 4.6 Audit Logging

A shared `AuditLog` model + `auditLogger` service records: actor (`userId`), action (`enum AuditAction`), entity type, entity id, before/after diff (JSON), timestamp, IP. Triggered from services (not controllers) for: role changes, status transitions, assignment changes, payment status changes, soft deletes.

---

## 5. Modular Folder Structure

```text
src/
├── app.ts
├── server.ts
├── config/
│   ├── env.ts                 # zod-validated env loader
│   ├── db.ts                  # Prisma client singleton
│   ├── redis.ts                # Redis client singleton
│   ├── cloudinary.ts
│   └── stripe.ts
├── middlewares/
│   ├── auth.ts
│   ├── validateRequest.ts
│   ├── rateLimiter.ts
│   ├── globalErrorHandler.ts
│   └── notFound.ts
├── shared/
│   ├── sendResponse.ts
│   ├── catchAsync.ts
│   ├── AppError.ts
│   ├── paginate.ts             # shared pagination/filter/sort helper
│   └── queryBuilder.ts
├── routes/
│   └── index.ts                # aggregates all module routes under /api/v1
├── modules/
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.interface.ts
│   │   ├── auth.validation.ts
│   │   └── auth.route.ts        # (no auth.model.ts — reuses users.model)
│   ├── users/
│   │   ├── user.model.ts        # Prisma schema fragment reference + type helpers
│   │   ├── user.service.ts
│   │   ├── user.controller.ts
│   │   ├── user.interface.ts
│   │   ├── user.validation.ts
│   │   └── user.route.ts
│   ├── departments/
│   │   └── (department.model|service|controller|interface|validation|route).ts
│   ├── categories/
│   │   └── (category.*.ts)
│   ├── complaints/
│   │   └── (complaint.*.ts)      # core resource
│   ├── assignments/
│   │   └── (assignment.*.ts)
│   ├── attachments/
│   │   └── (attachment.*.ts)
│   ├── statusHistory/
│   │   └── (statusHistory.*.ts)  # read-only, populated by complaint/assignment services
│   ├── feedback/
│   │   └── (feedback.*.ts)
│   ├── notifications/
│   │   └── (notification.*.ts)
│   ├── payments/
│   │   └── (payment.*.ts)
│   ├── auditLogs/
│   │   └── (auditLog.*.ts)       # read-only for admin
│   └── admin/
│       └── (admin.*.ts)          # dashboard-stats, cross-module admin ops
└── prisma/
    ├── schema.prisma
    └── seed.ts
```

Each module strictly owns its own `*.interface.ts` (DTOs/types) and `*.validation.ts` (Zod schemas). Controllers **never** call Prisma directly — only services do. Services **never** touch `req`/`res`.

---

## 6. Core Domain Workflow

```
Citizen creates Complaint/ServiceRequest
        │  (category + geo-location + optional attachments + optional "priority" paid flag)
        ▼
System auto-routes to Department (via Category → Department mapping)
        │
        ▼
Status: SUBMITTED → auto SLA deadline computed (Category.slaHours)
        │
        ▼
Staff (dept lead or admin) creates Assignment → assigns to a Staff member
        │
        ▼
Status: ASSIGNED → IN_PROGRESS (staff updates)
        │
        ▼
Staff logs work updates / resolution note / resolution photo
        │
        ▼
Status: RESOLVED
        │
        ▼
Citizen confirms → Status: CLOSED   (or REOPENED if citizen rejects resolution, max 1 reopen)
        │
        ▼
Citizen Feedback (rating 1–5 + comment)
```

**SLA breach handling:** a scheduled background job (`node-cron`, run hourly) scans `ASSIGNED`/`IN_PROGRESS` complaints past `slaDeadline`, flags `isSlaBreached = true`, writes an audit log, and creates a `Notification` to the department lead + admin.

**Paid flows (Stripe-backed):**

1. **Priority Processing Add-on** — citizen pays a flat fee on an existing complaint to move it to a priority queue (`isPriority=true`, reduces effective SLA by a configured %).
2. **Paid Service Requests** — certain `Category` records are flagged `isChargeable=true` with a `basePrice` (e.g., "Bulk Waste Pickup", "Tree Removal Permit"). Creating a complaint under such a category requires payment before the request moves past `SUBMITTED`.

---

## 7. Database Design (Entities & Relationships)

> Full field list is intentionally verbose — implement exactly as Prisma models in `prisma/schema.prisma`. Types are Prisma types.

### 7.1 Enums

```
Role            { CITIZEN, STAFF, ADMIN }
ComplaintStatus { SUBMITTED, ASSIGNED, IN_PROGRESS, RESOLVED, CLOSED, REOPENED, REJECTED }
PaymentStatus   { PENDING, SUCCEEDED, FAILED, REFUNDED }
PaymentPurpose  { PRIORITY_FEE, SERVICE_CHARGE }
NotificationType{ STATUS_UPDATE, ASSIGNMENT, SLA_BREACH, PAYMENT, FEEDBACK_REQUEST, SYSTEM }
AuditAction     { CREATE, UPDATE, DELETE, STATUS_CHANGE, ASSIGN, ROLE_CHANGE, PAYMENT }
```

### 7.2 Entities

**User**
`id, name, email (unique), password (nullable — null if OAuth-only), googleId (nullable, unique), role (Role), phone, avatarUrl, isActive, isSuperAdmin (bool, default false), createdAt, updatedAt, deletedAt`
→ has one `StaffProfile?`, many `Complaint` (as citizen), many `RefreshToken`, many `Notification`, many `Payment`, many `Feedback`, many `AuditLog` (as actor)

**RefreshToken**
`id, userId (FK), tokenHash, expiresAt, createdAt, revokedAt (nullable)`

**Department**
`id, name (unique), description, isActive, createdAt, updatedAt, deletedAt`
→ has many `StaffProfile`, many `Category`, many `Complaint`

**StaffProfile** (1–1 extension of User when role=STAFF)
`id, userId (FK unique), departmentId (FK), isDepartmentLead (bool), employeeCode (unique), createdAt, updatedAt`

**Category**
`id, name (unique), description, departmentId (FK), slaHours (int), isChargeable (bool default false), basePrice (Decimal, nullable), isActive, createdAt, updatedAt, deletedAt`
→ has many `Complaint`

**Complaint** (core resource; user-facing term: "Request")
`id, referenceCode (unique, human-readable e.g. CMP-2026-00042), citizenId (FK User), categoryId (FK Category), departmentId (FK Department, denormalized for query speed), title, description, latitude (Float), longitude (Float), address, status (ComplaintStatus default SUBMITTED), isPriority (bool default false), slaDeadline (DateTime), isSlaBreached (bool default false), resolutionNote (text nullable), reopenCount (int default 0, max 1 enforced in service), createdAt, updatedAt, deletedAt`
→ has many `Attachment`, one `Assignment?` (current), many `Assignment` (history), one `Feedback?`, many `Payment`, many `StatusHistory`

**Assignment**
`id, complaintId (FK), staffId (FK User where role=STAFF), assignedById (FK User), assignedAt, unassignedAt (nullable), isCurrent (bool)`
→ history preserved by never deleting rows, only closing `isCurrent=false` + inserting new row on reassignment

**StatusHistory**
`id, complaintId (FK), fromStatus (nullable), toStatus, changedById (FK User), note (nullable), createdAt`

**Attachment**
`id, complaintId (FK), uploadedById (FK User), url (Cloudinary secure_url), publicId (Cloudinary id, for deletion), fileType (enum: IMAGE/DOCUMENT), stage (enum: SUBMISSION/RESOLUTION), createdAt`

**Feedback**
`id, complaintId (FK unique), citizenId (FK User), rating (int 1–5), comment (nullable), createdAt`

**Payment**
`id, userId (FK), complaintId (FK, nullable — nullable to allow future non-complaint charges), purpose (PaymentPurpose), amount (Decimal), currency (default "usd"), stripeSessionId (unique), stripePaymentIntentId (nullable), status (PaymentStatus default PENDING), paidAt (nullable), createdAt, updatedAt`

**Notification**
`id, userId (FK), type (NotificationType), title, body, isRead (bool default false), relatedComplaintId (nullable FK), createdAt`

**AuditLog**
`id, actorId (FK User, nullable for system actions), action (AuditAction), entityType (string), entityId (string), before (Json nullable), after (Json nullable), ipAddress (nullable), createdAt`

### 7.3 Relationship & Index Notes

- `Complaint.departmentId`, `Complaint.status`, `Complaint.citizenId` → composite/individual indexes (heavily filtered).
- `Complaint(latitude, longitude)` → index for future geo-radius queries.
- `Category.departmentId`, `StaffProfile.departmentId` → FK indexes.
- `Payment.stripeSessionId` unique index (idempotent webhook processing).
- Use a DB **transaction** when: creating a Complaint that requires payment (Complaint + initial StatusHistory row must commit together), creating an Assignment (close old + open new must be atomic), and processing a Stripe webhook that flips both `Payment.status` and unlocks the related `Complaint`.

---

## 8. Business Rules

1. A citizen can have **at most 1 open reopen** per complaint (`reopenCount <= 1`); after that, `REOPENED` is disallowed — citizen must file a new complaint.
2. A complaint under a `Category.isChargeable=true` category stays in a virtual `PENDING_PAYMENT` sub-state (implemented as `status=SUBMITTED` + `payments[].status != SUCCEEDED`) and **cannot be assigned** until a `SUCCEEDED` payment exists for it.
3. Only `STAFF` with `isDepartmentLead=true` (or `ADMIN`) can create/reassign an `Assignment`.
4. A `STAFF` user can only update complaints currently assigned to them (`Assignment.isCurrent=true AND staffId=req.user.id`), enforced in service layer, not just route middleware.
5. Status transitions are a strict state machine (enforced in `complaint.service.ts`):
   `SUBMITTED→ASSIGNED→IN_PROGRESS→RESOLVED→CLOSED`, with `RESOLVED→REOPENED→ASSIGNED` as the only backward edge, and `SUBMITTED→REJECTED` (admin/staff only, with mandatory reason). Any other transition → 400 error.
6. `isPriority=true` requires a `SUCCEEDED` payment of purpose `PRIORITY_FEE`; on success, `slaDeadline` is recalculated as `createdAt + (Category.slaHours * PRIORITY_SLA_MULTIPLIER)` where multiplier (e.g. 0.5) is env-configurable.
7. Feedback can only be submitted once, only by the complaint's citizen, and only when `status=CLOSED`.
8. Soft-deleted departments/categories cannot be selected for new complaints but remain visible on historical complaints.
9. Admin role changes (e.g., promoting a citizen to staff) must create a `StaffProfile` in the same transaction and are always audit-logged.
10. Rate limiting: `/auth/login` and `/auth/register` limited stricter (e.g., 10 req/15min/IP) to prevent brute force; general API 100 req/15min/IP.

---

## 9. Authentication & Authorization

- **Email/Password**: bcrypt-hashed passwords, JWT access token (short-lived, ~15min) + JWT refresh token (long-lived, ~7d, stored hashed in `RefreshToken` table, rotated on use, revocable on logout). Forgot password flow by OTP verification by storing the OTP temporarily on Redis after expiration/successful-verification remove it from the Redis.
- **Google OAuth (GCP Social Login)**: `googleId` linked to `User`; first-time Google login auto-creates a `CITIZEN` account (never auto-creates STAFF/ADMIN).
- **Bearer token** required on all protected routes via `Authorization: Bearer <token>`.
- **RBAC middleware**: `authorize('ADMIN')`, `authorize('STAFF','ADMIN')`, etc., declared per-route.
- **Resource-level checks** (e.g., "citizen can only see own complaints", "staff can only update own assignments") implemented inside services — RBAC middleware only checks _role_, not _ownership_.

---

## 10. Caching Strategy (Redis)

| Cached data                                 | Key pattern                                 | TTL         | Invalidation                     |
| ------------------------------------------- | ------------------------------------------- | ----------- | -------------------------------- |
| Public platform stats (`GET /public/stats`) | `stats:public`                              | 5 min       | time-based only                  |
| Category list (rarely changes)              | `categories:all`                            | 10 min      | on category create/update/delete |
| Admin dashboard stats                       | `admin:dashboard:{dateRange}`               | 2 min       | time-based                       |
| Rate-limit counters                         | handled by `express-rate-limit` Redis store | n/a         | n/a                              |
| Refresh-token blacklist / logout            | `blacklist:{jti}`                           | = token TTL | on logout                        |

---

## 11. API Surface (≥ 20 endpoints, grouped by module)

All under `/api/v1`. `🔒` = auth required. Role shown = allowed roles.

### Auth (`modules/auth`)

1. `POST /auth/register` — public
2. `POST /auth/login` — public
3. `POST /auth/google` — public (id_token exchange)
4. `POST /auth/refresh-token` — public (reads refresh token)
5. `POST /auth/logout` 🔒 — any

### Users (`modules/users`)

6. `GET /users/me` 🔒 — any
7. `PATCH /users/me` 🔒 — any
8. `PATCH /users/change-password` 🔒 — any

### Departments (`modules/departments`)

9. `POST /departments` 🔒 — ADMIN
10. `GET /departments` — public (paginated)
11. `PATCH /departments/:id` 🔒 — ADMIN
12. `DELETE /departments/:id` 🔒 — ADMIN (soft delete)

### Categories (`modules/categories`)

13. `POST /categories` 🔒 — ADMIN
14. `GET /categories` — public (cached, paginated + filter by department)
15. `PATCH /categories/:id` 🔒 — ADMIN
16. `DELETE /categories/:id` 🔒 — ADMIN (soft delete)

### Complaints (`modules/complaints`) — core resource

17. `POST /complaints` 🔒 — CITIZEN
18. `GET /complaints` 🔒 — role-scoped (Citizen: own; Staff: dept/assigned; Admin: all) — **pagination + filter (status, categoryId, departmentId) + sort**
19. `GET /complaints/:id` 🔒 — role-scoped ownership check
20. `PATCH /complaints/:id/status` 🔒 — STAFF/ADMIN (state-machine enforced)
21. `POST /complaints/:id/reopen` 🔒 — CITIZEN (own, max 1)
22. `DELETE /complaints/:id` 🔒 — ADMIN/owning CITIZEN before assignment (soft delete)
23. `GET /complaints/search` 🔒 — **search** by title/description/referenceCode (Admin/Staff)
24. `GET /complaints/my-assigned` 🔒 — STAFF

### Assignments (`modules/assignments`)

25. `POST /complaints/:id/assign` 🔒 — STAFF(lead)/ADMIN — creates Assignment (transaction)
26. `PATCH /assignments/:id/reassign` 🔒 — STAFF(lead)/ADMIN

### Attachments (`modules/attachments`)

27. `POST /complaints/:id/attachments` 🔒 — owning CITIZEN (submission) or assigned STAFF (resolution), Multer + Cloudinary
28. `DELETE /attachments/:id` 🔒 — uploader/ADMIN

### Feedback (`modules/feedback`)

29. `POST /complaints/:id/feedback` 🔒 — CITIZEN (own, status=CLOSED only)
30. `GET /complaints/:id/feedback` — public

### Payments (`modules/payments`)

31. `POST /payments/initiate` 🔒 — CITIZEN (body: complaintId, purpose) → creates Stripe Checkout Session
32. `POST /payments/webhook` — public (Stripe signature-verified)
33. `GET /payments/:id` 🔒 — owner/ADMIN
34. `GET /payments/my-history` 🔒 — CITIZEN

### Notifications (`modules/notifications`)

35. `GET /notifications` 🔒 — any (own, paginated)
36. `PATCH /notifications/:id/read` 🔒 — own

### Public / Statistics

37. `GET /public/stats` — public, cached (total resolved, avg resolution time, per-category counts)

### Admin (`modules/admin` + `modules/auditLogs`)

38. `GET /admin/users` 🔒 — ADMIN (paginated, filter by role)
39. `PATCH /admin/users/:id/role` 🔒 — ADMIN (transaction; audit-logged)
40. `PATCH /admin/users/:id/deactivate` 🔒 — ADMIN
41. `GET /admin/dashboard-stats` 🔒 — ADMIN (cached)
42. `GET /admin/audit-logs` 🔒 — ADMIN (paginated, filter by entityType/action)

### Auth 2.0
43. `POST /auth/forgot-password` 🔒 — any
44. `POST /auth/forgot-password/verify-otp` 🔒 — any
45. `POST /auth/forgot-password/reset-password` 🔒 — any

_(45 documented endpoints — comfortably exceeds the 20-minimum and covers every required category: Auth, User/Profile, Core CRUD, Business Ops, Search/Filter/Sort/Pagination, Payment, Admin.)_

---

## 12. Implementation Phases (maps to the 5-day timeline; each phase = one delivery checkpoint)

### Phase 0 — Bootstrap

- Repo init, TS/Express/ESLint/Prettier config, `src/app.ts`, `src/server.ts`, `config/env.ts` (Zod-validated env), Prisma init, Docker/local Postgres, Redis connection, Cloudinary + Stripe SDK config stubs.
- Write `prisma/schema.prisma` fully per §7, run first migration.
- Write `prisma/seed.ts` implementing the "seed demo users per role from `.env`" rule.

### Phase 1 — Auth, Auth 2.0 & Users

- `modules/auth`, `modules/users` fully implemented per §11 items 1–8.
- Middlewares: `auth.ts`, `validateRequest.ts`, `globalErrorHandler.ts`, `notFound.ts`, `rateLimiter.ts`.
- Shared utils: `sendResponse`, `catchAsync`, `AppError`, `paginate`.

### Phase 2 — Departments, Categories, Complaints core CRUD

- `modules/departments`, `modules/categories`, `modules/complaints` (create/list/get/soft-delete, pagination+filter+search).
- Redis caching wired for categories list + public stats stub.

### Phase 3 — Business workflows

- Status state machine, `modules/assignments`, `modules/attachments` (Multer+Cloudinary), `modules/feedback`, `StatusHistory` writes, SLA deadline computation + hourly cron breach check, `modules/notifications`.
- Audit logging wired into all mutating services.

### Phase 4 — Payments

- `modules/payments`: Stripe Checkout session creation, webhook handler (raw body + signature verification, idempotent via `stripeSessionId` unique constraint), payment-gated complaint unlock logic, priority SLA recalculation.

### Phase 5 — Admin, Analytics, Hardening, Deployment

- `modules/admin`, `modules/auditLogs`, `GET /public/stats`, `GET /admin/dashboard-stats`.
- Security pass: helmet, CORS allowlist, rate-limit tuning, final Zod validation audit.
- Postman collection export, README, deploy to Render, connect production Postgres/Redis, record demo video.

---

## 13. Edge Cases to Handle Explicitly

- Duplicate complaint submission spam (same citizen, same category, same geo, within N minutes) → soft warning in `data`, not a hard block.
- Assigning a complaint to a staff member from a **different department** → 400.
- Reassigning an already-`RESOLVED`/`CLOSED` complaint → 400.
- Stripe webhook arriving twice for the same session (retries) → idempotent no-op on second call.
- Payment succeeds but citizen never returns to app → webhook is the source of truth, not the client redirect.
- Deactivated (`isActive=false`) staff still assigned to open complaints → block new assignments to them, but keep history intact; admin dashboard should flag "orphaned assignments."
- File upload exceeding size/type limits → structured 400 via Multer error mapped through global error handler.
- Attempting `feedback` on a complaint not yet `CLOSED` → 400.
- Deleting a Category/Department that has active (non-closed) complaints → block soft-delete with a clear error, or require `force=true` admin override that leaves historical complaints untouched.

---

## 14. Non-Functional Requirements

- All list endpoints: pagination (`page`, `limit`, default 1/10, max 100), consistent `meta` block.
- p95 response time target for non-payment/non-webhook endpoints: < 300ms on cached reads.
- Structured logging (e.g., `pino`) with request-id correlation.
- `.env.example` committed; secrets never committed.
- Minimum 20 meaningful, conventional-commit-styled commits (`feat:`, `fix:`, `docs:`, `refactor:`) across phases.

---

## 15. Deliverables Checklist (maps to grading rubric)

- [ ] Postman collection (all 45 endpoints, example requests/responses, env vars for tokens)
- [ ] Prisma schema + migrations + seed
- [ ] 3-role RBAC demonstrated (403 cross-role test cases in Postman)
- [ ] Zod validation on all mutating endpoints
- [ ] Global structured error handling
- [ ] Stripe live payment flow (session → webhook → status update)
- [ ] Redis caching + rate limiting demonstrated
- [ ] Soft deletes + audit logs demonstrated
- [ ] Deployed live API URL
- [ ] README with setup, architecture diagram, and submission block (per `key-rules-and-instructions.md` format)
- [ ] 5–10 min walkthrough video

---

## 16. Open Items for the Developer to Confirm Before Phase 4

- Exact `PRIORITY_SLA_MULTIPLIER` and flat `PRIORITY_FEE` amount.
- Whether `basePrice` on chargeable categories is fixed or admin-editable per complaint (recommend: fixed at category level for v1).
- Final list of seed Categories/Departments (recommend starting with: Roads & Infrastructure, Sanitation, Water & Sewage, Street Lighting, Parks & Recreation — each with 2–3 categories).
