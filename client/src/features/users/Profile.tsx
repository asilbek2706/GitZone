import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../services/api';
import type { ApiResponse, Repository } from '../../types';

export function Profile() {
  const { username = '' } = useParams();
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api<ApiResponse<{ repositories: Repository[] }>>(`/repositories/${username}`)
      .then((r) => setRepos(r.data.repositories))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [username]);
  return (
    <>
      <div className="profile-head">
        <div className="avatar profile-avatar">{username.slice(0, 2).toUpperCase()}</div>
        <div>
          <div className="eyebrow">DEVELOPER PROFILE</div>
          <h1>{username}</h1>
          <p className="muted">Building tools that make developers happier.</p>
          <div className="profile-meta">◎ @{username} &nbsp; · &nbsp; ◷ Joined recently</div>
        </div>
        <button className="button ghost">Edit profile</button>
      </div>
      <div className="tabs">
        <span className="selected">
          Repositories <b>{repos.length}</b>
        </span>
        <span>Projects</span>
        <span>Stars</span>
      </div>
      <div className="section-title">
        <h2>Repositories</h2>
        <div className="search small">
          <span>⌕</span>
          <input placeholder="Find a repository..." />
        </div>
      </div>
      {loading ? (
        <div className="empty">Loading...</div>
      ) : (
        <div className="profile-repos">
          {repos.map((r) => (
            <RepoCard key={r.id} repo={r} />
          ))}
          {!repos.length && <div className="panel empty">No public repositories yet.</div>}
        </div>
      )}
    </>
  );
}

function RepoCard({ repo }: { repo: Repository }) {
  return (
    <Link to={`/${repo.owner?.username ?? ''}/${repo.name}`} className="panel repo-card">
      <div className="repo-card-title">
        <span className="repo-symbol">?</span>
        <h3>{repo.name}</h3>
        <span className="visibility">{repo.isPrivate ? 'Private' : 'Public'}</span>
      </div>
      <p className="muted">{repo.description ?? 'No description provided.'}</p>
      <div className="repo-card-foot">
        <span>
          <i className="language-dot" /> TypeScript
        </span>
        <span>? 0</span>
        <span>? 0</span>
        <span>Updated recently</span>
      </div>
    </Link>
  );
}
