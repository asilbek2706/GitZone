# GitZone Engineering Setup Guide

> Complete local development environment setup for the GitZone platform.

---

## 1. Overview

GitZone is an independent Git hosting and developer collaboration platform.

Unlike a conventional CRUD web application, GitZone combines several systems:

- REST API
- authentication and session management
- Personal Access Token authentication
- PostgreSQL persistence
- Prisma ORM
- filesystem-backed bare Git repositories
- Git Smart HTTP
- repository authorization
- structured logging
- health and readiness monitoring
- automated unit and integration testing

A working GitZone development environment therefore requires both a normal Node.js application environment and a functional Git server environment.

---

## 2. Current Development Environment

The currently validated development environment uses:

| Component | Validated version |
|---|---:|
| Node.js | 22.22.3 |
| npm | 12.0.2 |
| TypeScript | 5.9.3 |
| PostgreSQL | 16.15 |
| Git | 2.43.0 |
| Prisma | 7.10.0 |
| Vitest | 5.0.0 |
| Express | 5.2.1 |

These versions represent the environment against which the current backend has been linted, type-checked, tested, and built successfully.

They should not automatically be interpreted as permanent minimum supported versions.

---

## 3. System Architecture

At development time, the backend can be viewed as two major request paths.

### REST request path

```text
Client
  │
  ▼
Express
  │
  ├── Request ID
  ├── Helmet
  ├── CORS
  ├── Body parsing
  ├── Authentication
  ├── Validation
  │
  ▼
Application modules
  │
  ▼
Prisma
  │
  ▼
PostgreSQL
```

### Git request path

```text
Git CLI
  │
  │ Git Smart HTTP
  ▼
Express
  │
  ├── Repository lookup
  ├── Request classification
  │     ├── READ
  │     └── WRITE
  ├── PAT authentication when required
  ├── Repository authorization
  │
  ▼
git-http-backend
  │
  ▼
Bare Git repository
```

Git requests intentionally follow a different path from normal JSON REST requests because Git protocol payloads must remain binary-safe.

---

## 4. Repository Layout

The high-level project structure is:

```text
gitzone/
├── client/
├── server/
│   ├── prisma/
│   │   ├── migrations/
│   │   └── schema.prisma
│   │
│   ├── src/
│   │   ├── config/
│   │   ├── errors/
│   │   ├── generated/
│   │   ├── middleware/
│   │   ├── modules/
│   │   ├── app.ts
│   │   ├── server.lifecycle.ts
│   │   └── server.ts
│   │
│   ├── storage/
│   │   └── repositories/
│   │
│   ├── tests/
│   │   ├── integration/
│   │   └── unit/
│   │
│   ├── .env.example
│   ├── eslint.config.js
│   ├── package.json
│   ├── prisma7.config.ts
│   └── tsconfig.json
│
├── docs/
└── README.md
```

---

## 5. Required Software

Before starting GitZone locally, install:

1. Git
2. Node.js
3. npm
4. PostgreSQL
5. PostgreSQL client tools

The Git Smart HTTP implementation also currently expects the Git HTTP backend executable to exist at:

```text
/usr/lib/git-core/git-http-backend
```

This path is currently used by the backend implementation.

### Verify the environment

Run:

```bash
node --version
npm --version
git --version
psql --version
```

You can also verify the Git HTTP backend:

```bash
test -x /usr/lib/git-core/git-http-backend && echo "git-http-backend available"
```

If no output is produced, inspect the Git installation before testing Git Smart HTTP.

---

## 6. Clone and Enter the Project

Clone the GitZone source repository and enter it:

```bash
git clone <GitZone-source-repository-url>
cd gitzone
```

The source repository currently contains two primary applications:

```text
client/
server/
```

This document focuses primarily on the backend foundation.

---

## 7. Backend Dependency Installation

Enter the backend:

```bash
cd server
```

Install dependencies:

```bash
npm install
```

The lockfile should be kept under version control to make dependency resolution reproducible.

Do not casually use:

```bash
npm audit fix --force
```

on the GitZone codebase.

Forced dependency changes may introduce breaking major-version changes.

Security findings should be reviewed before modifying the dependency graph.

---

