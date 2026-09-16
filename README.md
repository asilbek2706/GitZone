# GitZone

<div align="center">

### Independent Git Hosting & Developer Collaboration Platform

**Built from scratch with security, reliability, and real Git infrastructure in mind.**

</div>

---

## About GitZone

**GitZone** is an independent Git hosting and developer collaboration platform being built from scratch.

The goal of GitZone is not simply to create a CRUD application around repositories. The project is designed to grow into a complete developer platform capable of hosting real Git repositories, authenticating developers, managing repository permissions, supporting collaboration workflows, and eventually providing features such as pull requests, issues, organizations, CI/CD, releases, notifications, and a dedicated GitZone CLI.

GitZone uses real Git infrastructure and is being developed incrementally with a strong focus on:

- Security
- Reliability
- Maintainability
- Testability
- Clear architecture
- Production-oriented backend design
- Real Git interoperability

The project is divided into development phases so that each layer of the platform can be completed, audited, tested, and stabilized before higher-level features depend on it.

---

# Development Status

| Phase    | Name                        | Status                    |
| -------- | --------------------------- | ------------------------- |
| Phase 1  | Core Platform Foundation    | ✅ Complete               |
| Phase 2  | Authentication & Sessions   | 🚧 In Progress            |
| Phase 3  | Repository CRUD             | 🚧 Foundation Implemented |
| Phase 4  | Git Smart HTTP              | 🚧 Foundation Implemented |
| Phase 5  | Permissions & Collaborators | 🚧 Foundation Implemented |
| Phase 6  | Personal Access Tokens      | 🚧 Foundation Implemented |
| Phase 7+ | Advanced GitZone Features   | ⏳ Planned                |

> **Phase 1 has been fully implemented, audited, tested, and verified through automated tests and real runtime/API testing.**

---

# Phase 1 — Core Platform Foundation

## Status: ✅ 100% Complete

Phase 1 establishes the backend foundation on which the rest of GitZone is built.

The objective of this phase was to create a secure and predictable application runtime before implementing increasingly complex Git hosting and collaboration features.

The foundation includes:

- Application bootstrap
- Environment validation
- PostgreSQL connectivity
- Fail-fast startup
- Graceful shutdown
- Structured logging
- Request identification
- Global error handling
- Health monitoring
- Readiness monitoring
- HTTP security headers
- Strict CORS handling
- Request body limits
- Security-conscious error responses
- Automated testing
- Production build verification

Phase 1 was not considered complete until both automated tests and real runtime/Postman verification passed.

---

## 1. Application Foundation

The GitZone backend is built with:

- Node.js
- Express
- TypeScript
- PostgreSQL
- Prisma

The application architecture separates application configuration from server startup.

This makes the backend easier to test and prevents server initialization logic from being tightly coupled to the Express application itself.

The server startup process now follows a controlled sequence:

```text
Environment Validation
        ↓
Prisma Initialization
        ↓
Database Verification
        ↓
Express Server Startup
        ↓
Process Handler Registration
        ↓
Server Ready
```

The HTTP server is not allowed to begin accepting requests before critical startup requirements have been verified.

---

## 2. Environment Validation

GitZone validates environment configuration during startup.

Invalid or missing required configuration causes the application to fail immediately rather than running in a partially configured state.

Validated configuration includes:

```text
NODE_ENV
PORT
CORS_ORIGIN
TRUST_PROXY
BODY_LIMIT
DATABASE_URL
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
JWT_ACCESS_EXPIRES_IN
JWT_REFRESH_EXPIRES_IN
GIT_STORAGE_PATH
```

Validation includes checks such as:

- Valid application environment
- Valid TCP port range
- Valid CORS origin URL
- Valid body-size configuration
- Required database URL
- Required Git storage path
- Required JWT configuration
- Boolean proxy configuration
- Minimum JWT secret length

This prevents many configuration errors from becoming runtime failures.

---

## 3. JWT Secret Security

JWT signing secrets are security-sensitive configuration values.

GitZone rejects JWT access or refresh secrets shorter than:

```text
32 characters
```

