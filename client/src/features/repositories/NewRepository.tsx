import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import type { ApiResponse, Repository, User } from '../../types';

export function NewRepository({ user }: { user: User }) {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const r = await api<ApiResponse<{ repository: Repository }>>('/repositories', {
        method: 'POST',
        body: JSON.stringify({ ...data, isPrivate: data.visibility === 'private' }),
      });
      navigate(`/${user.username}/${r.data.repository.name}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Repository yaratilmadi');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="form-page">
      <Link className="back-link" to="/">
        ← Back to overview
      </Link>
      <div className="form-heading">
        <div className="eyebrow">NEW PROJECT</div>
        <h1>Create a new repository</h1>
        <p className="muted">
          A repository contains all your project’s files, history, and collaborators.
        </p>
      </div>
      <form className="panel repo-form" onSubmit={submit}>
        {error && <div className="error-box">{error}</div>}
        <label>
          Repository name <span className="required">*</span>
          <div className="input-prefix">
            <span>{user.username} /</span>
            <input required name="name" placeholder="my-awesome-project" />
          </div>
          <small>Use a short, memorable name for your repository.</small>
        </label>
        <label>
          Description <span className="optional">Optional</span>
          <textarea name="description" placeholder="What is this project about?" rows={3} />
        </label>
        <fieldset>
          <legend>Visibility</legend>
          <label className="radio">
            <input defaultChecked type="radio" name="visibility" value="public" />
            <span>
              <b>◉ Public</b>
              <small>Anyone on the internet can see this repository.</small>
            </span>
          </label>
          <label className="radio">
            <input type="radio" name="visibility" value="private" />
            <span>
              <b>◉ Private</b>
              <small>You choose who can access this repository.</small>
            </span>
          </label>
        </fieldset>
        <label>
          Initialize this repository with <span className="optional">Optional</span>
          <select name="defaultBranch" defaultValue="main">
            <option value="main">main branch</option>
            <option value="master">master branch</option>
          </select>
        </label>
        <div className="form-actions">
          <Link className="button ghost" to="/">
            Cancel
          </Link>
          <button className="button primary" disabled={busy}>
            {busy ? 'Creating...' : 'Create repository →'}
          </button>
        </div>
      </form>
    </div>
  );
}