## 8. PostgreSQL Setup

GitZone currently uses PostgreSQL through Prisma.

The current local development database is named:

```text
github_clone
```

The existing local role is:

```text
github_user
```

The historical database name does not define the product name. The application itself is GitZone.

A future migration may rename development infrastructure identifiers where appropriate.

### Enter PostgreSQL

On Ubuntu, an administrator can typically open PostgreSQL with:

```bash
sudo -u postgres psql
```

### Example database bootstrap

A fresh development environment can use a dedicated role and database.

Example:

```sql
CREATE USER github_user WITH PASSWORD 'replace_with_a_strong_local_password';
CREATE DATABASE github_clone OWNER github_user;
```

Exit PostgreSQL:

```sql
\q
```

Do not commit real database passwords.

---

## 9. Environment Configuration

GitZone validates application configuration during startup.

Create the local environment file from the example:

```bash
cp .env.example .env
```

The current configuration surface is:

```env
PORT=5000
NODE_ENV=development

CORS_ORIGIN="http://localhost:5173"

DATABASE_URL="postgresql://github_user:YOUR_PASSWORD@localhost:5432/github_clone"

JWT_ACCESS_SECRET="your_access_secret"
JWT_REFRESH_SECRET="your_refresh_secret"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

GIT_STORAGE_PATH="./storage/repositories"

BODY_LIMIT="1mb"

TRUST_PROXY="false"
```

Replace placeholder secrets before starting the application.

---

## 10. Environment Variable Reference

### `NODE_ENV`

Allowed values:

```text
development
test
production
```

Default:

```text
development
```

The environment affects runtime behavior such as logging.

---

### `PORT`

HTTP server port.

Default:

```text
5000
```

Valid range:

```text
1 - 65535
```

Example:

```env
PORT=5000
```

---

### `CORS_ORIGIN`

Browser origin allowed by the current CORS configuration.

Development example:

```env
CORS_ORIGIN="http://localhost:5173"
```

The value must be a valid URL.

Production deployments must replace the development origin with the actual frontend origin.

---

### `TRUST_PROXY`

Controls whether GitZone accepts reverse-proxy forwarding semantics.

Allowed values:

```text
true
false
```

Default:

```text
false
```

Development should normally keep this disabled unless a reverse proxy is intentionally being tested.

Production deployments behind Nginx require deliberate proxy configuration. Do not enable proxy trust without understanding the network topology and forwarded-header behavior.

---

### `BODY_LIMIT`

Maximum body size accepted by Express JSON and URL-encoded parsers.

Default:

```text
1mb
```

Example:

```env
BODY_LIMIT="1mb"
```

Accepted values follow size formats such as:

```text
100kb
1mb
10mb
```

Git Smart HTTP traffic is not handled as ordinary JSON request bodies.

---

### `DATABASE_URL`

PostgreSQL connection string used by the application.

Example:

```env
DATABASE_URL="postgresql://github_user:password@localhost:5432/github_clone"
```

This variable is required.

Never commit production credentials.

---

### `JWT_ACCESS_SECRET`

Secret used for access-token signing and verification.

Required.

Use a strong random value outside development.

---

### `JWT_REFRESH_SECRET`

Secret used for refresh-token operations.

Required.

It should not simply duplicate the access-token secret.

---

### `JWT_ACCESS_EXPIRES_IN`

Access-token lifetime.

Current development example:

```env
JWT_ACCESS_EXPIRES_IN="15m"
```

---

### `JWT_REFRESH_EXPIRES_IN`

Refresh-token lifetime.

Current development example:

```env
JWT_REFRESH_EXPIRES_IN="7d"
```

---

### `GIT_STORAGE_PATH`

Filesystem root for Git repositories.

Current default development configuration:

```env
GIT_STORAGE_PATH="./storage/repositories"
```

The application resolves this path relative to the server process working directory.

For the standard development workflow, start the server from:

```text
gitzone/server
```

---

## 11. Secret Generation

Development secrets should still be sufficiently random.

One option with Node.js:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

Generate separate values for:

```text
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
```

Production secrets must be managed through an appropriate secret-management mechanism rather than committed source files.

---

## 12. Prisma Configuration

