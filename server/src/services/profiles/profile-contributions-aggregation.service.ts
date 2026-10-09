import prisma from '../../config/prisma.js';

export interface ContributionAggregateRow {
  date: Date;
  repositories: bigint;
  issues: bigint;
  pullRequests: bigint;
}

export const getContributionAggregates = async (
  userId: string,
  start: Date,
  endExclusive: Date,
): Promise<ContributionAggregateRow[]> => {
  return prisma.$queryRaw<ContributionAggregateRow[]>`
    WITH contributions AS (
      SELECT
        DATE_TRUNC('day', r."createdAt" AT TIME ZONE 'UTC') AS day,
        1 AS repositories,
        0 AS issues,
        0 AS pull_requests
      FROM "Repository" r
      WHERE r."ownerId" = ${userId}
        AND r."isPrivate" = false
        AND r."createdAt" >= ${start}
        AND r."createdAt" < ${endExclusive}

      UNION ALL

      SELECT
        DATE_TRUNC('day', i."createdAt" AT TIME ZONE 'UTC') AS day,
        0 AS repositories,
        1 AS issues,
        0 AS pull_requests
      FROM "Issue" i
      INNER JOIN "Repository" r
        ON r.id = i."repositoryId"
      WHERE i."creatorId" = ${userId}
        AND r."isPrivate" = false
        AND i."createdAt" >= ${start}
        AND i."createdAt" < ${endExclusive}

      UNION ALL

      SELECT
        DATE_TRUNC('day', p."createdAt" AT TIME ZONE 'UTC') AS day,
        0 AS repositories,
        0 AS issues,
        1 AS pull_requests
      FROM "PullRequest" p
      INNER JOIN "Repository" r
        ON r.id = p."repositoryId"
      WHERE p."authorId" = ${userId}
        AND r."isPrivate" = false
        AND p."createdAt" >= ${start}
        AND p."createdAt" < ${endExclusive}
    )
    SELECT
      day AS date,
      COUNT(*) FILTER (
        WHERE repositories = 1
      ) AS repositories,
      COUNT(*) FILTER (
        WHERE issues = 1
      ) AS issues,
      COUNT(*) FILTER (
        WHERE pull_requests = 1
      ) AS "pullRequests"
    FROM contributions
    GROUP BY day
    ORDER BY day ASC
  `;
};
