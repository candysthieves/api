type AvatarProfileType = {
  fileId: string;
  url: string;
  width: number;
  height: number;
};

export type GetUserProfileType = {
  id: string;
  username: string;
  description: string;
  avatarUrl: AvatarProfileType;
  avatarPreviewUrl: AvatarProfileType;

  followersCount: number;
  followingCount: number;
  publicationsCount: number;

  isOwner: boolean;
};
