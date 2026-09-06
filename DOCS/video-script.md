# CityFix Backend - Video Walkthrough Script

**Target Duration**: 5 - 10 minutes
**Tools Needed**: Postman (with the provided collection), PgAdmin/DBeaver (to show DB), Redis CLI (optional), Stripe Dashboard.

---

## 1. Introduction (0:00 - 1:00)
- **Visuals**: Show the `README.md` and the running terminal (`npm run dev`).
- **Script**: 
  > "Hello, my name is [Your Name], and this is the video walkthrough for CityFix, a municipal service request and complaint management platform. 
  > 
  > The CityFix API is built on a modern stack: Node.js, Express, TypeScript, Prisma with PostgreSQL, Redis, Stripe, and Cloudinary. 
  > 
  > Today, I'll walk you through the core architecture, demonstrate the role-based access control, run through the complaint lifecycle, and show you some of the advanced features like Stripe payments, Redis caching, and automated SLA tracking."

## 2. Authentication & Roles (1:00 - 2:00)
- **Visuals**: Open Postman. Show the Auth folder.
- **Action**:
  - Run the `login` endpoint as a **Citizen**. Show the JWT token being generated.
  - Run the `login` endpoint as an **Admin**.
  - Show the RBAC in action: Try to create a Category as a Citizen (expect 403 Forbidden). Then create a Category as an Admin (expect 201 Created).
- **Script**:
  > "We have exactly three strict roles: Citizen, Staff, and Admin. Authentication is handled via JWT access tokens and long-lived refresh tokens. 
  > 
  > Here, I'm logging in as a Citizen. If I attempt to access an Admin-only route, like creating a new Department or Category, the system's global RBAC middleware blocks the request. When I log in as an Admin, the exact same request succeeds."

## 3. The Complaint Lifecycle (2:00 - 4:00)
- **Visuals**: Postman (Complaints, Assignments, Attachments).
- **Action**:
  1. **Citizen**: Submit a new complaint (e.g., Pothole repair). Show the response with the `SUBMITTED` status and `slaDeadline`.
  2. **Citizen**: Upload a photo attachment to that complaint via Multer & Cloudinary (show the Cloudinary URL in the response).
  3. **Admin/Staff Lead**: Assign the complaint to a specific Staff member. Show the transaction that creates the `Assignment`.
  4. **Staff**: Update the complaint status to `IN_PROGRESS`, then to `RESOLVED` with a resolution note.
  5. **Citizen**: Submit a 1-5 feedback rating on the `CLOSED` complaint.
- **Script**:
  > "Let's walk through the core workflow. A citizen submits a new request, which maps to a category and computes an SLA deadline. They can upload image evidence, which our API handles entirely in-memory using Multer and streams directly to Cloudinary for optimized storage.
  > 
  > Next, a Department Lead assigns the ticket to a technician. Our Prisma services ensure this happens atomically inside a transaction. The staff member updates the status to resolved, and finally, the citizen leaves a feedback rating."

## 4. Payments Integration (Stripe) (4:00 - 5:30)
- **Visuals**: Postman (Payments), Stripe Dashboard.
- **Action**: 
  - Call `POST /payments/initiate` on a complaint to buy priority processing. Show the Stripe checkout URL.
  - Show the `POST /payments/webhook` endpoint. Explain how it bypasses the global JSON parser to capture the raw body for cryptographic signature verification.
- **Script**:
  > "CityFix allows citizens to pay for premium services—like expedited processing—via Stripe. 
  > 
  > When a citizen initiates a payment, we generate a Stripe Checkout session. Crucially, our application listens to Stripe Webhooks. We use `express.raw` specifically on the webhook route to verify Stripe's cryptographic signatures securely. 
  > 
  > When Stripe fires the `checkout.session.completed` event, our backend automatically unlocks the complaint, applies the priority flag, and recalculates the SLA deadline—all inside a database transaction."

## 5. Caching & Performance (Redis) (5:30 - 6:30)
- **Visuals**: Postman (Public Stats, Admin Dashboard), code editor showing `src/middlewares/rateLimiter.ts`.
- **Action**: 
  - Hit `GET /public/stats` multiple times. Note the lightning-fast response time on subsequent requests.
- **Script**:
  > "To ensure performance under load, we heavily utilize Redis. Endpoints with heavy database aggregations, like the Public Stats and Admin Dashboards, are cached in Redis with short TTLs. 
  > 
  > Additionally, our API rate limiters are backed by Redis via `rate-limit-redis`, ensuring that brute-force protections on our auth routes are synchronized across horizontal server instances."

## 6. Audit Logs, Soft Deletes & Security (6:30 - 8:00)
- **Visuals**: Database GUI (PgAdmin/DBeaver) or Postman (Admin Audit Logs).
- **Action**:
  - Show a soft-deleted record in the database (`deletedAt` is populated, row isn't dropped).
  - Run `GET /admin/audit-logs` in Postman. Show how state transitions and role changes are immutably tracked.
  - Explain the SLA cron job in `src/cron/slaCheck.ts`.
- **Script**:
  > "We maintain strict data integrity. Whenever a resource is deleted, we apply a soft delete by timestamping `deletedAt`, ensuring historical complaints never break.
  > 
  > We also run a centralized Audit Logger. Every state transition, payment, or role change writes an immutable JSON diff to our Audit Logs table, giving administrators full visibility.
  > 
  > Lastly, we have a `node-cron` background job running hourly. It scans the database for active assignments that have breached their computed SLA deadlines, automatically flagging them and firing notifications to department leads."

## 7. Conclusion (8:00 - 8:30)
- **Visuals**: Back to the GitHub repository / README.
- **Script**:
  > "That concludes the walkthrough of CityFix. The complete Postman collection, database schema, and deployment configurations are available in the repository. Thank you for watching!"
