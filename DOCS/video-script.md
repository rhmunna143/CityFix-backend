# CityFix Backend - Video Walkthrough Script

**Target Duration**: 5 - 10 minutes
**Tools Needed**: Postman (using the live API), PgAdmin/DBeaver (to show DB), Stripe Dashboard.

---

## 1. Project Overview & Architecture (0:00 - 1:00)
- **Visuals**: Show the `README.md` and then briefly open a route, controller, and service file in your IDE.
- **Script**: 
  > "Hello, my name is [Your Name]. This is the video walkthrough for **CityFix**, a municipal service request and complaint management platform. The platform solves the problem of tracking, routing, and fulfilling citizen complaints like road hazards or waste management issues.
  > 
  > The CityFix API is built on a modern stack: Node.js, Express, TypeScript, Prisma with PostgreSQL, Redis, Stripe, and Cloudinary. Our architecture strictly follows the Controller-Service pattern. Requests hit our **Routes** where they pass through authentication and Zod validation, move to the **Controllers** which handle HTTP responses, and then drop into our **Services** which encapsulate the core business logic and interface with the database via **Prisma**."

## 2. Authentication, Roles, & RBAC (1:00 - 2:00)
- **Visuals**: Open Postman. Show the Auth and Admin folders.
- **Action**:
  - Run the `login` endpoint as a **Citizen**. Show the JWT token being generated.
  - Using the Citizen token, attempt to hit the `GET /admin/users` endpoint or create a Category. (Show the `403 Forbidden` response).
  - Now, login as an **Admin**, hit the exact same `GET /admin/users` endpoint, and show it succeeding (`200 OK`).
  - Briefly show logging in as **Staff** to view assigned complaints.
- **Script**:
  > "We maintain three distinct roles: Citizen, Staff, and Admin. Authentication is handled via JWT access and refresh tokens. 
  > 
  > Here, I'm logging in as a Citizen. If I attempt to access an Admin-only route, like fetching all system users, the global Role-Based Access Control middleware blocks the request and returns a 403 Forbidden. However, when I authenticate as an Admin, the exact same request safely succeeds."

## 3. Validation & Error Handling (2:00 - 3:00)
- **Visuals**: Postman.
- **Action**:
  - **400 Validation Error**: Attempt to register a new user or submit a complaint with a deliberately malformed email (e.g., `invalid-email`). Show the structured Zod error array in the response.
  - **401 Unauthorized**: Attempt to access a protected route (like `GET /users/me`) with an expired or missing token.
  - **404 Not Found**: Attempt to fetch a non-existent complaint ID.
- **Script**:
  > "Our API is heavily fortified against bad data. If a user submits a malformed payload—such as an invalid email address—our Zod validation middleware intercepts it and returns a structured 400 error detailing exactly which fields failed.
  > 
  > We also have standardized error handling across the board. Providing an invalid token yields a clear 401 Unauthorized, and attempting to access a resource that doesn't exist returns a unified 404 Not Found."

## 4. Demonstrating CRUD (3:00 - 4:30)
- **Visuals**: Postman (Complaints / Categories folders).
- **Action**:
  - **CREATE (POST)**: Submit a new complaint as a citizen. Show the JSON body and response.
  - **READ (GET)**: Fetch the paginated list of complaints.
  - **UPDATE (PATCH)**: As an Admin, update the name or base price of a Category.
  - **DELETE**: Delete a category or user. Show how the database performs a "Soft Delete" (populating `deletedAt` instead of dropping the row).
- **Script**:
  > "Let's demonstrate the core CRUD functionality. A citizen can CREATE a new complaint by passing a JSON payload with a location and description. We can READ those complaints using our robust querying and pagination engine.
  > 
  > Administrators can UPDATE system records—like modifying a category's base price via a PATCH request. Finally, when performing a DELETE operation, our system employs soft-deletes via Prisma extensions, ensuring data integrity by simply timestamping the record rather than destroying it."

## 5. Payments Integration (Stripe) (4:30 - 6:00)
- **Visuals**: Postman (Payments), Stripe Checkout URL, Stripe Dashboard.
- **Action**: 
  - Call `POST /payments/initiate` for a complaint to buy priority processing. Show the Stripe checkout URL.
  - Open the Stripe URL in the browser and complete a mock payment.
  - Back in Postman (or the database), show the `Payment` record status changed to `SUCCEEDED` and the complaint's `isPriority` flag updated to `true`.
- **Script**:
  > "CityFix allows citizens to pay for premium services, such as expedited priority processing, via Stripe. 
  > 
  > When a citizen initiates a payment, our API generates a Stripe Checkout session. Crucially, our backend listens for asynchronous Stripe Webhooks. When the user successfully checks out, Stripe sends a secure event to our webhook route. Our server verifies the cryptographic signature, then atomically updates the payment status to 'Succeeded' in the database and recalculates the citizen's SLA deadline."

## 6. Technical Challenge (6:00 - 7:00)
- **Visuals**: Code editor showing `src/app.ts` (Webhook raw parser) or `src/config/env.ts` (Vercel formatting).
- **Script**:
  > "One of the most significant technical challenges I faced was effectively parsing the Stripe Webhooks. 
  > 
  > Express applications typically use a global JSON parser. However, Stripe requires the absolute raw, unparsed byte stream of the incoming request to mathematically verify the cryptographic signature. If the JSON parser touches it first, the validation fails. 
  > 
  > I solved this by strategically mounting the webhook route with `express.raw()` at the very top of the application stack, strictly bypassing the global JSON middleware for that specific endpoint, ensuring our financial transactions are completely secure."

## 7. Conclusion (7:00 - 7:30)
- **Visuals**: Back to the GitHub repository / README.
- **Script**:
  > "That concludes the walkthrough of CityFix. The complete Postman collection, deployed API, database schema, and source code are available in the repository. Thank you for watching!"
