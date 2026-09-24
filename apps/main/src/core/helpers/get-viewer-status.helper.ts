import { UserViewerStatus } from '../enums/user-viewer-status.enum.js';

export const getViewerStatus = (
  resourceOwnerId: string,
  currentUserId: string | null,
): UserViewerStatus => {
  if (currentUserId === resourceOwnerId) {
    return UserViewerStatus.OWNER;
  }

  return UserViewerStatus.USER;
};
