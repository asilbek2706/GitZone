/*
  Warnings:

  - A unique constraint covering the columns `[repositoryId,id]` on the table `Milestone` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Issue" DROP CONSTRAINT "Issue_milestoneId_fkey";

-- DropForeignKey
ALTER TABLE "PullRequest" DROP CONSTRAINT "PullRequest_milestoneId_fkey";

-- CreateIndex
CREATE UNIQUE INDEX "Milestone_repositoryId_id_key" ON "Milestone"("repositoryId", "id");

-- AddForeignKey
ALTER TABLE "PullRequest" ADD CONSTRAINT "PullRequest_repositoryId_milestoneId_fkey" FOREIGN KEY ("repositoryId", "milestoneId") REFERENCES "Milestone"("repositoryId", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_repositoryId_milestoneId_fkey" FOREIGN KEY ("repositoryId", "milestoneId") REFERENCES "Milestone"("repositoryId", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;