GitZone currently uses:

```text
server/prisma7.config.ts
```

The configuration points Prisma at:

```text
prisma/schema.prisma
```

and migration files at:

```text
prisma/migrations/
```

The datasource URL comes from:

```text
DATABASE_URL
```

The Prisma schema uses:

```prisma
datasource db {
  provider = "postgresql"
}
```

The generated client is written to:

```text
src/generated/prisma
```

---

## 13. Database Models

The current schema contains the following core models:

```text
User
Session
PersonalAccessToken
Repository
RepositoryCollaborator
```

It also defines:

```text
RepositoryPermission
├── READ
└── WRITE
```

These models form the current authentication, repository, token, and authorization foundation.

Later platform phases will expand the schema for pull requests, issues, comments, organizations, notifications, releases, CI/CD, and other GitZone capabilities.

---

## 14. Database Migrations

The current project contains six Prisma migrations.

Check migration state with:

```bash
npx prisma migrate status --config prisma7.config.ts
```

A correctly synchronized development database should report:

```text
Database schema is up to date!
```

### Apply existing migrations

For an environment that should apply committed migrations without creating a new migration:

```bash
npx prisma migrate deploy --config prisma7.config.ts
```

### Schema development

When intentionally changing the Prisma schema during development, create a named migration using the project's Prisma configuration.

Example:

```bash
npx prisma migrate dev --name describe_the_change --config prisma7.config.ts
```

Migration files must be reviewed before committing.

Do not edit an already-applied migration casually. Schema changes should normally be represented by a new migration.

---

## 15. Prisma Client Generation

Generate the Prisma client when required:

```bash
npx prisma generate --config prisma7.config.ts
```

Generated application code is configured under:

```text
src/generated/prisma
```

The generated directory is not intended to be manually edited.

---

## 16. Git Repository Storage

GitZone does not store Git objects inside PostgreSQL.

PostgreSQL stores platform metadata such as:

- users
- repository records
- repository visibility
- ownership
- collaborators
- permissions

Actual Git object databases live on the filesystem as bare repositories.

The configured root is:

```text
server/storage/repositories/
```

A repository owned by `alice` and named `demo` is represented conceptually as:

```text
storage/
└── repositories/
    └── alice/
        └── demo.git/
```

This is a bare Git repository, not a normal working tree.

---

## 17. Bare Repository Creation

When a GitZone repository is created, the backend creates its Git repository using the equivalent of:

```bash
git init --bare --initial-branch=main <repository-path>
```

The repository is also configured with:

```bash
git --git-dir <repository-path> config http.receivepack true
```

This enables receive-pack support required by Smart HTTP push operations.

Repository creation therefore has two distinct persistence layers:

```text
Repository creation
       │
       ├── PostgreSQL metadata
       │
       └── Bare Git repository
```

If bare repository creation fails after the database record has been created, the service removes the newly created database repository record so the system does not knowingly leave a successful metadata record without its Git repository.

---

## 18. Repository Rename and Delete

Repository rename affects both metadata and Git filesystem state.

Conceptually:

```text
alice/old-name.git
        │
        ▼
alice/new-name.git
```

Repository deletion removes the bare Git repository and then deletes the database repository record.

This coupling is important when debugging repository lifecycle failures.

Do not manually rename or delete directories inside Git storage while the corresponding repository exists in PostgreSQL.

---

## 19. Git Smart HTTP

GitZone currently exposes repositories through Git Smart HTTP.

The backend uses:

```text
/usr/lib/git-core/git-http-backend
```

rather than reimplementing Git's wire protocol in application code.

Express is responsible for platform-level concerns:

```text
HTTP request
    │
    ▼
Repository lookup
    │
    ▼
Determine READ / WRITE
    │
    ▼
Authentication when required
    │
    ▼
Authorization
    │
    ▼
git-http-backend
    │
    ▼
Bare repository
```

---

## 20. Git HTTP CGI Environment

The application starts `git-http-backend` with CGI-style environment information including:

```text
GIT_PROJECT_ROOT
GIT_HTTP_EXPORT_ALL
PATH_INFO
REQUEST_METHOD
QUERY_STRING
CONTENT_TYPE
CONTENT_LENGTH
REMOTE_USER
```

