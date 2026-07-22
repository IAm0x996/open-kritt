import { Router } from 'express';
import { listLocalRepos, localRepoStats } from '../lib/localRepos.js';

const router = Router();

export function localRepoStatsErrorResponse(error) {
  if (['ENOENT', 'ENOTDIR'].includes(error?.code)) {
    return { status: 404, error: 'Local repository not found.' };
  }
  if (error?.code === 'ESTALE') {
    return { status: 409, error: 'Local repository changed while it was being counted. Retry the count.' };
  }
  if (['EACCES', 'EPERM'].includes(error?.code)) {
    return { status: 503, error: 'Local repository file count is unavailable.' };
  }
  return null;
}

// GET /api/local-repos — the repositories available under LOCAL_REPOS_PATH.
router.get('/', (req, res, next) => {
  try {
    res.json(listLocalRepos());
  } catch (e) {
    next(e);
  }
});

// GET /api/local-repos/:name/stats — lazy snapshot-style file count for one
// allowlisted local repository. Counting failures are handled by the standard
// error middleware; the scan form treats this preview as non-blocking.
router.get('/:name/stats', async (req, res, next) => {
  const controller = new AbortController();
  const cancelCount = () => controller.abort();
  res.once('close', cancelCount);
  res.set('Cache-Control', 'no-store');
  try {
    const stats = await localRepoStats(req.params.name, { signal: controller.signal });
    if (controller.signal.aborted) return;
    if (!stats) return res.status(404).json({ error: 'Local repository not found.' });
    res.json(stats);
  } catch (e) {
    if (controller.signal.aborted || e?.name === 'AbortError') return;
    const response = localRepoStatsErrorResponse(e);
    if (response) return res.status(response.status).json({ error: response.error });
    next(e);
  } finally {
    res.off('close', cancelCount);
  }
});

export default router;
