import { downloads, videoInfo, type Download, type InsertDownload, type VideoInfo, type InsertVideoInfo } from "@shared/schema";

export interface IStorage {
  // Download methods
  createDownload(download: InsertDownload): Promise<Download>;
  getDownloadById(id: number): Promise<Download | undefined>;
  getDownloadsByStatus(status: string): Promise<Download[]>;
  updateDownloadStatus(id: number, status: string, downloadUrl?: string): Promise<void>;
  getRecentDownloads(limit?: number): Promise<Download[]>;
  
  // Video info methods
  getVideoInfo(url: string): Promise<VideoInfo | undefined>;
  saveVideoInfo(videoInfo: InsertVideoInfo): Promise<VideoInfo>;
  updateVideoInfo(url: string, updates: Partial<InsertVideoInfo>): Promise<void>;
}

export class MemStorage implements IStorage {
  private downloads: Map<number, Download> = new Map();
  private videoInfos: Map<string, VideoInfo> = new Map();
  private currentDownloadId = 1;
  private currentVideoInfoId = 1;

  async createDownload(insertDownload: InsertDownload): Promise<Download> {
    const id = this.currentDownloadId++;
    const download: Download = {
      ...insertDownload,
      id,
      createdAt: new Date(),
      duration: insertDownload.duration || null,
      fileSize: insertDownload.fileSize || null,
      thumbnail: insertDownload.thumbnail || null,
      downloadUrl: insertDownload.downloadUrl || null,
      status: insertDownload.status || "pending",
    };
    this.downloads.set(id, download);
    return download;
  }

  async getDownloadById(id: number): Promise<Download | undefined> {
    return this.downloads.get(id);
  }

  async getDownloadsByStatus(status: string): Promise<Download[]> {
    return Array.from(this.downloads.values()).filter(d => d.status === status);
  }

  async updateDownloadStatus(id: number, status: string, downloadUrl?: string): Promise<void> {
    const download = this.downloads.get(id);
    if (download) {
      download.status = status;
      if (downloadUrl) {
        download.downloadUrl = downloadUrl;
      }
      this.downloads.set(id, download);
    }
  }

  async getRecentDownloads(limit = 10): Promise<Download[]> {
    return Array.from(this.downloads.values())
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
      .slice(0, limit);
  }

  async getVideoInfo(url: string): Promise<VideoInfo | undefined> {
    return this.videoInfos.get(url);
  }

  async saveVideoInfo(insertVideoInfo: InsertVideoInfo): Promise<VideoInfo> {
    const id = this.currentVideoInfoId++;
    const videoInfo: VideoInfo = {
      ...insertVideoInfo,
      id,
      lastUpdated: new Date(),
      duration: insertVideoInfo.duration || null,
      thumbnail: insertVideoInfo.thumbnail || null,
      views: insertVideoInfo.views || null,
      channelName: insertVideoInfo.channelName || null,
      channelAvatar: insertVideoInfo.channelAvatar || null,
      availableQualities: insertVideoInfo.availableQualities || null,
      metadata: insertVideoInfo.metadata || null,
    };
    this.videoInfos.set(insertVideoInfo.url, videoInfo);
    return videoInfo;
  }

  async updateVideoInfo(url: string, updates: Partial<InsertVideoInfo>): Promise<void> {
    const existing = this.videoInfos.get(url);
    if (existing) {
      const updated = { ...existing, ...updates, lastUpdated: new Date() };
      this.videoInfos.set(url, updated);
    }
  }
}

export const storage = new MemStorage();
