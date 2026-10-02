export type User = { id: string; username: string; email: string; name: string | null; avatarUrl: string | null; bio?: string | null };
export type Repository = { id: string; name: string; description: string | null; isPrivate: boolean; defaultBranch: string; createdAt: string; updatedAt: string; owner?: User };
export type TreeEntry = { name: string; path: string; kind: 'directory' | 'file' | 'symlink' | 'submodule'; size: number | null; oid: string };
export type ApiResponse<T> = { success: boolean; data: T; message?: string };
