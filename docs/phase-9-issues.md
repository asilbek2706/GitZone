# Phase 9 - Issues

## Overview

Phase 9 introduces a backend issue-tracking system for GitZone, allowing repository users to create and manage issues, add comments, and assign collaborators.

**Technology Stack:** Node.js, Express, TypeScript, Prisma, PostgreSQL, Zod, and Vitest.

**Status:** COMPLETE

## Implemented Features

### Issue Management

- Create repository issues.
- Generate unique, repository-scoped issue numbers.
- Support concurrent issue creation using atomic database operations.
- List issues with pagination and state filtering.
- Retrieve individual issues by number.
- Update issue titles and descriptions.
- Close and reopen issues.
- Track issue closure using `closedAt`.

### Issue Comments

- Create comments on issues.
- List comments with pagination.
- Edit existing comments.
- Delete comments.
- Validate comment content.
- Enforce comment ownership and repository permissions.

### Issue Assignees

- Assign repository owners or collaborators to issues.
- List current issue assignees.
- Remove issue assignees.
- Reject duplicate assignments.
- Reject users who are not eligible for assignment.
- Enforce repository WRITE permissions for assignment changes.

## Authentication and Authorization

| Operation              | Required Permission                                             |
| ---------------------- | --------------------------------------------------------------- |
| List issues            | Repository READ                                                 |
| View issue             | Repository READ                                                 |
| Create issue           | Repository WRITE                                                |
| Update issue           | Repository WRITE                                                |
| Close or reopen issue  | Repository WRITE                                                |
| List comments          | Repository READ                                                 |
| Create comment         | Repository WRITE                                                |
| Edit or delete comment | Comment author or repository owner, with repository READ access |
| List assignees         | Repository READ                                                 |
| Add assignee           | Repository WRITE                                                |
| Remove assignee        | Repository WRITE                                                |

Public repository reads support optional authentication. Private repository data requires appropriate authorization.

## Issues API

Base endpoint:

`/api/repositories/:username/:name/issues`

| Method | Endpoint   | Description  |
| ------ | ---------- | ------------ |
| POST   | `/`        | Create issue |
| GET    | `/`        | List issues  |
| GET    | `/:number` | Get issue    |
| PATCH  | `/:number` | Update issue |

### Create Issue

**POST** `/api/repositories/asil/demo/issues`

Request:

```json
{
  "title": "Fix authentication redirect",
  "body": "The login page does not redirect after successful authentication."
}
```

Successful response: HTTP 201 with the created issue in `data.issue`.

### List Issues

**GET** `/api/repositories/asil/demo/issues?state=OPEN&page=1&limit=20`

Supported query parameters:

| Parameter | Allowed Values   | Default   |
| --------- | ---------------- | --------- |
| `state`   | `OPEN`, `CLOSED` | No filter |
| `page`    | 1–100000         | 1         |
| `limit`   | 1–100            | 20        |

### Get Issue

**GET** `/api/repositories/asil/demo/issues/1`

Returns a single issue.

### Update Issue

**PATCH** `/api/repositories/asil/demo/issues/1`

Request:

```json
{
  "title": "Fix login redirect",
  "state": "CLOSED"
}
```

At least one of `title`, `body`, or `state` is required.

Use `CLOSED` to close an issue and `OPEN` to reopen it.

## Issue Comments API

Base endpoint:

`/api/repositories/:username/:name/issues/:number/comments`

| Method | Endpoint      | Description    |
| ------ | ------------- | -------------- |
| POST   | `/`           | Create comment |
| GET    | `/`           | List comments  |
| PATCH  | `/:commentId` | Update comment |
| DELETE | `/:commentId` | Delete comment |

### Create Comment

**POST** `/api/repositories/asil/demo/issues/1/comments`

Request:

```json
{
  "body": "I can reproduce this issue."
}
```

Successful response: HTTP 201.

### List Comments

**GET** `/api/repositories/asil/demo/issues/1/comments?page=1&limit=20`

Returns paginated issue comments.

### Update Comment

**PATCH** `/api/repositories/asil/demo/issues/1/comments/:commentId`

Request:

```json
{
  "body": "Updated comment content."
}
```

### Delete Comment

**DELETE** `/api/repositories/asil/demo/issues/1/comments/:commentId`

Deletes the comment when the requester has sufficient permissions.

## Issue Assignees API

Base endpoint:

`/api/repositories/:username/:name/issues/:number/assignees`

| Method | Endpoint             | Description     |
| ------ | -------------------- | --------------- |
| POST   | `/`                  | Add assignee    |
| GET    | `/`                  | List assignees  |
| DELETE | `/:assigneeUsername` | Remove assignee |

### Add Assignee

**POST** `/api/repositories/asil/demo/issues/1/assignees`

Request:

```json
{
  "username": "developer"
}
```

Successful response: HTTP 201.

Only the repository owner or an existing collaborator can be assigned.

### List Assignees

**GET** `/api/repositories/asil/demo/issues/1/assignees`

Returns all current issue assignees.

### Remove Assignee

**DELETE** `/api/repositories/asil/demo/issues/1/assignees/developer`

Successful response:

```json
{
  "success": true,
  "data": {
    "deleted": true
  }
}
```

## Input Validation

