'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Copy,
  FileText,
  Folder,
  GitBranch,
  LoaderCircle,
} from 'lucide-react';

import {
  repositoryService,
  type GitReference,
  type GitTreeEntry,
  type GitTreeResponse,
  type GitRefsResponse,
} from '@/services/repository.service';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

type RepositoryRefs = GitRefsResponse['data']['refs'];
type RepositoryTree = GitTreeResponse['data']['tree'];

export default function RepositoryCodePage() {
  const params = useParams<{ owner: string; repo: string }>();
  const owner = params.owner;
  const repo = params.repo;

  const [refs, setRefs] = useState<RepositoryRefs | null>(null);
  const [tree, setTree] = useState<RepositoryTree | null>(null);
  const [selectedRef, setSelectedRef] = useState('');
  const [selectedFile, setSelectedFile] = useState<{
    path: string;
    content: string;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [fileLoading, setFileLoading] = useState(false);
  const [error, setError] = useState('');
  const [copyStatus, setCopyStatus] = useState(false);

  const cloneUrl = useMemo(
    () => `${API_BASE_URL}/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}.git`,
    [owner, repo],
  );

  const isEmptyRepository = refs !== null && refs.head === null && refs.branches.length === 0;

  const loadTree = useCallback(
    async (ref: string, path = '') => {
      const response = await repositoryService.getGitTree(owner, repo, ref || undefined, path);

      setTree(response.data.tree);
      setSelectedFile(null);
    },
    [owner, repo],
  );

  useEffect(() => {
    let active = true;

    const loadRepository = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await repositoryService.getGitRefs(owner, repo);

        if (!active) return;

        const repositoryRefs = response.data.refs;
        setRefs(repositoryRefs);

        const defaultRef = repositoryRefs.head?.name || repositoryRefs.defaultBranch;

        setSelectedRef(defaultRef);

        const treeResponse = await repositoryService.getGitTree(
          owner,
          repo,
          repositoryRefs.head ? defaultRef : undefined,
          '',
        );

        if (!active) return;

        setTree(treeResponse.data.tree);
      } catch {
        if (active) {
          setError('Repository ma’lumotlarini yuklashda xatolik yuz berdi.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadRepository();

    return () => {
      active = false;
    };
  }, [owner, repo]);

  const handleNavigate = async (path: string) => {
    setError('');
    setLoading(true);

    try {
      await loadTree(selectedRef, path);
    } catch {
      setError('Papka tarkibini yuklashda xatolik yuz berdi.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBranch = async (ref: string) => {
    setSelectedRef(ref);
    setSelectedFile(null);
    setError('');
    setLoading(true);

    try {
      await loadTree(ref);
    } catch {
      setError('Branch ma’lumotlarini yuklashda xatolik yuz berdi.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenFile = async (entry: GitTreeEntry) => {
    setFileLoading(true);
    setError('');

    try {
      const response = await repositoryService.getGitContent(owner, repo, selectedRef, entry.path);

      setSelectedFile({
        path: response.data.content.path,
        content: response.data.content.content,
      });
    } catch (err: unknown) {
      const errorData = err as {
        response?: {
          data?: {
            code?: string;
          };
        };
      };

      if (errorData.response?.data?.code === 'GIT_FILE_BINARY') {
        setError('Bu binary faylni matn ko‘rinishida ochib bo‘lmaydi.');
      } else {
        setError('Fayl tarkibini yuklashda xatolik yuz berdi.');
      }
    } finally {
      setFileLoading(false);
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus(true);
      window.setTimeout(() => setCopyStatus(false), 2000);
    } catch {
      setError('Nusxalash amalga oshmadi. Matnni qo‘lda nusxalang.');
    }
  };

  const breadcrumbs = tree?.path
    ? tree.path.split('/').map((part, index, parts) => ({
        name: part,
        path: parts.slice(0, index + 1).join('/'),
      }))
    : [];

  const commands = [
    `git init -b ${refs?.defaultBranch || 'main'}`,
    `git remote add origin ${cloneUrl}`,
    'git add .',
    'git commit -m "Initial commit"',
    `git push -u origin ${refs?.defaultBranch || 'main'}`,
  ].join('\n');

  if (loading && !tree) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <LoaderCircle className="animate-spin text-muted" size={24} />
      </div>
    );
  }

  if (error && !refs) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 text-center">
        <p className="text-sm text-danger">{error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 text-sm font-medium text-foreground underline"
        >
          Qayta urinish
        </button>
      </div>
    );
  }

  if (isEmptyRepository) {
    return (
      <section className="mx-auto max-w-3xl py-10">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl border border-border bg-surface">
            <GitBranch size={22} className="text-muted" />
          </div>

          <h1 className="text-lg font-semibold text-foreground">This repository is empty</h1>

          <p className="mt-2 text-sm text-muted">
            Get started by pushing your existing project to GitZone.
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-medium text-foreground">Quick setup</span>

            <button
              type="button"
              onClick={() => void handleCopy(commands)}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-surface-muted"
            >
              {copyStatus ? <Check size={14} /> : <Copy size={14} />}
              {copyStatus ? 'Copied' : 'Copy commands'}
            </button>
          </div>

          <pre className="overflow-x-auto p-5 text-xs leading-7 text-foreground">
            <code>{commands}</code>
          </pre>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {refs && refs.branches.length > 0 && (
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex items-center gap-2">
            <GitBranch size={16} className="shrink-0 text-muted" />

            <select
              value={selectedRef}
              onChange={(event) => void handleSelectBranch(event.target.value)}
              className="max-w-52 cursor-pointer rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary"
            >
              {refs.branches.map((branch: GitReference) => (
                <option key={branch.fullName} value={branch.name}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>

          {tree && <span className="text-xs text-muted">{tree.entries.length} items</span>}
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      {selectedFile ? (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="rounded-lg p-1.5 text-muted transition hover:bg-surface-muted hover:text-foreground"
                aria-label="Back to files"
              >
                <ArrowLeft size={17} />
              </button>

              <FileText size={16} className="shrink-0 text-muted" />

              <span className="truncate text-sm font-medium text-foreground">
                {selectedFile.path}
              </span>
            </div>

            <button
              type="button"
              onClick={() => void handleCopy(selectedFile.content)}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-surface-muted"
            >
              {copyStatus ? <Check size={14} /> : <Copy size={14} />}
              {copyStatus ? 'Copied' : 'Copy'}
            </button>
          </div>

          <pre className="max-h-[700px] overflow-auto p-5 text-xs leading-6 text-foreground">
            <code>{selectedFile.content}</code>
          </pre>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <div className="flex min-h-12 flex-wrap items-center gap-1 border-b border-border px-4 py-3">
            <button
              type="button"
              onClick={() => void handleNavigate('')}
              className="text-sm font-medium text-foreground transition hover:text-primary"
            >
              {repo}
            </button>

            {breadcrumbs.map((crumb) => (
              <div key={crumb.path} className="flex min-w-0 items-center gap-1">
                <ChevronRight size={14} className="shrink-0 text-muted" />

                <button
                  type="button"
                  onClick={() => void handleNavigate(crumb.path)}
                  className="max-w-40 truncate text-sm text-muted transition hover:text-foreground"
                >
                  {crumb.name}
                </button>
              </div>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <LoaderCircle className="animate-spin text-muted" size={22} />
            </div>
          ) : tree && tree.entries.length > 0 ? (
            <div>
              {tree.entries.map((entry) => (
                <button
                  key={entry.path}
                  type="button"
                  onClick={() => {
                    if (entry.kind === 'directory') {
                      void handleNavigate(entry.path);
                    } else if (entry.kind === 'file') {
                      void handleOpenFile(entry);
                    }
                  }}
                  disabled={entry.kind === 'symlink' || entry.kind === 'submodule'}
                  className="flex w-full items-center gap-3 border-b border-border/70 px-4 py-3 text-left transition last:border-b-0 hover:bg-surface-muted disabled:cursor-default disabled:opacity-60"
                >
                  {entry.kind === 'directory' ? (
                    <Folder size={17} className="shrink-0 text-muted" />
                  ) : (
                    <FileText size={17} className="shrink-0 text-muted" />
                  )}

                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                    {entry.name}
                  </span>

                  {entry.kind === 'directory' && (
                    <ChevronRight size={15} className="shrink-0 text-muted" />
                  )}
                </button>
              ))}
            </div>
          ) : (
            <p className="py-12 text-center text-sm text-muted">This directory is empty.</p>
          )}
        </div>
      )}

      {fileLoading && (
        <div className="flex items-center gap-2 text-xs text-muted">
          <LoaderCircle size={14} className="animate-spin" />
          Loading file...
        </div>
      )}
    </section>
  );
}
