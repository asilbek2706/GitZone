import { api } from '@/lib/api';
import { Repository } from '@/types/api';

export interface CreateRepositoryRequest {
  name: string;
  description?: string;
  isPrivate?: boolean;
}

export interface RepositoryListResponse {
  success: boolean;
  data: {
    repositories: Repository[];
  };
}

export interface RepositoryResponse {
  success: boolean;
  data: {
    repository: Repository;
  };
}

export const repositoryService = {
  async getUserRepositories(username: string): Promise<RepositoryListResponse> {
    return api.get<RepositoryListResponse>(`api/repositories/${username}`);
  },

  async createRepository(
    token: string,
    data: CreateRepositoryRequest,
  ): Promise<RepositoryResponse> {
    return api.post<RepositoryResponse>('api/repositories', data, { token });
  },

  async deleteRepository(
    token: string,
    username: string,
    name: string,
  ): Promise<{ success: boolean; message: string }> {
    return api.delete<{ success: boolean; message: string }>(
      `api/repositories/${username}/${name}`,
      { token },
    );
  },
};
