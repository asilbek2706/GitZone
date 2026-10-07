import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import type { ApiResponse, Repository, User } from '../../types';

export function Dashboard({ user }: { user: User }) {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api<ApiResponse<{ repositories: Repository[] }>>(`/repositories/${user.username}`)
      .then((result) => setRepos(result.data.repositories))
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : 'Unable to load repositories'),
      )
      .finally(() => setLoading(false));
  }, [user.username]);

  return (
    <>
      <div className="welcome-row">
        <div>
          <div className="eyebrow">YOUR WORKSPACE</div>
          <h1>Welcome, {user.name?.split(' ')[0] ?? user.username}</h1>
          <p className="muted">Manage your repositories and collaborate with your team.</p>
        </div>
        <Link className="button primary" to="/repositories/new">
          ＋ New repository
        </Link>
      </div>
      <section className="panel dashboard-repositories">
        <div className="panel-head">
          <div>
            <h2>Your repositories</h2>
            <p className="muted">Repositories visible to your account.</p>
          </div>
          <Link className="text-button" to={`/${user.username}`}>
            View profile →
          </Link>
        </div>
        {loading && <div className="empty">Loading repositories...</div>}
        {!loading && error && <div className="error-box">{error}</div>}
        {!loading && !error && repos.length === 0 && (
          <div className="empty">
            You have no visible repositories yet. <Link to="/repositories/new">Create one</Link>
          </div>
        )}
        {!loading &&
          !error &&
          repos.map((repo) => <RepoRow key={repo.id} repo={repo} username={user.username} />)}
      </section>
    </>
  );
}

function RepoRow({ repo, username }: { repo: Repository; username: string }) {
  return (
    <Link to={`/${repo.owner?.username ?? username}/${repo.name}`} className="repo-row">
      <span className="repo-symbol">◈</span>
      <span>
        <b>{repo.name}</b>
        <small>{repo.description ?? 'No description provided'}</small>
      </span>
      <small>{repo.isPrivate ? 'Private' : 'Public'}</small>
    </Link>
  );
}
