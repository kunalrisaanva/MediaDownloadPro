import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertDownloadSchema, insertVideoInfoSchema } from "@shared/schema";
import { z } from "zod";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

// Platform detection
function detectPlatform(url: string): string {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('tiktok.com')) return 'tiktok';
  if (url.includes('instagram.com')) return 'instagram';
  if (url.includes('pinterest.com')) return 'pinterest';
  return 'unknown';
}

// Extract video info using yt-dlp
async function extractVideoInfo(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const ytdlp = spawn('yt-dlp', [
      '--dump-json',
      '--no-playlist',
      url
    ]);

    let stdout = '';
    let stderr = '';

    ytdlp.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    ytdlp.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ytdlp.on('close', (code) => {
      if (code === 0) {
        try {
          const info = JSON.parse(stdout);
          resolve(info);
        } catch (e) {
          reject(new Error('Failed to parse video info'));
        }
      } else {
        reject(new Error(`yt-dlp failed: ${stderr}`));
      }
    });
  });
}

// Download video using yt-dlp
async function downloadVideo(url: string, quality: string = 'best'): Promise<string> {
  return new Promise((resolve, reject) => {
    const outputDir = path.join(process.cwd(), 'downloads');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputTemplate = path.join(outputDir, '%(title)s.%(ext)s');
    const formatSelector = quality === 'audio' ? 'bestaudio' : `best[height<=${quality.replace('p', '')}]`;

    const ytdlp = spawn('yt-dlp', [
      '-f', formatSelector,
      '-o', outputTemplate,
      url
    ]);

    let stdout = '';
    let stderr = '';

    ytdlp.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    ytdlp.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ytdlp.on('close', (code) => {
      if (code === 0) {
        // Extract filename from output
        const lines = stdout.split('\n');
        const downloadLine = lines.find(line => line.includes('has already been downloaded'));
        if (downloadLine) {
          const filename = downloadLine.split('] ')[1].split(' has already')[0];
          resolve(filename);
        } else {
          resolve('Downloaded successfully');
        }
      } else {
        reject(new Error(`Download failed: ${stderr}`));
      }
    });
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Analyze video URL
  app.post('/api/analyze', async (req, res) => {
    try {
      const { url } = req.body;
      
      if (!url) {
        return res.status(400).json({ error: 'URL is required' });
      }

      const platform = detectPlatform(url);
      if (platform === 'unknown') {
        return res.status(400).json({ error: 'Unsupported platform' });
      }

      // Check if we already have info for this URL
      const existingInfo = await storage.getVideoInfo(url);
      if (existingInfo) {
        return res.json({
          ...existingInfo,
          platform
        });
      }

      // Extract video info
      const videoInfo = await extractVideoInfo(url);
      
      // Process available qualities
      const availableQualities = [];
      if (videoInfo.formats) {
        const heights = videoInfo.formats
          .filter((f: any) => f.height)
          .map((f: any) => f.height)
          .sort((a: number, b: number) => b - a);
        
        const uniqueHeights = Array.from(new Set(heights));
        availableQualities.push(...uniqueHeights.map((h) => `${h}p`));
      }

      // Save to storage
      const savedInfo = await storage.saveVideoInfo({
        url,
        platform,
        title: videoInfo.title || 'Unknown Title',
        thumbnail: videoInfo.thumbnail || '',
        duration: videoInfo.duration ? formatDuration(videoInfo.duration) : '',
        views: videoInfo.view_count ? formatNumber(videoInfo.view_count) : '',
        channelName: videoInfo.uploader || videoInfo.channel || '',
        channelAvatar: videoInfo.uploader_avatar || '',
        availableQualities,
        metadata: JSON.stringify(videoInfo)
      });

      res.json({
        ...savedInfo,
        platform
      });
    } catch (error) {
      console.error('Analysis error:', error);
      res.status(500).json({ error: 'Failed to analyze video' });
    }
  });

  // Start download
  app.post('/api/download', async (req, res) => {
    try {
      const downloadData = insertDownloadSchema.parse(req.body);
      
      const download = await storage.createDownload({
        ...downloadData,
        status: 'pending'
      });

      res.json({ downloadId: download.id });

      // Start download process in background
      (async () => {
        try {
          const downloadUrl = await downloadVideo(downloadData.url, downloadData.quality);
          await storage.updateDownloadStatus(download.id, 'completed', downloadUrl);
        } catch (error) {
          console.error('Download error:', error);
          await storage.updateDownloadStatus(download.id, 'failed');
        }
      })();
    } catch (error) {
      console.error('Download start error:', error);
      res.status(500).json({ error: 'Failed to start download' });
    }
  });

  // Get download status
  app.get('/api/download/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const download = await storage.getDownloadById(id);
      
      if (!download) {
        return res.status(404).json({ error: 'Download not found' });
      }

      res.json(download);
    } catch (error) {
      console.error('Download status error:', error);
      res.status(500).json({ error: 'Failed to get download status' });
    }
  });

  // Get recent downloads
  app.get('/api/downloads/recent', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const downloads = await storage.getRecentDownloads(limit);
      res.json(downloads);
    } catch (error) {
      console.error('Recent downloads error:', error);
      res.status(500).json({ error: 'Failed to get recent downloads' });
    }
  });

  // Serve downloaded files
  app.get('/api/download/file/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(process.cwd(), 'downloads', filename);
    
    if (fs.existsSync(filePath)) {
      res.download(filePath);
    } else {
      res.status(404).json({ error: 'File not found' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Helper functions
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}
