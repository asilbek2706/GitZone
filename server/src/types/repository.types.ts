export interface RepositoryResponse {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  isPrivate: boolean;
  defaultBranch: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RepositoryOwner {
  id: string;
  username: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface RepositoryWithOwner extends RepositoryResponse {
  owner: RepositoryOwner;
}
