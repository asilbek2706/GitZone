# Phase 7 — Pull Requests

## Status

Phase 7 is complete.

Implemented and verified:

- Pull request persistence with Prisma and PostgreSQL
- Repository-scoped pull request numbering
- Pull request creation, listing, retrieval, and updates
- OPEN, CLOSED, and MERGED states
- Source and target branch validation
- Duplicate active pull request protection
- Pull request commit calculation
- Pull request diff calculation
- Mergeability checks
- Real Git merge commits
- Atomic target branch updates
- Authorization and permission enforcement
- Transaction safety and Git rollback handling
- Unit and integration tests
- Real HTTP, PostgreSQL, and bare Git E2E verification

## Data Model

The PullRequest model belongs to a Repository and stores:

- repository-scoped number
- author
- title and optional description
- source branch
- target branch
- state
- merge timestamp
- merging user
- merge commit SHA
- created and updated timestamps

The database enforces a unique constraint on repositoryId and number.
Indexes support state and branch-pair lookups.

## Pull Request Numbering

Pull request numbers are scoped to each repository.
Creation runs inside a Prisma transaction and uses a PostgreSQL advisory lock.
The next number is calculated from the current maximum pull request number.

This prevents concurrent requests from allocating the same pull request number.

## API

The Phase 7 repository API provides:

- POST /api/repositories/:username/:name/pulls
- GET /api/repositories/:username/:name/pulls
- GET /api/repositories/:username/:name/pulls/:number
- PATCH /api/repositories/:username/:name/pulls/:number
- GET /api/repositories/:username/:name/pulls/:number/commits
- GET /api/repositories/:username/:name/pulls/:number/diff
- GET /api/repositories/:username/:name/pulls/:number/mergeability
- POST /api/repositories/:username/:name/pulls/:number/merge

## Authorization

Repository read permission is required for reading pull request data.
Repository write permission is required for creating, updating, and merging pull requests.
Private repository access continues to use the existing repository authorization layer.

REST API authentication uses JWT access tokens through authMiddleware.
Personal access tokens remain dedicated to Git authentication.

## Branch Validation

Source and target branches are validated using the existing safe Git reference rules.
Both branches must exist in the repository.
A pull request cannot use the same branch as both source and target.

## Duplicate Pull Requests

GitZone prevents multiple active OPEN pull requests for the same source and target branch pair where appropriate.
The duplicate check is protected by the pull request transaction and repository advisory lock.

## Pull Request Commits

Pull request commits are calculated from commits reachable from the source branch but not the target branch.
Commit responses include:

- SHA
- parent SHAs
- commit message
- author identity and date
- committer identity and date

## Pull Request Diff

Pull request diff calculation reuses the Phase 6 Git comparison infrastructure.
The target branch is treated as the comparison base and the source branch as the head.

The response includes merge base, ahead/behind counts, unified diff content, size, truncation state, and binary state.

## Mergeability

Mergeability checks validate:

- source and target branch existence
- commits available to merge
- common ancestry
- Git merge conflicts

A pull request with no source commits ahead of the target is rejected as having nothing to merge.

## Merge

GitZone creates a real Git merge commit with two parents:

1. the previous target branch commit
2. the source branch commit

The target branch is updated using compare-and-swap semantics with git update-ref.
This prevents a concurrent target branch change from being silently overwritten.

After the Git merge succeeds, the database pull request is changed to MERGED and stores:

- mergedAt
- mergedById
- mergeSha

If the database update fails after the Git reference was updated, GitZone attempts an atomic Git rollback.
A rollback conflict is surfaced as a pull request merge consistency error.

## Transaction Safety

Pull request mutations use Prisma transactions and PostgreSQL advisory locking where repository-level serialization is required.
Merge operations additionally protect the Git target reference using atomic compare-and-swap updates.

## Testing

Phase 7 added dedicated unit coverage for pull request Git operations and integration coverage for the pull request HTTP API.

Final full quality gate:

- 64 test files passed
- 688 tests passed
- ESLint passed
- source TypeScript typecheck passed
- test TypeScript typecheck passed
- production build passed
- Prisma schema validation passed
- all 13 database migrations applied
- database schema up to date

## Real E2E Verification

Phase 7 was verified against:

- a real PostgreSQL database
- a real bare Git repository
- real main and feature branches
- real JWT REST authentication
- the running HTTP API

The E2E flow successfully:

1. created pull request #1
2. retrieved the pull request
3. calculated the source-only commit
4. generated the pull request diff
5. reported the pull request as mergeable
6. merged through the HTTP API
7. updated refs/heads/main to the returned merge SHA
8. verified the merge commit contained exactly two parents
9. verified the pull request state was MERGED in PostgreSQL

Verified merge SHA:

690517ecf249502dc9f31c885166fba1f407be75

Verified parents:

- target: ec57568f3903f10d13a73e2334d16edcdf188eb7
- source: d8288a7f5486303de605a2b144c5d3859dda9b11

Temporary E2E database, Git, worktree, and authentication fixtures were removed after verification.

## Phase 7 Result

PHASE 7 — 100% COMPLETE
