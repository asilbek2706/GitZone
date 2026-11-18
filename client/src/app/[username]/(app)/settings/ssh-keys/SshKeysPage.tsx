'use client';

import { useEffect, useState, type FormEvent } from 'react';
import axios from 'axios';

import { api } from '@/lib/api';

interface SshKey {
  id: string;
  name: string;
  fingerprint: string;
  keyType: string;
  lastUsedAt: string | null;
  createdAt: string;
}

interface SshKeysResponse {
  success: boolean;
  data: {
    sshKeys: SshKey[];
  };
}

interface CreateSshKeyResponse {
  success: boolean;
  data: {
    sshKey: SshKey;
  };
}

const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    return (
      error.response?.data?.error?.message ??
      error.response?.data?.message ??
      'Request failed. Please try again.'
    );
  }

  return error instanceof Error ? error.message : 'Something went wrong.';
};

const formatDate = (value: string | null): string => {
  if (!value) return 'Never';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Unknown';

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
};

const fetchSshKeys = async (): Promise<SshKey[]> => {
  const response = await api.get<SshKeysResponse>('/api/auth/ssh-keys');

  return response.data.data.sshKeys;
};

export default function SshKeysSettingsPage() {
  const [sshKeys, setSshKeys] = useState<SshKey[]>([]);
  const [name, setName] = useState('');
  const [publicKey, setPublicKey] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingKeyId, setDeletingKeyId] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    api
      .get<SshKeysResponse>('/api/auth/ssh-keys')
      .then((response) => {
        if (isMounted) {
          setSshKeys(response.data.data.sshKeys);
        }
      })
      .catch((requestError: unknown) => {
        if (isMounted) {
          setError(getErrorMessage(requestError));
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleRefresh = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const keys = await fetchSshKeys();
      setSshKeys(keys);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddKey = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedName = name.trim();
    const normalizedKey = publicKey.trim();

    if (!normalizedName || !normalizedKey) {
      setError('Key name and public key are required.');
      return;
    }

    if (/[\r\n\0]/.test(normalizedKey)) {
      setError('Please enter a single-line SSH public key.');
      return;
    }

    if (normalizedKey.startsWith('-----BEGIN')) {
      setError('Private keys are not accepted. Please paste the contents of your .pub file.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await api.post<CreateSshKeyResponse>('/api/auth/ssh-keys', {
        name: normalizedName,
        publicKey: normalizedKey,
      });

      setSshKeys((current) => [response.data.data.sshKey, ...current]);

      setName('');
      setPublicKey('');
      setSuccess('SSH public key added successfully.');
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteKey = async (key: SshKey) => {
    const confirmed = window.confirm(
      `Remove SSH key "${key.name}"? This key will no longer authenticate new SSH connections.`,
    );

    if (!confirmed) return;

    setDeletingKeyId(key.id);
    setError(null);
    setSuccess(null);

    try {
      await api.delete(`/api/auth/ssh-keys/${encodeURIComponent(key.id)}`);

      setSshKeys((current) => current.filter((item) => item.id !== key.id));

      setSuccess(`SSH key "${key.name}" was removed.`);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setDeletingKeyId(null);
    }
  };

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setSuccess('Fingerprint copied to clipboard.');
    } catch {
      setError('Could not copy fingerprint to clipboard.');
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header className="space-y-2 border-b border-border pb-6">
        <div className="flex items-center gap-2 text-sm text-muted">
          <span>Settings</span>
          <span>/</span>
          <span className="text-foreground">SSH Keys</span>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-foreground">SSH and GPG keys</h1>

        <p className="max-w-2xl text-sm leading-relaxed text-muted">
          Manage the SSH keys associated with your GitZone account. SSH keys allow you to securely
          connect to GitZone without entering your username and Personal Access Token for every Git
          operation.
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400"
        >
          {success}
        </div>
      )}

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Add a new SSH key</h2>

          <p className="mt-1 text-sm text-muted">
            Add your computer&apos;s public SSH key to your GitZone account.
          </p>
        </div>

        <form
          onSubmit={handleAddKey}
          className="space-y-5 rounded-xl border border-border bg-surface p-5"
        >
          <div className="space-y-2">
            <label htmlFor="ssh-key-name" className="block text-sm font-medium text-foreground">
              Key title
            </label>

            <input
              id="ssh-key-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="My Windows PC"
              maxLength={100}
              required
              disabled={isSubmitting}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
            />

            <p className="text-xs text-muted">
              Give your key a recognizable name so you can identify it later.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="ssh-public-key" className="block text-sm font-medium text-foreground">
              Key
            </label>

            <textarea
              id="ssh-public-key"
              value={publicKey}
              onChange={(event) => setPublicKey(event.target.value)}
              placeholder="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA..."
              rows={5}
              maxLength={16384}
              required
              disabled={isSubmitting}
              spellCheck={false}
              className="w-full resize-y rounded-lg border border-border bg-background px-3 py-3 font-mono text-xs leading-relaxed text-foreground outline-none transition placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
            />

            <p className="text-xs text-muted">
              Paste your public key. It usually starts with ssh-ed25519 or ssh-rsa. Never paste your
              private key.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <p className="text-xs text-muted">Supported: ED25519, RSA and ECDSA</p>

            <button
              type="submit"
              disabled={isSubmitting || !name.trim() || !publicKey.trim()}
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Adding key...' : 'Add SSH key'}
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Your SSH keys</h2>

            <p className="mt-1 text-sm text-muted">
              {sshKeys.length} registered {sshKeys.length === 1 ? 'key' : 'keys'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={isLoading}
            className="rounded-lg border border-border px-3 py-2 text-sm text-foreground transition hover:bg-surface-hover disabled:opacity-50"
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {isLoading ? (
          <div
            className="flex min-h-32 items-center justify-center rounded-xl border border-border bg-surface"
            aria-busy="true"
          >
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : sshKeys.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface px-6 py-12 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-surface-hover text-muted">
              <svg
                viewBox="0 0 24 24"
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7 14a5 5 0 1 1 3.9-1.87L9 14H7v2H5v2H3v-4l4-4"
                />
                <circle cx="7.5" cy="7.5" r=".75" fill="currentColor" />
              </svg>
            </div>

            <h3 className="font-semibold text-foreground">No SSH keys added yet</h3>

            <p className="mx-auto mt-2 max-w-md text-sm text-muted">
              Add an SSH public key to connect your local Git environment securely to GitZone.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            {sshKeys.map((key, index) => (
              <article
                key={key.id}
                className={`space-y-3 p-5 ${index !== 0 ? 'border-t border-border' : ''}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 space-y-1">
                    <h3 className="break-words font-semibold text-foreground">{key.name}</h3>

                    <p className="text-xs text-muted">{key.keyType}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleDeleteKey(key)}
                    disabled={deletingKeyId === key.id}
                    className="shrink-0 rounded-lg border border-red-500/30 px-3 py-2 text-xs font-medium text-red-400 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deletingKeyId === key.id ? 'Removing...' : 'Delete'}
                  </button>
                </div>

                <div className="rounded-lg bg-background p-3">
                  <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted">
                    Fingerprint
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <code className="break-all text-xs text-foreground">{key.fingerprint}</code>

                    <button
                      type="button"
                      onClick={() => void handleCopy(key.fingerprint)}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted">
                  <span>Added: {formatDate(key.createdAt)}</span>

                  <span>Last used: {formatDate(key.lastUsedAt)}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-surface p-5">
        <h2 className="font-semibold text-foreground">Generate an SSH key on Windows</h2>

        <p className="text-sm leading-relaxed text-muted">
          Open PowerShell on your computer and generate an ED25519 key pair:
        </p>

        <pre className="overflow-x-auto rounded-lg bg-background p-4 text-xs leading-relaxed text-foreground">
          <code>{'ssh-keygen -t ed25519 -C "your-email@example.com"'}</code>
        </pre>

        <p className="text-sm text-muted">Then display your public key:</p>

        <pre className="overflow-x-auto rounded-lg bg-background p-4 text-xs leading-relaxed text-foreground">
          <code>{'Get-Content "$env:USERPROFILE\\.ssh\\id_ed25519.pub"'}</code>
        </pre>

        <p className="text-sm leading-relaxed text-muted">
          Copy the displayed public key and paste it into the form above. Keep the file without the{' '}
          <code>.pub</code> extension private and never upload or share it.
        </p>
      </section>
    </div>
  );
}
