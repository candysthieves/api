export type CleanupUnusedAvatarFilesContract = {
  activeFileIds: string[];
  olderThanHours?: number;
};
