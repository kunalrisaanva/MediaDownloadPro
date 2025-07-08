export interface VideoInfo {
  id: number;
  url: string;
  platform: string;
  title: string;
  thumbnail?: string;
  duration?: string;
  views?: string;
  channelName?: string;
  channelAvatar?: string;
  availableQualities?: string[];
  metadata?: string;
  lastUpdated?: Date;
}

export interface Download {
  id: number;
  url: string;
  platform: string;
  title: string;
  thumbnail?: string;
  duration?: string;
  quality: string;
  fileSize?: string;
  downloadUrl?: string;
  status: string;
  createdAt?: Date;
}

export interface DownloadProgress {
  downloadId: number;
  progress: number;
  speed: string;
  remainingTime: string;
  status: string;
}
