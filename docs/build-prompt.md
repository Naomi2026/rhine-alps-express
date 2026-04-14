# RHINE ALPS EXPRESS — BUILD PROMPT

Build a production-style MVP for a water delivery platform called “Rhine Alps Express” for Nairobi, Kenya.

Act as a senior full-stack engineer, product engineer, systems designer, and UX-conscious builder. Build a real, coherent MVP with clean architecture, realistic workflows, and an extensible foundation.

## Product context
This is a bottled water ordering and delivery platform with 4 roles:
1. Customer
2. Rider
3. Admin
4. Super Admin

The business delivers bottled water to homes, estates, offices, shops, gyms, schools, churches, and apartment clusters.

## Primary goal
Customers should be able to register, save their delivery location, place orders, see delivery pricing based on distance bands, pay or select cash where allowed, track orders, receive OTP confirmation for delivery, and see/apply any approved customer credit automatically on the next order.

Admins should manage customers, orders, rider assignment, delivery zones and pricing bands, customer credits, slots, and system users.

Super Admins should create admin accounts and approve sensitive operations such as password reset requests.

Riders should have a rider console to view assigned deliveries, update delivery progress, contact customers, and complete delivery only after valid OTP confirmation.

## Tech stack
Use:
- Next.js latest stable with App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Prisma ORM
- PostgreSQL
- Auth.js or NextAuth
- Zod for validation
- React Hook Form for forms
- Zustand or equivalent where needed
- Server actions or API routes as appropriate
- Seed script with sample data
- Clean role-based access control
- Docker support if possible

Do not use Firebase.
Do not build a toy app.
Do not leave placeholders for core logic.

## App name
Rhine Alps Express

## Branding
Simple, clean, modern, trustworthy logistics + commerce look.
Mobile responsive first, but admin should work well on desktop.

## Source of truth
Use `docs/business-rules.md` as the business source of truth.

## Build phases

### Phase 1
Generate:
- complete project scaffold
- folder structure
- Prisma schema
- database seed script
- auth and RBAC structure
- shared enums and types
- initial config files

### Phase 2
Generate shared business logic:
- pricing engine
- zone matching
- delivery slot validation
- customer credit auto-application
- OTP generation and verification
- order, delivery, and payment status transition guards
- audit logger

### Phase 3
Generate dashboards and pages for:
- customer
- rider
- admin
- super admin

### Phase 4
Generate:
- API routes or server actions
- validations
- notifications abstraction
- reporting support

### Phase 5
Generate:
- setup instructions
- environment variable documentation
- Docker support if possible
- final run instructions

## Output rules
- Do not stop at pseudocode.
- Write actual code files.
- If too much for one response, generate the app in phases and clearly label each file.
- Ensure the code is internally consistent.
- Make strong engineering decisions instead of asking too many questions.
- Show where each file belongs.