`GIT_PROJECT_ROOT` is derived from:

```text
GIT_STORAGE_PATH
```

`GIT_HTTP_EXPORT_ALL=1` allows repositories under the project root to be exported without requiring individual `git-daemon-export-ok` files.

Access is still controlled by the GitZone application before the request reaches the Git backend.

---

## 21. Git Authentication Rules

GitZone distinguishes Git reads and writes.

A request involving:

```text
git-receive-pack
```

is treated as a write operation.

Typical write operation:

```text
git push
```

Read operations include Git upload-pack based operations such as:

```text
git clone
git fetch
git pull
```

### Current access behavior

Conceptually:

| Repository | Operation | Authentication |
|---|---|---|
| Public | Read | Anonymous allowed |
| Public | Write | Required |
| Private | Read | Required |
| Private | Write | Required |

Authenticated Git operations use a GitZone Personal Access Token.

Repository authorization then determines whether the authenticated user has the required access.

---

## 22. Personal Access Tokens for Git

Protected Git operations use HTTP Basic authentication.

Conceptually:

```text
username = GitZone username
password = GitZone Personal Access Token
```

The Personal Access Token should be treated as a password.

Never:

- commit a PAT
- place a PAT in documentation
- paste a PAT into issue reports
- store a PAT in shell history unnecessarily
- embed a PAT directly into a repository URL for examples

GitZone stores token verification material rather than relying on the raw PAT after creation.

---

## 23. Starting the Development Server

From:

```text
gitzone/server
```

run:

```bash
npm run dev
```

The development script currently uses:

```text
tsx watch src/server.ts
```

With the default configuration, the backend listens on:

```text
http://localhost:5000
```

---

## 24. Health Endpoints

GitZone provides multiple operational health endpoints.

### General health

```text
GET /api/health
```

Expected healthy status:

```text
200
```

---

### Liveness

```text
GET /api/health/live
```

Liveness answers whether the application process is alive.

This is suitable for process/container supervision.

---

### Readiness

```text
GET /api/health/ready
```

Readiness also checks database connectivity.

Healthy response:

```text
200
```

If PostgreSQL cannot be reached, readiness returns:

```text
503
```

This distinction is important for future Docker, Nginx, orchestration, and deployment environments.

---

## 25. Manual Health Verification

With the development server running:

```bash
curl http://localhost:5000/api/health
curl http://localhost:5000/api/health/live
curl http://localhost:5000/api/health/ready
```

Readiness should only report success when PostgreSQL is available.

---

## 26. Development Quality Gates

Before considering a backend change complete, run:

```bash
npm run lint
npm run typecheck
npm run typecheck:tests
npm test
npm run build
```

These commands validate different properties.

### ESLint

```bash
npm run lint
```

Checks source and test code for configured code-quality violations.

### Source typecheck

```bash
npm run typecheck
```

Runs TypeScript without emitting build output.

### Test typecheck

```bash
npm run typecheck:tests
```

Type-checks the test environment using its dedicated TypeScript configuration.

### Automated tests

```bash
npm test
```

Runs the Vitest test suite.

At the time this document was introduced, the validated backend baseline was:

```text
16 test files
158 tests
158 passing
```

The number is expected to grow as GitZone evolves.

A future increase in test count is not itself a quality target; important behavior and regressions should be covered.

### Production build

```bash
npm run build
```

Compiles TypeScript into:

```text
dist/
```

---

## 27. Running the Production Build Locally

Build:

```bash
npm run build
```

Then start:

```bash
npm start
```

The start command runs:

```text
node dist/server.js
```

This is useful for verifying that development-only tooling is not hiding build/runtime problems.

---

## 28. Logging

GitZone uses structured logging through Pino.

Runtime logs include contextual information for important server and Git operations.

Sensitive authentication material must not be logged.

In particular, logs should never expose:

- raw JWTs
- refresh tokens
- PAT values
- passwords
- Authorization headers
- database passwords

The test environment suppresses normal application logging to keep automated test output clean.

---

## 29. Request IDs

HTTP requests pass through request-ID middleware.

Request identifiers improve traceability across:

