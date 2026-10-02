import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../services/api';
import type { ApiResponse, Repository, TreeEntry } from '../../types';

export function RepositoryPage() {
  const { username = '', repo = '' } = useParams();
  const [repository, setRepository] = useState<Repository | null>(null);
  const [entries, setEntries] = useState<TreeEntry[]>([]);
  const [branch, setBranch] = useState('main');
  const [branches, setBranches] = useState<string[]>([]);
  const [path, setPath] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    api<ApiResponse<{ repository: Repository }>>(`/repositories/${username}/${repo}`)
      .then((r) => setRepository(r.data.repository))
      .catch((e) => setError(e.message));
  }, [username, repo]);
  useEffect(() => {
    api<ApiResponse<{ refs: { branches: { name: string }[]; head: { name: string } | null } }>>(
      `/repositories/${username}/${repo}/git/refs`,
    )
      .then((result) => {
        const names = result.data.refs.branches.map((item) => item.name);
        setBranches(names);
        if (result.data.refs.head?.name) setBranch(result.data.refs.head.name);
      })
      .catch(() => setBranches([]));
  }, [username, repo]);
  useEffect(() => {
    api<ApiResponse<{ tree: { entries: TreeEntry[]; ref: { name: string } } }>>(
      `/repositories/${username}/${repo}/git/tree?ref=${encodeURIComponent(branch)}&path=${encodeURIComponent(path)}`,
    )
      .then((r) => {
        setEntries(r.data.tree.entries);
        setBranch(r.data.tree.ref.name);
      })
      .catch(() => setEntries([]));
  }, [username, repo, branch, path]);
  const breadcrumbs = path ? path.split('/') : [];
  return (
    <>
      <div className="repo-header">
        <div>
          <div className="repo-title">
            <span className="repo-symbol large">◈</span>
            <h1>
              {username} <b>/</b> {repo}
            </h1>
            <span className="visibility">{repository?.isPrivate ? 'Private' : 'Public'}</span>
          </div>
          <p className="muted">
            {repository?.description ?? 'A modern project built with GitZone.'}
          </p>
        </div>
      </div>
      <div className="repo-tabs">
        <span className="active">▣ Code</span>
      </div>
      {error ? (
        <div className="error-box">{error}</div>
      ) : (
        <div className="repo-layout">
          <section className="panel file-panel">
            <div className="file-toolbar">
              <select
                value={branch}
                onChange={(e) => {
                  setBranch(e.target.value);
                  setPath('');
                }}
              >
                {branches.length === 0 && <option>{branch}</option>}
                {branches.map((name) => <option key={name}>{name}</option>)}
              </select>
              <div className="breadcrumbs">
                <button onClick={() => setPath('')}>{repo}</button>
                {breadcrumbs.map((part, i) => (
                  <span key={part}>
                    {' '}
                    /{' '}
                    <button onClick={() => setPath(breadcrumbs.slice(0, i + 1).join('/'))}>
                      {part}
                    </button>
                  </span>
                ))}
              </div>
              <button className="button primary small-button">Code ▾</button>
            </div>
            <div className="file-list">
              {entries.length ? (
                entries.map((entry) => (
                  <button
                    className="file-row"
                    key={entry.path}
                    onClick={() => (entry.kind === 'directory' ? setPath(entry.path) : undefined)}
                  >
                    <span className={`file-icon ${entry.kind}`}>
                      {entry.kind === 'directory' ? '▰' : '▱'}
                    </span>
                    <b>{entry.name}</b>
                    <span className="muted">
                      {entry.kind === 'directory'
                        ? 'Directory'
                        : entry.size
                          ? `${entry.size} bytes`
                          : 'File'}
                    </span>
                    <span>›</span>
                  </button>
                ))
              ) : (
                <div className="empty">
                  This repository is empty. Push your first commit to see files here.
                </div>
              )}
            </div>
          </section>
          <aside className="repo-sidebar">
            <div className="panel about-panel">
              <h3>About</h3>
              <p className="muted">{repository?.description ?? 'No description provided.'}</p>
            </div>
            <div className="panel releases">
              <h3>Releases</h3>
              <p className="muted">Release information is not available for this repository.</p>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
