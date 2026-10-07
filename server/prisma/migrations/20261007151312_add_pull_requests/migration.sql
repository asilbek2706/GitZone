-- CreateEnum
CREATE TYPE "PullRequestState" AS ENUM ('OPEN', 'CLOSED', 'MERGED');

-- CreateTable
CREATE TABLE "PullRequest" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sourceBranch" TEXT NOT NULL,
    "targetBranch" TEXT NOT NULL,
    "state" "PullRequestState" NOT NULL DEFAULT 'OPEN',
    "mergedAt" TIMESTAMP(3),
    "mergedById" TEXT,
    "mergeSha" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PullRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PullRequest_repositoryId_state_idx" ON "PullRequest"("repositoryId", "state");

-- CreateIndex
CREATE INDEX "PullRequest_repositoryId_sourceBranch_targetBranch_state_idx" ON "PullRequest"("repositoryId", "sourceBranch", "targetBranch", "state");

-- CreateIndex
CREATE INDEX "PullRequest_authorId_idx" ON "PullRequest"("authorId");

-- CreateIndex
CREATE INDEX "PullRequest_mergedById_idx" ON "PullRequest"("mergedById");

-- CreateIndex
CREATE UNIQUE INDEX "PullRequest_repositoryId_number_key" ON "PullRequest"("repositoryId", "number");

-- AddForeignKey
ALTER TABLE "PullRequest" ADD CONSTRAINT "PullRequest_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PullRequest" ADD CONSTRAINT "PullRequest_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PullRequest" ADD CONSTRAINT "PullRequest_mergedById_fkey" FOREIGN KEY ("mergedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
