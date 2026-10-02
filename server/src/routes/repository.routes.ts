import { Router } from 'express';

import { authMiddleware } from '../middleware/auth.middleware.js';
import { optionalAuthMiddleware } from '../middleware/optional-auth.middleware.js';
import { getRefs } from '../controllers/repositories/repository-content.controller.js';
import {
  getBranches,
  getBlob,
  getCommit,
  getCommits,
  getContent,
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
router.get('/:username/:name/git/branches', optionalAuthMiddleware, getBranches);
router.get('/:username/:name/git/tree', optionalAuthMiddleware, getTree);
router.get('/:username/:name/git/contents', optionalAuthMiddleware, getContent);
router.get('/:username/:name/git/blobs/:sha', optionalAuthMiddleware, getBlob);
router.get('/:username/:name/git/commits', optionalAuthMiddleware, getCommits);
router.get('/:username/:name/git/commits/:sha', optionalAuthMiddleware, getCommit);
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