Both access and refresh token secrets are configured independently.

The `.env.example` file explicitly instructs developers to generate strong random values rather than using example passwords.

Example:

```env
JWT_ACCESS_SECRET="replace_with_a_random_secret_at_least_32_characters"
JWT_REFRESH_SECRET="replace_with_a_different_random_secret_at_least_32_characters"
```

Production secrets must never be committed to Git.

The local `.env` file is excluded from version control.

---

## 4. Fail-Fast Server Startup

GitZone implements **fail-fast startup behavior**.

Before Express starts listening on the configured port, the application verifies that PostgreSQL is actually reachable.

Conceptually:

```ts
await verifyDatabaseConnection();

app.listen(PORT);
```

The verification performs a real database query.

If PostgreSQL is unavailable:

```text
Database verification fails
        ↓
Server does NOT start listening
        ↓
Failure is logged
        ↓
Prisma connection is cleaned up
        ↓
Process receives failure exit state
```

This prevents a dangerous situation where an application appears to be running even though one of its critical dependencies is unavailable.

The behavior was also manually tested by stopping PostgreSQL and attempting a fresh GitZone startup.

The server correctly refused to start.

---

## 5. Graceful Shutdown

GitZone handles controlled application termination.

Process handlers are registered for operating-system and runtime events such as:

```text
SIGINT
SIGTERM
uncaughtException
unhandledRejection
```

During graceful shutdown the application attempts to:

1. Stop accepting new HTTP connections.
2. Close the HTTP server.
3. Disconnect Prisma.
4. Close database resources.
5. Terminate the process cleanly.

A shutdown timeout is also used so that the application cannot remain indefinitely stuck while trying to close resources.

This is important for future deployment environments such as:

- Docker
- Kubernetes
- VPS deployments
- CI/CD deployments
- Process managers
- Rolling deployments

---

# HTTP Security Foundation

## 6. Helmet Security Headers

GitZone uses **Helmet** to apply security-related HTTP response headers.

Runtime verification confirmed headers such as:

```text
Content-Security-Policy
X-Content-Type-Options
X-Frame-Options
```

and additional Helmet-managed headers.

These headers provide browser-level protections against several classes of web attacks and unsafe browser behavior.

---

## 7. Strict CORS Policy

Cross-Origin Resource Sharing is explicitly controlled.

GitZone does not blindly return an allowed origin for every incoming browser origin.

The configured frontend origin is allowed.

Example development configuration:

```text
http://localhost:5173
```

A request from that origin receives the appropriate CORS headers.

An unconfigured origin such as:

```text
https://evil.example.com
```

does not receive:

```text
Access-Control-Allow-Origin
Access-Control-Allow-Credentials
```

Requests without an `Origin` header are still supported because non-browser clients such as Git, backend services, health checkers, and command-line tools may legitimately send requests without browser CORS headers.

---

## 8. Request Body Limits

GitZone limits incoming JSON and URL-encoded request bodies.

The current default is:

```env
BODY_LIMIT="1mb"
```

Requests exceeding the configured limit are rejected.

The API returns a controlled response:

```json
{
  "success": false,
  "error": {
    "code": "PAYLOAD_TOO_LARGE",
    "message": "Request body is too large"
  }
}
```

with:

```text
HTTP 413 Payload Too Large
```

This provides an additional boundary against unnecessarily large request payloads and basic memory/resource abuse.

---

## 9. Invalid JSON Protection

Malformed JSON is handled centrally.

Instead of exposing Express parser internals or stack traces, GitZone returns a predictable API error.