```text
client request
    │
    ▼
Express middleware
    │
    ▼
application logs
    │
    ▼
error investigation
```

Future distributed services should preserve or propagate correlation identifiers where appropriate.

---

## 30. Error Handling

GitZone uses a shared application error abstraction for expected application failures.

Examples include:

```text
REPOSITORY_NOT_FOUND
REPOSITORY_FORBIDDEN
GIT_AUTH_REQUIRED
GIT_REPOSITORY_CREATE_FAILED
```

The global error layer also handles baseline HTTP failures such as:

- malformed JSON
- payloads exceeding configured limits
- unknown routes
- unexpected internal errors

Unexpected errors should not expose internal stack traces or secrets to API clients.

---

## 31. Graceful Shutdown

The backend registers process handlers for:

```text
SIGINT
SIGTERM
uncaughtException
unhandledRejection
```

Graceful shutdown attempts to:

1. stop accepting new server connections
2. allow server closure
3. disconnect Prisma
4. exit with the appropriate status

A shutdown timeout prevents the process from hanging indefinitely.

This behavior is especially important for future container deployments.

---

## 32. CORS

Development currently expects the frontend origin configured by:

```env
CORS_ORIGIN="http://localhost:5173"
```

Credentials are enabled in the CORS configuration.

Production deployments must explicitly configure the actual frontend origin.

CORS is a browser security mechanism and must not be treated as an authorization system.

Repository and API authorization must remain enforced by the backend.

---

## 33. Reverse Proxy Configuration

By default:

```env
TRUST_PROXY="false"
```

When GitZone is deployed behind Nginx or another trusted reverse proxy, proxy behavior must be configured intentionally.

The application currently maps enabled proxy trust to a single proxy hop.

Do not enable it merely because the application is running in production.

The actual deployment topology must justify the setting.

---

## 34. Git Smart HTTP Troubleshooting

### `git-http-backend` not found

Check:

```bash
ls -l /usr/lib/git-core/git-http-backend
```

and:

```bash
git --exec-path
```

The current application expects:

```text
/usr/lib/git-core/git-http-backend
```

If the executable is installed elsewhere, the backend implementation or environment strategy will need to be adjusted.

---

### Repository exists in PostgreSQL but Git operations fail

Check the configured storage:

```bash
ls -la storage/repositories
```

Then inspect the owner directory.

The expected physical form is:

```text
storage/repositories/<username>/<repository>.git
```

Do not create fake directories as a substitute for repository creation through GitZone.

---

### Push fails

Verify:

1. repository exists
2. bare repository exists
3. PAT is valid
4. username matches the PAT owner
5. user has WRITE permission
6. repository has receive-pack enabled
7. Git HTTP backend is executable

For a bare repository, receive-pack configuration can be inspected with:

```bash
git --git-dir storage/repositories/<username>/<repository>.git config --get http.receivepack
```

Expected value:

```text
true
```

---

### Private clone fails

Verify:

1. the repository is actually private
2. Basic authentication is being supplied by Git
3. the username is correct
4. the PAT is valid
5. the authenticated user has READ or sufficient repository access

Do not disable authorization to work around authentication problems.

---

### Database readiness fails

Run:

```bash
npx prisma migrate status --config prisma7.config.ts
```

Then verify PostgreSQL directly:

```bash
psql "$DATABASE_URL"
```

If the shell does not contain `DATABASE_URL`, use the connection information from the local `.env` without exposing credentials in shared output.

---

## 35. Dependency Security Audit

Run:

```bash
npm audit
```

This reports known vulnerabilities in the installed npm dependency graph.

It does not modify packages.

At the time of this setup documentation, the dependency tree reported high-severity findings inherited through Prisma tooling, including transitive dependencies involving:

```text
deepmerge-ts
mysql2
```

The application uses PostgreSQL rather than MySQL, but transitive tooling dependencies may still appear in npm audit reports.

Do not blindly run:

```bash
npm audit fix --force
```

The reported automatic remediation may introduce breaking dependency changes.

Audit findings should be:

1. identified
2. traced to the direct dependency
3. assessed for actual runtime exposure
4. checked for an upstream fixed version
5. upgraded deliberately
6. followed by the full quality gate

