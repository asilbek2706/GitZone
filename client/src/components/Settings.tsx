import { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { ApiResponse, User } from '../types';
import { initials } from './Avatar';

export function Settings({ user }: { user: User }) {
  const [tab, setTab] = useState('Profile');
  const [tokens, setTokens] = useState<
    { id: string; name: string; tokenPrefix: string; createdAt: string }[]
  >([]);
  const [tokenName, setTokenName] = useState('');
  const [tokenValue, setTokenValue] = useState('');
  const [tokenError, setTokenError] = useState('');
  useEffect(() => {
    if (tab === 'Developer settings')
      api<ApiResponse<{ tokens: typeof tokens }>>('/tokens')
        .then((r) => setTokens(r.data.tokens))
        .catch((reason: unknown) => setTokenError(reason instanceof Error ? reason.message : 'Unable to load tokens'));
  }, [tab]);
  const createToken = async () => {
    if (!tokenName.trim()) return;
    setTokenError('');
    try {
      const result = await api<ApiResponse<{ token: string; id: string; name: string; expiresAt: string | null; createdAt: string }>>(
        '/tokens',
        { method: 'POST', body: JSON.stringify({ name: tokenName.trim() }) },
      );
      setTokenValue(result.data.token);
      setTokenName('');
      setTokens((current) => [...current, {
        id: result.data.id,
        name: result.data.name,
        tokenPrefix: result.data.token.slice(0, 8),
        createdAt: result.data.createdAt,
      }]);
    } catch (reason) {
      setTokenError(reason instanceof Error ? reason.message : 'Unable to create token');
    }
  };
  const revokeToken = async (id: string) => {
    try {
      await api(`/tokens/${id}`, { method: 'DELETE' });
      setTokens((current) => current.filter((token) => token.id !== id));
    } catch (reason) {
      setTokenError(reason instanceof Error ? reason.message : 'Unable to revoke token');
    }
  };
  return (
    <>
      <div className="settings-heading">
        <div className="eyebrow">ACCOUNT</div>
        <h1>Settings</h1>
        <p className="muted">Manage your account preferences and security.</p>
      </div>
      <div className="settings-layout">
        <nav className="settings-nav">
          {['Profile', 'Account', 'Security', 'Sessions', 'Developer settings'].map((item) => (
            <button
              className={tab === item ? 'active' : ''}
              key={item}
              onClick={() => setTab(item)}
            >
              {item}
              <span>›</span>
            </button>
          ))}
        </nav>
        <section className="settings-content panel">
          {tab === 'Profile' && (
            <>
              <h2>Public profile</h2>
              <p className="muted">
                This information will be visible to anyone who visits your profile.
              </p>
              <div className="settings-avatar">
                <span className="avatar profile-avatar">{initials(user)}</span>
                <button className="button ghost">Change avatar</button>
              </div>
              <label>
                Name
                <input defaultValue={user.name ?? ''} />
              </label>
              <label>
                Bio
                <textarea defaultValue={user.bio ?? ''} rows={3} />
              </label>
              <label>
                Username
                <input defaultValue={user.username} />
              </label>
              <button className="button primary">Save changes</button>
            </>
          )}
          {tab === 'Security' && (
            <>
              <h2>Password & authentication</h2>
              <p className="muted">
                Keep your account secure with a strong password and two-factor authentication.
              </p>
              <div className="setting-row">
                <div>
                  <b>Two-factor authentication</b>
                  <p className="muted">Add an extra layer of security to your account.</p>
                </div>
                <button className="button ghost">Enable 2FA</button>
              </div>
              <div className="setting-row">
                <div>
                  <b>Change password</b>
                  <p className="muted">Update your password regularly.</p>
                </div>
                <button className="button ghost">Update password</button>
              </div>
            </>
          )}
          {tab === 'Developer settings' && (
            <>
              <h2>Personal access tokens</h2>
              <p className="muted">
                Tokens you can use to authenticate Git operations and API requests.
              </p>
              {tokenError && <div className="error-box">{tokenError}</div>}
              {tokenValue && (
                <div className="token-secret">
                  <b>Copy this token now. It will not be shown again.</b>
                  <code>{tokenValue}</code>
                  <button className="button ghost" onClick={() => void navigator.clipboard.writeText(tokenValue)}>Copy token</button>
                </div>
              )}
              <div className="token-create">
                <input value={tokenName} onChange={(event) => setTokenName(event.target.value)} placeholder="Token name" />
                <button className="button primary" onClick={() => void createToken()}>＋ Generate new token</button>
              </div>
              {tokens.map((token) => (
                <div className="token-row" key={token.id}>
                  <b>{token.name}</b>
                  <code>{token.tokenPrefix}••••••••</code>
                  <button className="text-button" onClick={() => void revokeToken(token.id)}>Revoke</button>
                </div>
              ))}
            </>
          )}
          {!['Profile', 'Security', 'Developer settings'].includes(tab) && (
            <>
              <h2>{tab}</h2>
              <p className="muted">These settings are coming soon.</p>
            </>
          )}
        </section>
      </div>
    </>
  );
}
