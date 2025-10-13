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
  thumbnail: string | null;
  duration: string | null;
  quality: string;
  fileSize: string | null;
  downloadUrl: string | null;
  status: 'pending' | 'completed' | 'failed';
  progress: number;
  createdAt: Date;
}

export type DownloadType = Download;

export interface DownloadProgress {
  downloadId: number;
  progress: number;
  speed: string;
  remainingTime: string;
  status: string;
}
