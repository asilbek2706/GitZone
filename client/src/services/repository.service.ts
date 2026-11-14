// src/services/repository.service.ts
import { api } from '@/lib/api';

export interface Repository {
  id: string;
  name: string;
  description: string | null;
  isPrivate: boolean;
  defaultBranch: string;
  createdAt: string;
  updatedAt: string;
  owner?: {
    id: string;
    username: string;
    name: string | null;
    avatarUrl: string | null;
  };
}

export interface RepositoryListResponse {
  success: boolean;
  data: {
    repositories: Repository[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export interface RepositoryResponse {
  success: boolean;
  data: {
    repository: Repository;
  };
}

export interface GitReference {
  name: string;
  fullName: string;
  oid: string;
  objectType: string;
}

export interface GitRefsResponse {
  success: boolean;
  data: {
    refs: {
      objectFormat: string;
      symbolicHead: string | null;
      defaultBranch: string;
      head: GitReference | null;
      branches: GitReference[];
      tags: GitReference[];
    };
  };
}

export interface GitTreeEntry {
  name: string;
  path: string;
  mode: string;
  objectType: string;
  oid: string;
  size: number | null;
  kind: 'directory' | 'file' | 'symlink' | 'submodule';
}

export interface GitTreeResponse {
  success: boolean;
  data: {
    tree: {
      objectFormat: string;
      ref: {
        name: string;
        fullName: string;
        oid: string | null;
      };
      path: string;
      entries: GitTreeEntry[];
    };
  };
}

export interface GitContentResponse {
  success: boolean;
  data: {
    content: {
      path: string;
      ref: string;
      oid: string;
      size: number;
      encoding: 'utf-8';
      content: string;
    };
  };
}

export interface CreateRepositoryRequest {
  name: string;
  description?: string;
  isPrivate?: boolean;
}

export interface UpdateRepositoryRequest {
  name?: string;
  description?: string | null;
  isPrivate?: boolean;
}

export const repositoryService = {
  // POST /api/repositories - Create a repository
  async createRepository(data: CreateRepositoryRequest): Promise<RepositoryResponse> {
    const response = await api.post<RepositoryResponse>('/api/repositories', data);
    return response.data;
  },

  // GET /api/repositories - List authenticated user's repositories
  async getMyRepositories(): Promise<RepositoryListResponse> {
    const response = await api.get<RepositoryListResponse>('/api/repositories');
    return response.data;
  },

  // GET /api/repositories/{username} - List public repositories of a user
  async getUserRepositories(username: string): Promise<RepositoryListResponse> {
    const response = await api.get<RepositoryListResponse>(`/api/repositories/${username}`);
    return response.data;
  },

  // GET /api/repositories/{username}/{name} - Get a repository
  async getRepository(username: string, name: string): Promise<RepositoryResponse> {
    const response = await api.get<RepositoryResponse>(`/api/repositories/${username}/${name}`);
    return response.data;
  },

  // PATCH /api/repositories/{username}/{name} - Update a repository
  async updateRepository(
    username: string,
    name: string,
    data: UpdateRepositoryRequest,
  ): Promise<RepositoryResponse> {
    const response = await api.patch<RepositoryResponse>(
      `/api/repositories/${username}/${name}`,
      data,
    );
    return response.data;
  },

  // DELETE /api/repositories/{username}/{name} - Delete a repository
  async deleteRepository(username: string, name: string): Promise<{ success: boolean }> {
    const response = await api.delete<{ success: boolean }>(
      `/api/repositories/${username}/${name}`,
    );
    return response.data;
  },

  // --- COLLABORATORS ---
  async addCollaborator(
    username: string,
    name: string,
    collaboratorUsername: string,
    permission: 'READ' | 'WRITE',
  ) {
    const response = await api.post(`/api/repositories/${username}/${name}/collaborators`, {
      username: collaboratorUsername,
      permission,
    });
    return response.data;
  },

  async getCollaborators(username: string, name: string) {
    const response = await api.get(`/api/repositories/${username}/${name}/collaborators`);
    return response.data;
  },

  async removeCollaborator(username: string, name: string, collaboratorUsername: string) {
    const response = await api.delete(
      `/api/repositories/${username}/${name}/collaborators/${collaboratorUsername}`,
    );
    return response.data;
  },

  // --- STARS & WATCHES ---
  async starRepository(username: string, name: string) {
    const response = await api.post(`/api/repositories/${username}/${name}/star`, {});
    return response.data;
  },

  async unstarRepository(username: string, name: string) {
    const response = await api.delete(`/api/repositories/${username}/${name}/star`);
    return response.data;
  },

  async getStarCount(username: string, name: string) {
    const response = await api.get(`/api/repositories/${username}/${name}/stars/count`);
    return response.data;
  },

  async forkRepository(username: string, name: string) {
    const response = await api.post(`/api/repositories/${username}/${name}/fork`, {});
    return response.data;
  },

  async getGitRefs(username: string, name: string): Promise<GitRefsResponse> {
    const response = await api.get<GitRefsResponse>(
      `/api/repositories/${encodeURIComponent(username)}/${encodeURIComponent(name)}/git/refs`,
    );
    return response.data;
  },

  async getGitTree(
    username: string,
    name: string,
    ref?: string,
    path = '',
  ): Promise<GitTreeResponse> {
    const response = await api.get<GitTreeResponse>(
      `/api/repositories/${encodeURIComponent(username)}/${encodeURIComponent(name)}/git/tree`,
      { params: { ref, path } },
    );
    return response.data;
  },

  async getGitContent(
    username: string,
    name: string,
    ref: string,
    path: string,
  ): Promise<GitContentResponse> {
    const response = await api.get<GitContentResponse>(
      `/api/repositories/${encodeURIComponent(username)}/${encodeURIComponent(name)}/git/contents`,
      { params: { ref, path } },
    );
    return response.data;
  },
};
