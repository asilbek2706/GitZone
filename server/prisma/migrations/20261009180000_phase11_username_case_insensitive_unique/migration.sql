-- Prevent usernames that differ only by letter case.
-- Keep the existing Prisma-managed unique constraint.

CREATE UNIQUE INDEX "User_username_lower_key"
ON "User" (LOWER("username"));