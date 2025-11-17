import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Download, Copy, QrCode, Video, Music, Clock, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { VideoInfo } from "@/types";

interface VideoPreviewProps {
  videoInfo: VideoInfo;
}

export function VideoPreview({ videoInfo }: VideoPreviewProps) {
  const [selectedQuality, setSelectedQuality] = useState("720p");
  const [downloadType, setDownloadType] = useState("video");
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const handleDownload = async () => {
    try {
      setDownloading(true);
      setProgress(0);

      const quality = downloadType === "audio" ? "audio" : selectedQuality;

      // Make request to download endpoint
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: videoInfo.url,
          platform: videoInfo.platform,
          title: videoInfo.title,
          thumbnail: videoInfo.thumbnail,
          duration: videoInfo.duration,
          quality: quality,
          fileSize: "Unknown",
        }),
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'video.mp4';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = decodeURIComponent(filenameMatch[1].replace(/['"]/g, ''));
        }
      }

      // Read the stream with progress tracking
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Stream not supported');
      }

      const contentLength = response.headers.get('Content-Length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;

      const chunks: Uint8Array[] = [];
      let receivedLength = 0;

      // Read stream
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        chunks.push(value);
        receivedLength += value.length;

        // Update progress
        if (total > 0) {
          const currentProgress = Math.round((receivedLength / total) * 100);
          setProgress(currentProgress);
        } else {
          // Indeterminate progress
          setProgress((prev) => Math.min(prev + 5, 95));
        }
      }

      // Combine chunks into blob
      // Ensure each chunk is converted to an ArrayBuffer-backed Uint8Array so Blob receives ArrayBuffer parts
      const blob = new Blob(chunks.map((c) => new Uint8Array(c).buffer));
      
      // Create download link
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);

      setProgress(100);

      toast({
        title: "Download complete",
        description: "Video has been downloaded to your device",
      });

      // Reset after a delay
      setTimeout(() => {
        setDownloading(false);
        setProgress(0);
      }, 2000);

    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
      setDownloading(false);
      setProgress(0);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(videoInfo.url);
      toast({
        title: "Link copied",
        description: "Video link has been copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Please copy the link manually",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="max-w-6xl mx-auto shadow-2xl">
      <CardContent className="p-8">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Video Info */}
          <div className="space-y-6">
            <div className="aspect-video bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden">
              {videoInfo.thumbnail ? (
                <img
                  src={videoInfo.thumbnail}
                  alt="Video thumbnail"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Video className="w-16 h-16 text-gray-400" />
                </div>
              )}
            </div>
            
            <div className="space-y-3">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                {videoInfo.title}
              </h3>
              
              <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                {videoInfo.duration && (
                  <span className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    {videoInfo.duration}
                  </span>
                )}
                {videoInfo.views && (
                  <span className="flex items-center">
                    <Eye className="w-4 h-4 mr-1" />
                    {videoInfo.views} views
                  </span>
                )}
              </div>
              
              {videoInfo.channelName && (
                <div className="flex items-center space-x-2">
                  {videoInfo.channelAvatar && (
                    <img
                      src={videoInfo.channelAvatar}
                      alt="Channel avatar"
                      className="w-8 h-8 rounded-full"
                    />
                  )}
                  <span className="font-medium text-gray-900 dark:text-white">
                    {videoInfo.channelName}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Download Options */}
          <div className="space-y-6">
            <h4 className="text-xl font-semibold text-gray-900 dark:text-white">
              Download Options
            </h4>
            
            {/* Show progress if downloading */}
            {downloading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Downloading...</span>
                  <span className="font-medium text-gray-900 dark:text-white">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}
            
            {/* Quality Selection */}
            {!downloading && videoInfo.availableQualities && videoInfo.availableQualities.length > 0 && (
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Video Quality
                </Label>
                <RadioGroup value={selectedQuality} onValueChange={setSelectedQuality}>
                  <div className="space-y-2">
                    {videoInfo.availableQualities.map((quality) => (
                      <div key={quality} className="flex items-center space-x-2">
                        <RadioGroupItem value={quality} id={quality} />
                        <Label htmlFor={quality} className="flex-1 cursor-pointer">
                          <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                            <div className="flex items-center space-x-3">
                              <span className="font-medium text-gray-900 dark:text-white">
                                {quality === "2160p" ? "4K Ultra HD" : 
                                 quality === "1440p" ? "2K HD" :
                                 quality === "1080p" ? "Full HD" :
                                 quality === "720p" ? "HD" : quality}
                              </span>
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                MP4
                              </span>
                            </div>
                            {quality === "1080p" && (
                              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                Best Quality
                              </Badge>
                            )}
                            {quality === "720p" && (
                              <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                Recommended
                              </Badge>
                            )}
                          </div>
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* Download Type */}
            {!downloading && (
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Download Type
                </Label>
                <RadioGroup value={downloadType} onValueChange={setDownloadType}>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <RadioGroupItem value="video" id="video" className="sr-only" />
                      <Label htmlFor="video" className="cursor-pointer">
                        <div className="flex items-center justify-center p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          <div className="text-center">
                            <Video className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                            <span className="block text-sm font-medium text-gray-900 dark:text-white">
                              Video + Audio
                            </span>
                          </div>
                        </div>
                      </Label>
                    </div>
                    
                    <div>
                      <RadioGroupItem value="audio" id="audio" className="sr-only" />
                      <Label htmlFor="audio" className="cursor-pointer">
                        <div className="flex items-center justify-center p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          <div className="text-center">
                            <Music className="w-8 h-8 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
                            <span className="block text-sm font-medium text-gray-900 dark:text-white">
                              Audio Only
                            </span>
                          </div>
                        </div>
                      </Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* Download Actions */}
            <div className="space-y-3">
              <Button
                onClick={handleDownload}
                disabled={downloading}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {downloading ? (
                  <>
                    <Download className="mr-2 h-4 w-4 animate-pulse" />
                    Downloading... {progress}%
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Start Download
                  </>
                )}
              </Button>
              
              {!downloading && (
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    onClick={handleCopyLink}
                    className="flex items-center justify-center"
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Link
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="flex items-center justify-center"
                    onClick={() => toast({ title: "QR Code feature coming soon!" })}
                  >
                    <QrCode className="mr-2 h-4 w-4" />
                    QR Code
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}