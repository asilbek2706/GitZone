# GitZone

GitZone is an independent Git hosting and collaboration platform built from scratch.

The long-term goal is to provide a complete developer platform with native Git operations, repository management, collaboration tools, pull requests, issues, organizations, CI/CD, releases, notifications, and a dedicated GitZone CLI.

## Technology Stack

### Frontend

- React
- TypeScript
- Vite
- SCSS
- Redux Toolkit

### Backend

- Node.js
- Express
- TypeScript
- PostgreSQL
- Prisma

### Infrastructure

- Docker
- Nginx

## Current Capabilities

The backend currently includes:

- User authentication
- JWT-based authentication
- Personal Access Tokens (PAT)
- Repository creation and management
- Public and private repositories
- Repository collaborators
- Read and write permissions
- Git Smart HTTP
- Native Git clone, fetch, pull, and push operations
- Structured application logging
- Request IDs
- Global error handling
- Health, liveness, and readiness endpoints
- Graceful server shutdown
- Environment validation
- CORS and reverse-proxy configuration
- Unit and integration testing

## Project Structure

```text
gitzone/
├── client/        # React frontend
├── server/        # Node.js / Express backend
├── docs/          # Project documentation
└── README.md
```