Example:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_JSON",
    "message": "Invalid JSON payload"
  }
}
```

with:

```text
HTTP 400 Bad Request
```

Internal parser details are not returned to the client.

---

# Observability

## 10. Request IDs

Every HTTP request receives a unique request identifier.

Example response header:

```text
X-Request-Id: <UUID>
```

Separate requests receive separate IDs.

Request IDs allow future production logs and errors to be correlated with the exact HTTP request that caused them.

This becomes particularly useful when GitZone eventually handles:

- Git pushes
- Git clones
- Repository mutations
- Authentication failures
- Webhooks
- CI/CD jobs
- Distributed services

---

## 11. Structured Logging

GitZone uses structured application logging rather than scattered `console.log()` statements.

Structured logs make server events easier to:

- Search
- Filter
- Parse
- Monitor
- Aggregate

Important runtime information can include fields such as:

```text
requestId
method
path
port
error
```

No direct `console.log`, `console.error`, `console.warn`, or `console.debug` usage remained in the application source during the final Phase 1 audit.

---

# Error Handling

## 12. Centralized Error Middleware

GitZone uses centralized Express error handling.

Known application errors are returned using a consistent API contract.

Example:

```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Resource not found"
  }
}
```

Unexpected internal errors are not sent directly to clients.

Instead, the client receives:

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "Internal server error"
  }
}
```

while the real error is written to server logs.

This separation is intentional:

```text
Client
  ↓
Safe generic error

Server logs
  ↓
Detailed internal error
```

It prevents stack traces and implementation details from unnecessarily leaking through API responses.

---

## 13. 404 Handling

Unknown API routes use the same predictable API error format.

Example:

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Route not found"
  }
}
```

with:

```text
HTTP 404 Not Found
```

This ensures API consumers do not need to handle inconsistent HTML error pages or Express default responses.

---

# Health & Reliability

## 14. Health Endpoint

GitZone provides:

```http
GET /api/health
```

This endpoint confirms that the application process is available.

---

## 15. Liveness Endpoint

GitZone provides:

```http
GET /api/health/live
```

Liveness answers:

> Is the GitZone application process alive?

It intentionally does not depend on PostgreSQL availability.

This means a temporary database outage does not automatically imply that the application process itself is dead.

---

## 16. Readiness Endpoint

GitZone provides:

```http
GET /api/health/ready
```

Readiness answers a different question:

> Is GitZone currently capable of serving requests that require its critical dependencies?

The readiness check performs a real PostgreSQL query.

This gives GitZone three separate health concepts:

```text
/api/health
    ↓
Application health

/api/health/live
    ↓
Process liveness

/api/health/ready
    ↓
Dependency readiness
```

This separation will be useful for Docker, reverse proxies, orchestrators, deployment health checks, and monitoring systems.

---

# Database Failure Verification

Database failure behavior was tested manually during the final Phase 1 verification.

PostgreSQL was temporarily stopped.

While the existing GitZone process was running:

```text
Health      → remained available
Liveness    → remained available
Readiness   → reported database unavailability
```

A fresh GitZone process was then started while PostgreSQL was unavailable.

The application correctly failed during database verification and did **not** begin listening on the HTTP port.

After PostgreSQL was restored:

```text
PostgreSQL → active
GitZone    → starts normally
Readiness  → healthy
```

This confirms that both runtime dependency monitoring and startup dependency verification behave as designed.

---

# Reverse Proxy Preparation

GitZone includes configurable Express proxy trust behavior through:

```env
TRUST_PROXY="false"
```

This allows deployment configuration to be adapted later when GitZone is placed behind infrastructure such as:

```text
Client
   ↓
Nginx
   ↓
GitZone API
```

Proxy trust must be enabled according to the actual production network topology rather than being blindly enabled by default.

---

# Testing

Phase 1 includes unit and integration tests for the platform foundation and existing backend functionality.

At the time Phase 1 was closed:

```text
Test Files: 20 passed / 20
Tests:      218 passed / 218
```

The final quality gate included:

```bash
npm run typecheck
npm run typecheck:tests
npm run lint
npm test
npm run build
```

All checks passed.

---

# Phase 1 Runtime Verification

Automated tests were not the only requirement for closing Phase 1.

The running application was also manually verified through Postman and terminal-based HTTP requests.

The final verification included:

| Test                              | Result  |
| --------------------------------- | ------- |
| Application health                | ✅ PASS |
| Process liveness                  | ✅ PASS |
| Database readiness                | ✅ PASS |
| Unique request IDs                | ✅ PASS |
| Helmet security headers           | ✅ PASS |
| Configured CORS origin            | ✅ PASS |
| Unconfigured CORS origin blocked  | ✅ PASS |
| Unknown route / 404 contract      | ✅ PASS |
| Invalid JSON handling             | ✅ PASS |
| Oversized payload rejection       | ✅ PASS |
| Database outage behavior          | ✅ PASS |
| Readiness during DB outage        | ✅ PASS |
| Fail-fast startup without DB      | ✅ PASS |
| Recovery after PostgreSQL restart | ✅ PASS |

---

# Phase 1 Quality Gate

The final Phase 1 state was:

```text
Automated Tests
├── Test files                    20 / 20 PASS
└── Tests                       218 / 218 PASS

