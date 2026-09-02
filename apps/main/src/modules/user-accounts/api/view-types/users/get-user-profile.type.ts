export type GetUserProfileType = {
  id: string;
  username: string;
  description: string;
  avatarUrl: string;
  avatarPreviewUrl: string;

  followersCount: number;
  followingCount: number;
  publicationsCount: number;

  isOwner: boolean;
};
