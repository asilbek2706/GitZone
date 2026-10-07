import { Router } from 'express';
import {
  create as createPullRequest,
  getOne as getPullRequest,
  list as listPullRequests,
  update as updatePullRequest,
  getCommits as getPullRequestCommits,
  getDiff as getPullRequestDiff,
  getMergeability as getPullRequestMergeability,
  merge as mergePullRequest,
} from '../controllers/pull-requests/pull-request.controller.js';

import { authMiddleware } from '../middleware/auth.middleware.js';
import { optionalAuthMiddleware } from '../middleware/optional-auth.middleware.js';
import { getRefs } from '../controllers/repositories/repository-content.controller.js';
import {
  createBranch,
  deleteBranch,
  renameBranch,
  getBranch,
  getBranches,
  getBlob,
  getCommit,
  getCommits,
  getContent,
  getRawContent,
  getReadme,
  getCommitDiff,
  compareCommits,
  compareBranches,
} from '../controllers/repositories/repository-git.controller.js';
import { getTree } from '../controllers/repositories/repository-tree.controller.js';
import {
  addCollaborator,
  create,
  getOne,
  listByUsername,
  listCollaborators,
  remove,
  update,
  updateCollaborator,
  removeCollaborator,
} from '../controllers/repositories/repository.controller.js';

const router = Router();

router.post('/', authMiddleware, create);
router.get('/:username', listByUsername);
router.get('/:username/:name/git/refs', optionalAuthMiddleware, getRefs);
router.post('/:username/:name/git/branches', authMiddleware, createBranch);
router.delete('/:username/:name/git/branches', authMiddleware, deleteBranch);
router.patch('/:username/:name/git/branches', authMiddleware, renameBranch);
router.get('/:username/:name/git/branches', optionalAuthMiddleware, getBranches);
router.get('/:username/:name/git/branches/details', optionalAuthMiddleware, getBranch);
router.get('/:username/:name/git/tree', optionalAuthMiddleware, getTree);
router.get('/:username/:name/git/contents', optionalAuthMiddleware, getContent);
router.get('/:username/:name/git/raw', optionalAuthMiddleware, getRawContent);
router.get('/:username/:name/git/readme', optionalAuthMiddleware, getReadme);
router.get('/:username/:name/git/blobs/:sha', optionalAuthMiddleware, getBlob);
router.get('/:username/:name/git/commits', optionalAuthMiddleware, getCommits);
router.get('/:username/:name/git/compare/commits', optionalAuthMiddleware, compareCommits);
router.get('/:username/:name/git/compare/branches', optionalAuthMiddleware, compareBranches);
router.get('/:username/:name/git/commits/:sha/diff', optionalAuthMiddleware, getCommitDiff);
router.get('/:username/:name/git/commits/:sha', optionalAuthMiddleware, getCommit);
router.post('/:username/:name/pulls', authMiddleware, createPullRequest);
router.get('/:username/:name/pulls', optionalAuthMiddleware, listPullRequests);
router.get('/:username/:name/pulls/:number', optionalAuthMiddleware, getPullRequest);
router.patch('/:username/:name/pulls/:number', authMiddleware, updatePullRequest);

router.get('/:username/:name/pulls/:number/commits', optionalAuthMiddleware, getPullRequestCommits);
router.get('/:username/:name/pulls/:number/diff', optionalAuthMiddleware, getPullRequestDiff);
router.get('/:username/:name/pulls/:number/mergeability', optionalAuthMiddleware, getPullRequestMergeability);
router.post('/:username/:name/pulls/:number/merge', authMiddleware, mergePullRequest);
router.get('/:username/:name', getOne);
router.patch('/:username/:name', authMiddleware, update);
router.delete('/:username/:name', authMiddleware, remove);

router.post('/:username/:name/collaborators', authMiddleware, addCollaborator);
router.get('/:username/:name/collaborators', authMiddleware, listCollaborators);
router.patch(
  '/:username/:name/collaborators/:collaboratorUsername',
  authMiddleware,
  updateCollaborator,
);
router.delete(
  '/:username/:name/collaborators/:collaboratorUsername',
  authMiddleware,
  removeCollaborator,
);

export default router;