Static Verification
├── Source TypeScript              PASS
├── Test TypeScript                PASS
├── ESLint                         PASS
└── Production Build               PASS

Runtime Verification
├── Health                         PASS
├── Liveness                       PASS
├── Readiness                      PASS
├── Request IDs                    PASS
├── Security Headers               PASS
├── CORS                           PASS
├── Error Contracts                PASS
├── Payload Protection             PASS
├── DB Failure Handling            PASS
└── Fail-Fast Startup              PASS

Security Configuration
├── JWT minimum secret length      PASS
├── Local JWT secrets              64 / 64 chars
├── .env excluded from Git         PASS
└── Local .env permission          600
```

Therefore:

> ## Phase 1 — Core Platform Foundation: ✅ COMPLETE

---

# Current GitZone Capabilities

Although this document highlights Phase 1, development has already introduced foundations for several later phases.

The backend currently contains functionality around:

### Authentication

- User registration
- User login
- JWT access tokens
- Refresh tokens
- HTTP-only refresh cookies
- Session management
- Refresh token rotation
- Refresh token replay protection
- Authentication rate limiting

### Session Security

- Database-backed sessions
- Session metadata
- Session listing
- Individual session revocation
- Revoking other sessions
- Current-session validation
- Token-family tracking

### Personal Access Tokens

GitZone supports Personal Access Token infrastructure for Git/API authentication.

PATs use a GitZone-specific token format and secure server-side token handling.

### Repository Management

Repository functionality currently includes foundations for:

- Repository creation
- Repository management
- Public repositories
- Private repositories
- Repository authorization
- Collaborators
- Read permissions
- Write permissions

### Real Git Transport

GitZone already contains Git Smart HTTP infrastructure.

This allows real Git clients to communicate with GitZone rather than simulating Git operations through ordinary CRUD endpoints.

Development testing has included native operations such as:

```bash
git clone
git fetch
git pull
git push
```

This is a core architectural distinction of GitZone: repositories are intended to behave as real Git repositories.

---

# Technology Stack

## Frontend

```text
React
TypeScript
Vite
SCSS
Redux Toolkit
```

## Backend

```text
Node.js
Express
TypeScript
PostgreSQL
Prisma
```

## Testing & Quality

```text
Vitest
TypeScript Compiler
ESLint
Prettier
Supertest
```

## Git Infrastructure

```text
Git
Git Smart HTTP
Bare Git Repositories
git-http-backend
```

## Planned Infrastructure

```text
Docker
Nginx
Production PostgreSQL
CI/CD
Monitoring
```

---

# Project Structure

```text
gitzone/
├── client/
│   └── React / TypeScript frontend
│
├── server/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── errors/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── app.ts
│   │   ├── server.ts
│   │   ├── server.startup.ts
│   │   └── server.lifecycle.ts
│   │
│   ├── tests/
│   │   ├── unit/
│   │   └── integration/
│   │
│   ├── prisma/
│   ├── storage/
│   ├── .env.example
│   └── package.json
│
├── docs/
│
└── README.md
```

The exact structure will continue evolving as new GitZone phases are implemented.

---

# Environment Configuration

Create a local environment file inside the server directory.

```bash
cp .env.example .env
```

Required configuration includes:

```env
PORT=5000
NODE_ENV=development

CORS_ORIGIN="http://localhost:5173"

DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/DATABASE"

