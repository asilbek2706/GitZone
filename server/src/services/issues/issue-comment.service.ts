import type { Prisma } from '../../generated/prisma/client.js';

import prisma from '../../config/prisma.js';
import { AppError } from '../../errors/app.error.js';
import { authorizeRepositoryAccess } from '../repositories/repository-authorization.service.js';

import type {
  CreateIssueCommentInput,
  UpdateIssueCommentInput,
  ListIssueCommentsQuery,
} from '../../validations/issues/issue-comment.validation.js';

const commentInclude = {
  author: {
    select: {
      id: true,
      username: true,
      name: true,
      avatarUrl: true,
    },
  },
} satisfies Prisma.IssueCommentInclude;

const resolveIssue = async (
  username: string,
  repositoryName: string,
  number: number,
  userId: string | undefined,
  access: 'READ' | 'WRITE',
) => {
  const repository = await prisma.repository.findFirst({
    where: {
      name: repositoryName,
      owner: { username },
    },
    select: {
      id: true,
      ownerId: true,
    },
  });

  if (!repository) {
    throw new AppError('Repository not found', 404, 'REPOSITORY_NOT_FOUND');
  }

  await authorizeRepositoryAccess(repository.id, access, userId);

  const issue = await prisma.issue.findUnique({
    where: {
      repositoryId_number: {
        repositoryId: repository.id,
        number,
      },
    },
    select: { id: true },
  });

  if (!issue) {
    throw new AppError('Issue not found', 404, 'ISSUE_NOT_FOUND');
  }

  return { issue, repository };
};

export const createIssueComment = async (
  userId: string,
  username: string,
  repositoryName: string,
  number: number,
  input: CreateIssueCommentInput,
) => {
  const { issue } = await resolveIssue(username, repositoryName, number, userId, 'WRITE');

  return prisma.issueComment.create({
    data: {
      issueId: issue.id,
      authorId: userId,
      body: input.body,
    },
    include: commentInclude,
  });
};

export const listIssueComments = async (
  username: string,
  repositoryName: string,
  number: number,
  userId: string | undefined,
  query: ListIssueCommentsQuery,
) => {
  const { issue } = await resolveIssue(username, repositoryName, number, userId, 'READ');

  const where = { issueId: issue.id };

  const [comments, total] = await prisma.$transaction([
    prisma.issueComment.findMany({
      where,
      include: commentInclude,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.issueComment.count({ where }),
  ]);

  return {
    comments,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
};

const resolveEditableComment = async (
  userId: string,
  username: string,
  repositoryName: string,
  number: number,
  commentId: string,
) => {
  const { issue, repository } = await resolveIssue(
    username,
    repositoryName,
    number,
    userId,
    'READ',
  );

  const comment = await prisma.issueComment.findFirst({
    where: {
      id: commentId,
      issueId: issue.id,
    },
    select: {
      id: true,
      authorId: true,
    },
  });

  if (!comment) {
    throw new AppError('Issue comment not found', 404, 'ISSUE_COMMENT_NOT_FOUND');
  }

  if (comment.authorId !== userId && repository.ownerId !== userId) {
    throw new AppError('You cannot modify this comment', 403, 'ISSUE_COMMENT_ACCESS_DENIED');
  }

  return comment;
};

export const updateIssueComment = async (
  userId: string,
  username: string,
  repositoryName: string,
  number: number,
  commentId: string,
  input: UpdateIssueCommentInput,
) => {
  const comment = await resolveEditableComment(userId, username, repositoryName, number, commentId);

  return prisma.issueComment.update({
    where: { id: comment.id },
    data: { body: input.body },
    include: commentInclude,
  });
};

export const deleteIssueComment = async (
  userId: string,
  username: string,
  repositoryName: string,
  number: number,
  commentId: string,
) => {
  const comment = await resolveEditableComment(userId, username, repositoryName, number, commentId);

  await prisma.issueComment.delete({
    where: { id: comment.id },
  });
};