All issue-related requests use Zod validation.

### Issue Validation

- Title: 1–256 characters after trimming.
- Body: optional or nullable; maximum 10,000 characters.
- State: `OPEN` or `CLOSED`.
- Issue number: positive safe integer.
- Update: at least one supported field.
- Unknown fields in creation and update payloads are rejected.

### Comment Validation

- Comment body must not be empty.
- Maximum body length: 10,000 characters.
- Invalid creation and update payloads are rejected.

### Assignee Validation

- Username: 1–100 characters after trimming.
- Unknown assignment fields are rejected.
- Duplicate assignments are rejected.
- Assignees must be repository owners or collaborators.

## Error Handling

| HTTP | Error Code                        | Description                 |
| ---- | --------------------------------- | --------------------------- |
| 400  | `INVALID_ISSUE_DATA`              | Invalid issue creation data |
| 400  | `INVALID_ISSUE_QUERY`             | Invalid issue list query    |
| 400  | `INVALID_ISSUE_NUMBER`            | Invalid issue number        |
| 400  | `INVALID_ISSUE_UPDATE`            | Invalid issue update        |
| 400  | `INVALID_ISSUE_COMMENT_DATA`      | Invalid comment creation    |
| 400  | `INVALID_ISSUE_COMMENT_UPDATE`    | Invalid comment update      |
| 400  | `INVALID_ISSUE_COMMENTS_QUERY`    | Invalid comment pagination  |
| 400  | `INVALID_ISSUE_ASSIGNEE_DATA`     | Invalid assignment payload  |
| 400  | `INVALID_ISSUE_ASSIGNEE_USERNAME` | Invalid assignee username   |
| 403  | `ISSUE_COMMENT_ACCESS_DENIED`     | Comment modification denied |
| 403  | `ISSUE_ASSIGNEE_NOT_ELIGIBLE`     | User is not eligible        |
| 404  | `REPOSITORY_NOT_FOUND`            | Repository not found        |
| 404  | `ISSUE_NOT_FOUND`                 | Issue not found             |
| 404  | `ISSUE_COMMENT_NOT_FOUND`         | Comment not found           |
| 404  | `ISSUE_ASSIGNEE_USER_NOT_FOUND`   | User not found              |
| 404  | `ISSUE_ASSIGNEE_NOT_FOUND`        | Assignment not found        |
| 409  | `ISSUE_ASSIGNEE_ALREADY_EXISTS`   | Duplicate assignment        |

Authentication and repository authorization may produce additional errors.

## Database Architecture

Phase 9 introduces four Prisma models.

### RepositoryIssueCounter

- `repositoryId`
- `nextNumber`

Maintains atomic, repository-specific issue numbering.

### Issue

- `id`
- `repositoryId`
- `number`
- `creatorId`
- `title`
- `body`
- `state`
- `closedAt`
- `createdAt`
- `updatedAt`

A unique constraint on `(repositoryId, number)` prevents duplicate issue numbers.

### IssueComment

- `id`
- `issueId`
- `authorId`
- `body`
- `createdAt`
- `updatedAt`

Stores comments associated with repository issues.

### IssueAssignee

- `issueId`
- `userId`
- `assignedAt`

The composite primary key `(issueId, userId)` prevents duplicate assignments.

### Database Migration

Migration:

`20261008045104_add_issues`

Verification:

- PostgreSQL migration applied.
- 15 migrations found.
- Database schema is up to date.

## Testing and Verification

### Phase 9 Automated Tests

| Test Category               | Passed |
| --------------------------- | -----: |
| Issue CRUD unit             |      8 |
| Issue Comments unit         |     10 |
| Issue Assignees unit        |     12 |
| Issue CRUD integration      |     10 |
| Issue Comments integration  |     10 |
| Issue Assignees integration |     10 |
| **Total**                   | **60** |

### Real HTTP End-to-End Verification

Verified scenarios:

- Issue creation, retrieval, updating, closing, and reopening.
- Issue listing and state filtering.
- Concurrent issue creation with unique numbering.
- Comment creation, listing, editing, and deletion.
- Assignee addition, listing, and removal.
- Duplicate assignment rejection.
- Invalid request validation.
- Repository owner permissions.
- READ collaborator permissions.
- WRITE collaborator permissions.
- Ineligible assignee rejection.

### Full Backend Quality Gate

- **73 test files passed.**
- **798 automated tests passed.**
- Source TypeScript check passed.
- Test TypeScript check passed.
- ESLint passed.
- Production build passed.
- Prisma migration status passed.
- Git diff check passed.

## Security

- Repository authorization is enforced at the service layer.
- Private repository data remains protected.
- Mutation endpoints require authentication.
- Request payloads are validated.
- Duplicate assignees are prevented by database constraints.
- Comment ownership is enforced.
- Issue numbering is protected against concurrency conflicts.

## Scope

Phase 9 implements backend issue tracking, comments, assignees, database models, API endpoints, and automated tests.

Frontend issue management interfaces are outside the scope of this phase.

## Final Status

**Phase 9 Backend: COMPLETE**

**Phase 9 Tests: 60/60 PASSED**

**Full Backend Tests: 798/798 PASSED**

**Database: UP TO DATE**

**Git Commit and Push: PENDING**