JWT_ACCESS_SECRET="replace_with_a_random_secret_at_least_32_characters"
JWT_REFRESH_SECRET="replace_with_a_different_random_secret_at_least_32_characters"

JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

GIT_STORAGE_PATH="./storage/repositories"

BODY_LIMIT="1mb"

TRUST_PROXY="false"
```

Never commit the real `.env` file.

Generate strong random secrets using a cryptographically secure generator, for example:

```bash
openssl rand -base64 48
```

Use separate values for access and refresh token secrets.

---

# Development

Install backend dependencies:

```bash
cd server
npm install
```

Run the development server:

```bash
npm run dev
```

Build the backend:

```bash
npm run build
```

Start the compiled application:

```bash
npm start
```

---

# Quality Checks

Run TypeScript validation:

```bash
npm run typecheck
npm run typecheck:tests
```

Run ESLint:

```bash
npm run lint
```

Run tests:

```bash
npm test
```

Run the production build:

```bash
npm run build
```

Run coverage:

```bash
npm run test:coverage
```

---

# Development Principles

GitZone development follows several important rules.

## Security First

Security-sensitive functionality should be designed before convenience shortcuts are introduced.

Authentication, tokens, sessions, permissions, Git authorization, and repository access are treated as security boundaries.

## Fail Fast

Invalid configuration or unavailable critical dependencies should be detected as early as possible.

## Safe Errors

Clients receive stable API contracts.

Detailed internal failures remain on the server side.

## Test Important Behavior

Tests exist to protect behavior and security guarantees, not simply to increase a test counter.

## Real Git Compatibility

GitZone should work with standard Git tooling wherever possible.

A developer should eventually be able to interact with GitZone using normal commands such as:

```bash
git clone
git fetch
git pull
git push
```

## Incremental Verification

Each major change follows the general workflow:

```text
Design
  ↓
Implementation
  ↓
Tests
  ↓
Typecheck
  ↓
Lint
  ↓
Full Test Suite
  ↓
Build
  ↓
Runtime Verification
  ↓
Commit
  ↓
Push
```

---

# Phase 2 — Authentication & Sessions

With the Core Platform Foundation complete, active development continues with authentication and account security.

A significant portion of the authentication/session infrastructure is already implemented.

The next major security feature is:

## TOTP Two-Factor Authentication

Planned functionality includes:

- TOTP setup
- QR-code enrollment
- Authenticator application support
- Six-digit verification codes
- Encrypted 2FA secret storage
- Recovery codes
- Recovery-code consumption
- Recovery-code regeneration
- 2FA login challenge
- Enable/disable flows
- Rate limiting
- Security event handling
- Unit tests
- Integration tests
- Postman verification

Compatible authenticator applications are expected to include standard TOTP clients such as Google Authenticator, Microsoft Authenticator, Authy, and other RFC-compatible applications.

Passkeys/WebAuthn are planned separately and are not part of the initial TOTP implementation.

---

# Long-Term Vision

GitZone is intended to grow beyond repository hosting.

Future phases are expected to introduce areas such as:

```text
Repository Management
        ↓
Branches & Commits
        ↓
Pull Requests
        ↓
Code Review
        ↓
Issues
        ↓
Organizations & Teams
        ↓
Notifications
        ↓
Webhooks
        ↓
Releases
        ↓
CI/CD
        ↓
GitZone CLI
        ↓
Production Infrastructure
        ↓
Monitoring & Security Hardening
```

The objective is to build these capabilities on top of a foundation that has already been tested for predictable startup, shutdown, configuration, security boundaries, database availability, and error handling.

---

# Current Milestone

```text
GitZone
│
├── Phase 1 — Core Platform Foundation
│      └── ✅ 100% COMPLETE
│
├── Phase 2 — Authentication & Sessions
│      └── 🚧 IN PROGRESS
│
└── Future Platform Features
       └── ⏳ PLANNED
```

Phase 1 was closed only after:

**218 automated tests passed, the production build succeeded, static quality checks passed, and the running API passed manual Postman/runtime verification.**

---

<div align="center">

## GitZone

**Building a real Git hosting platform from the ground up.**

</div>
