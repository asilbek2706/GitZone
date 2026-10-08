-- CreateEnum
CREATE TYPE "IssueState" AS ENUM ('OPEN', 'CLOSED');
-- CreateTable
CREATE TABLE "RepositoryIssueCounter" (
  "repositoryId" TEXT NOT NULL,
  "nextNumber" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "RepositoryIssueCounter_pkey" PRIMARY KEY ("repositoryId")
);
-- CreateTable
CREATE TABLE "Issue" (
  "id" TEXT NOT NULL,
  "repositoryId" TEXT NOT NULL,
  "number" INTEGER NOT NULL,
  "creatorId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT,
  "state" "IssueState" NOT NULL DEFAULT 'OPEN',
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Issue_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "IssueComment" (
  "id" TEXT NOT NULL,
  "issueId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IssueComment_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "IssueAssignee" (
  "issueId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IssueAssignee_pkey" PRIMARY KEY ("issueId", "userId")
);
-- CreateIndex
CREATE INDEX "Issue_repositoryId_state_idx" ON "Issue"("repositoryId", "state");
-- CreateIndex
CREATE INDEX "Issue_creatorId_idx" ON "Issue"("creatorId");
-- CreateIndex
CREATE UNIQUE INDEX "Issue_repositoryId_number_key" ON "Issue"("repositoryId", "number");
-- CreateIndex
CREATE INDEX "IssueComment_issueId_createdAt_idx" ON "IssueComment"("issueId", "createdAt");
-- CreateIndex
CREATE INDEX "IssueComment_authorId_idx" ON "IssueComment"("authorId");
-- CreateIndex
CREATE INDEX "IssueAssignee_userId_idx" ON "IssueAssignee"("userId");
-- AddForeignKey
ALTER TABLE
  "RepositoryIssueCounter"
ADD
  CONSTRAINT "RepositoryIssueCounter_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE
  "Issue"
ADD
  CONSTRAINT "Issue_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE
  "Issue"
ADD
  CONSTRAINT "Issue_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE
  "IssueComment"
ADD
  CONSTRAINT "IssueComment_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE
  "IssueComment"
ADD
  CONSTRAINT "IssueComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE
  "IssueAssignee"
ADD
  CONSTRAINT "IssueAssignee_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE
  "IssueAssignee"
ADD
  CONSTRAINT "IssueAssignee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;