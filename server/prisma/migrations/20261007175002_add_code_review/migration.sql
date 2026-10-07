-- CreateEnum
CREATE TYPE "PullRequestReviewState" AS ENUM ('COMMENTED', 'APPROVED', 'CHANGES_REQUESTED');

-- CreateEnum
CREATE TYPE "PullRequestConversationType" AS ENUM ('GENERAL', 'INLINE');

-- CreateEnum
CREATE TYPE "PullRequestDiffSide" AS ENUM ('LEFT', 'RIGHT');

-- CreateTable
CREATE TABLE "PullRequestReview" (
    "id" TEXT NOT NULL,
    "pullRequestId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "state" "PullRequestReviewState" NOT NULL,
    "body" TEXT,
    "headSha" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PullRequestReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PullRequestConversation" (
    "id" TEXT NOT NULL,
    "pullRequestId" TEXT NOT NULL,
    "type" "PullRequestConversationType" NOT NULL,
    "path" TEXT,
    "line" INTEGER,
    "side" "PullRequestDiffSide",
    "baseSha" TEXT,
    "headSha" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PullRequestConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PullRequestReviewComment" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "reviewId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PullRequestReviewComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PullRequestReview_pullRequestId_idx" ON "PullRequestReview"("pullRequestId");

-- CreateIndex
CREATE INDEX "PullRequestReview_pullRequestId_reviewerId_idx" ON "PullRequestReview"("pullRequestId", "reviewerId");

-- CreateIndex
CREATE INDEX "PullRequestReview_pullRequestId_state_idx" ON "PullRequestReview"("pullRequestId", "state");

-- CreateIndex
CREATE INDEX "PullRequestReview_reviewerId_idx" ON "PullRequestReview"("reviewerId");

-- CreateIndex
CREATE INDEX "PullRequestConversation_pullRequestId_idx" ON "PullRequestConversation"("pullRequestId");

-- CreateIndex
CREATE INDEX "PullRequestConversation_pullRequestId_type_idx" ON "PullRequestConversation"("pullRequestId", "type");

-- CreateIndex
CREATE INDEX "PullRequestConversation_pullRequestId_resolvedAt_idx" ON "PullRequestConversation"("pullRequestId", "resolvedAt");

-- CreateIndex
CREATE INDEX "PullRequestConversation_resolvedById_idx" ON "PullRequestConversation"("resolvedById");

-- CreateIndex
CREATE INDEX "PullRequestReviewComment_conversationId_idx" ON "PullRequestReviewComment"("conversationId");

-- CreateIndex
CREATE INDEX "PullRequestReviewComment_authorId_idx" ON "PullRequestReviewComment"("authorId");

-- CreateIndex
CREATE INDEX "PullRequestReviewComment_reviewId_idx" ON "PullRequestReviewComment"("reviewId");

-- AddForeignKey
ALTER TABLE "PullRequestReview" ADD CONSTRAINT "PullRequestReview_pullRequestId_fkey" FOREIGN KEY ("pullRequestId") REFERENCES "PullRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PullRequestReview" ADD CONSTRAINT "PullRequestReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PullRequestConversation" ADD CONSTRAINT "PullRequestConversation_pullRequestId_fkey" FOREIGN KEY ("pullRequestId") REFERENCES "PullRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PullRequestConversation" ADD CONSTRAINT "PullRequestConversation_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PullRequestReviewComment" ADD CONSTRAINT "PullRequestReviewComment_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "PullRequestConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PullRequestReviewComment" ADD CONSTRAINT "PullRequestReviewComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PullRequestReviewComment" ADD CONSTRAINT "PullRequestReviewComment_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "PullRequestReview"("id") ON DELETE SET NULL ON UPDATE CASCADE;
