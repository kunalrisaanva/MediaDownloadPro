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
async function downloadVideo(url: string, quality: string = 'best', downloadId: number): Promise<string> {
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
      '--progress',
      url
    ]);

    let stdout = '';
    let stderr = '';

    ytdlp.stdout.on('data', async (data) => {
      stdout += data.toString();
      
      // Improved progress parsing
      const progressMatch = data.toString().match(/(\d+\.?\d*)%/);
      if (progressMatch) {
        const progress = parseFloat(progressMatch[1]);
        try {
          await storage.updateDownloadProgress(downloadId, progress);
        } catch (error) {
          console.error('Failed to update progress:', error);
        }
      }
    });

    ytdlp.on('close', async (code) => {
      if (code === 0) {
        const lines = stdout.split('\n');
        const filenameLine = lines.find(line => line.includes('[download] Destination:'));
        let filename = '';
        
        if (filenameLine) {
          filename = filenameLine.split('Destination: ')[1];
        } else {
          const downloadLine = lines.find(line => line.includes('has already been downloaded'));
          if (downloadLine) {
            filename = downloadLine.split('] ')[1].split(' has already')[0];
          }
        }
        
        if (filename) {
          await storage.updateDownloadProgress(downloadId, 100);
          resolve(filename);
        } else {
          reject(new Error('Could not determine output filename'));
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

      console.log("starting analysis for URL:", url);
      
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
        // progress: 0 // Remove this line if the type does not support 'progress'
      });

      res.json({ downloadId: download.id });

      // Start download process in background
      (async () => {
        try {
          const downloadUrl = await downloadVideo(downloadData.url, downloadData.quality, download.id);
          await storage.updateDownloadStatus(download.id, 'completed', downloadUrl);
          await storage.updateDownloadProgress(download.id, 100);
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

  // delete download by id
  // app.delete('/api/downloads/:id', async (req, res) => {
  //   try {
  //     const { id } = req.params;
  //     await storage.deleteDownload(parseInt(id));
  //     res.status(200).json({ message: 'Download removed' });
  //   } catch (error) {
  //     res.status(500).json({ error: 'Failed to remove download' });
  //   }
  // });
app.delete('/api/downloads/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid download ID' });
    }

    console.log("Deleting download with ID:", id);
    
    await storage.deleteDownload(id);
    console.log("Download deleted successfully");
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Delete download error:', error);
    if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as any).message === 'string' && (error as any).message.includes('not found')) {
      return res.status(404).json({ error: 'Download not found' });
    }
    return res.status(500).json({ error: 'Failed to delete download' });
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

  // Clear all downloads
  app.delete('/api/downloads', async (req, res) => {
    try {
      await storage.clearAllDownloads();
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Clear history error:', error);
      return res.status(500).json({ error: 'Failed to clear download history' });
    }
  });

  app.post('/api/download/:id/cancel', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid download ID' });
      }

      await storage.updateDownloadStatus(id, 'failed');
      res.json({ success: true });
    } catch (error) {
      console.error('Cancel download error:', error);
      res.status(500).json({ message: 'Failed to cancel download' });
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
