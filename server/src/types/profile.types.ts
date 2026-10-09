export interface PublicUserProfile {
  id: string;
  username: string;
  name: string | null;
  bio: string | null;
  avatarUrl: string | null;
  location: string | null;
  website: string | null;
  createdAt: Date;
}