---

## 36. Git Storage Safety

The Git storage directory is application data.

Do not commit actual bare repositories to the GitZone source repository.

Do not manually manipulate production repository storage unless performing a documented recovery or administrative procedure.

Future production architecture will require dedicated considerations for:

- persistent volumes
- backups
- replication
- repository integrity
- storage quotas
- disaster recovery
- object maintenance
- garbage collection
- horizontal scaling

---

## 37. Development Workflow

A normal backend change should follow this sequence:

```text
Understand requirement
       │
       ▼
Inspect existing implementation
       │
       ▼
Implement one logical change
       │
       ▼
Add/update relevant tests
       │
       ▼
Lint
       │
       ▼
Typecheck
       │
       ▼
Run targeted tests
       │
       ▼
Run full test suite
       │
       ▼
Build
       │
       ▼
Manual/Postman/Git verification when relevant
       │
       ▼
Commit
       │
       ▼
Push
```

Keep commits focused on one logical change whenever practical.

---

## 38. What Not to Commit

Never commit:

```text
.env
production secrets
database passwords
raw PATs
JWTs
refresh tokens
real repository storage
node_modules/
dist/
coverage/
temporary logs
```

The repository `.gitignore` is part of the safety boundary, but developers remain responsible for reviewing staged files before committing.

---

## 39. Recommended Pre-Commit Verification

Before committing backend changes:

```bash
git status
npm run lint
npm run typecheck
npm run typecheck:tests
npm test
npm run build
git status
```

Review the exact files being committed.

Avoid staging unrelated work into the same commit.

---

## 40. Production Considerations

The current setup is primarily a development foundation.

A production GitZone deployment will additionally require:

- hardened Nginx configuration
- TLS/HTTPS
- production CORS origin
- secure secret storage
- controlled proxy trust
- database backups
- Git repository backups
- persistent Git storage
- process/container supervision
- rate limiting
- security headers review
- dependency monitoring
- centralized logs
- metrics
- tracing/observability
- resource limits
- worker infrastructure
- queues
- disaster recovery procedures
- CI/CD
- automated E2E verification

These concerns are handled in later GitZone phases rather than being silently assumed by the local development configuration.

---

## 41. Current Foundation Validation

The backend foundation has been validated with:

```text
ESLint                 PASS
Source TypeScript      PASS
Test TypeScript        PASS
Vitest                 158 / 158 PASS
Production TypeScript  PASS
PostgreSQL migrations  UP TO DATE
```

This baseline should remain green as new platform features are introduced.

---

## 42. Related Documentation

The GitZone documentation set is intended to expand into:

```text
docs/
├── README.md
├── SETUP.md
├── ARCHITECTURE.md
├── DEVELOPMENT.md
├── CONFIGURATION.md
├── DATABASE.md
├── AUTHENTICATION.md
├── GIT-TRANSPORT.md
├── SECURITY.md
├── TESTING.md
├── API.md
├── OPERATIONS.md
└── ROADMAP.md
```

`SETUP.md` is the environment/bootstrap document.

Detailed subsystem behavior belongs in the specialized documents rather than allowing this setup guide to become the only source of technical knowledge.

---

## 43. Setup Completion Checklist

A local backend environment can be considered correctly bootstrapped when all of the following are true:

- [ ] Node.js is installed
- [ ] npm is installed
- [ ] Git is installed
- [ ] `git-http-backend` is available
- [ ] PostgreSQL is running
- [ ] development database exists
- [ ] database role has access
- [ ] `.env` exists locally
- [ ] required secrets are configured
- [ ] dependencies are installed
- [ ] Prisma migrations are up to date
- [ ] Prisma Client can be generated
- [ ] Git storage path is writable
- [ ] server starts successfully
- [ ] `/api/health` returns success
- [ ] `/api/health/live` returns success
- [ ] `/api/health/ready` returns success
- [ ] ESLint passes
- [ ] source typecheck passes
- [ ] test typecheck passes
- [ ] automated tests pass
- [ ] production build succeeds
- [ ] Git Smart HTTP can be exercised successfully for the intended access level

Once this checklist is satisfied, the environment is ready for GitZone backend development.
