import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Download, Copy, QrCode, Video, Music, Clock, Eye, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { DownloadProgress } from "@/components/download-progress";
import type { VideoInfo } from "@/types";

interface VideoPreviewProps {
  videoInfo: VideoInfo;
}

export function VideoPreview({ videoInfo }: VideoPreviewProps) {
  const [selectedQuality, setSelectedQuality] = useState("720p");
  const [downloadType, setDownloadType] = useState("video");
  const [downloadId, setDownloadId] = useState<number | null>(null);
  const { toast } = useToast();

  const downloadMutation = useMutation({
    mutationFn: async ({ url, quality, title, platform, thumbnail, duration }: any) => {
      const response = await apiRequest("POST", "/api/download", {
        url,
        platform,
        title,
        thumbnail,
        duration,
        quality,
        fileSize: "Unknown",
      });
      return response.json();
    },
    onSuccess: (data) => {
      setDownloadId(data.downloadId);
      toast({
        title: "Download started",
        description: "Your video is being prepared for download",
      });
    },
    onError: (error) => {
      toast({
        title: "Download failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDownload = () => {
    downloadMutation.mutate({
      url: videoInfo.url,
      quality: downloadType === "audio" ? "audio" : selectedQuality,
      title: videoInfo.title,
      platform: videoInfo.platform,
      thumbnail: videoInfo.thumbnail,
      duration: videoInfo.duration,
    });
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

  if (downloadId) {
    return <DownloadProgress downloadId={downloadId} />;
  }

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
            
            {/* Quality Selection */}
            {videoInfo.availableQualities && videoInfo.availableQualities.length > 0 && (
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

            {/* Download Actions */}
            <div className="space-y-3">
              <Button
                onClick={handleDownload}
                disabled={downloadMutation.isPending}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                {downloadMutation.isPending ? (
                  <>
                    <Download className="mr-2 h-4 w-4 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Start Download
                  </>
                )}
              </Button>
              
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
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
