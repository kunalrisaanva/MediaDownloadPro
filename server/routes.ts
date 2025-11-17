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

// NEW: Stream video directly to client
async function streamVideoToClient(url: string, quality: string, res: any, downloadId: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const formatSelector = quality === 'audio' ? 'bestaudio' : `best[height<=${quality.replace('p', '')}]`;

    // First get video info to set filename
    const infoProcess = spawn('yt-dlp', [
      '--dump-json',
      '--no-playlist',
      url
    ]);

    let infoData = '';
    
    infoProcess.stdout.on('data', (data) => {
      infoData += data.toString();
    });

    infoProcess.on('close', async (infoCode) => {
      if (infoCode !== 0) {
        reject(new Error('Failed to get video info'));
        return;
      }

      try {
        const videoInfo = JSON.parse(infoData);
        const ext = quality === 'audio' ? 'mp3' : 'mp4';
        const filename = `${videoInfo.title}.${ext}`.replace(/[/\\?%*:|"<>]/g, '-');
        
        // Set headers for download
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
        res.setHeader('Content-Type', quality === 'audio' ? 'audio/mpeg' : 'video/mp4');
        res.setHeader('Transfer-Encoding', 'chunked');

        // Start download process
        const ytdlp = spawn('yt-dlp', [
          '-f', formatSelector,
          '-o', '-', // Output to stdout
          '--newline', // Progress on new lines
          url
        ]);

        let totalSize = 0;
        let downloadedSize = 0;

        // Pipe video data to response
        ytdlp.stdout.on('data', (chunk) => {
          downloadedSize += chunk.length;
          res.write(chunk);
          
          // Update progress (approximate)
          if (totalSize > 0) {
            const progress = Math.min(Math.round((downloadedSize / totalSize) * 100), 99);
            storage.updateDownloadProgress(downloadId, progress).catch(console.error);
          }
        });

        ytdlp.stderr.on('data', (data) => {
          const output = data.toString();
          console.log('yt-dlp:', output);
          
          // Try to extract total size for progress calculation
          const sizeMatch = output.match(/\[download\]\s+(\d+\.\d+)([KMG])iB/);
          if (sizeMatch && totalSize === 0) {
            const size = parseFloat(sizeMatch[1]);
            const unit = sizeMatch[2];
            totalSize = unit === 'M' ? size * 1024 * 1024 : 
                       unit === 'G' ? size * 1024 * 1024 * 1024 : 
                       size * 1024;
          }
        });

        ytdlp.on('close', async (code) => {
          if (code === 0) {
            await storage.updateDownloadProgress(downloadId, 100);
            await storage.updateDownloadStatus(downloadId, 'completed', filename);
            res.end();
            resolve();
          } else {
            await storage.updateDownloadStatus(downloadId, 'failed');
            if (!res.headersSent) {
              res.status(500).json({ error: 'Download failed' });
            }
            reject(new Error('Download failed'));
          }
        });

        ytdlp.on('error', async (error) => {
          console.error('yt-dlp error:', error);
          await storage.updateDownloadStatus(downloadId, 'failed');
          if (!res.headersSent) {
            res.status(500).json({ error: 'Download process error' });
          }
          reject(error);
        });

        // Handle client disconnect
        res.on('close', () => {
          console.log('Client disconnected, killing yt-dlp process');
          ytdlp.kill();
        });

      } catch (error) {
        reject(error);
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

  // UPDATED: Start download and stream to client
  app.post('/api/download', async (req, res) => {
    try {
      const downloadData = insertDownloadSchema.parse(req.body);
      
      // Create download record
      const download = await storage.createDownload({
        ...downloadData,
        status: 'pending'
      });

      console.log('Starting download for:', downloadData.url);

      // Stream video directly to client
      await streamVideoToClient(downloadData.url, downloadData.quality, res, download.id);

    } catch (error) {
      console.error('Download start error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to start download' });
      }
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

  // Delete download by id
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

  // Cancel download
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