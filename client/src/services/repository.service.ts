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
};
