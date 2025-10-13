import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { DownloadType } from "@/types";

interface DownloadProgressProps {
  downloadId: number;
}

export function DownloadProgress({ downloadId }: DownloadProgressProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState(0);

  const { data: download, isLoading } = useQuery<DownloadType>({
    queryKey: ["/api/download", downloadId],
    refetchInterval: (query) => {
      const data = queryClient.getQueryData<DownloadType>(query.queryKey);
      return data?.status === "pending" ? 1000 : false;
    },
    enabled: Boolean(downloadId),
    retry: 3,
    staleTime: 2000,
  });

  useEffect(() => {
    if (download?.progress != null) {
      setProgress(download.progress);
    }

    if (download?.status === "completed") {
      setProgress(100);
      toast({
        title: "Download completed!",
        description: "Your video is ready to download",
        duration: 5000,
      });
    } else if (download?.status === "failed") {
      toast({
        title: "Download failed",
        description: "Please try again with a different quality",
        variant: "destructive",
        duration: 5000,
      });
    }
  }, [download?.progress, download?.status, toast]);

  const handleCancel = async () => {
    if (!downloadId) return;

    try {
      const response = await fetch(`/api/download/${downloadId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to cancel download');
      }

      await queryClient.invalidateQueries({ queryKey: ["/api/download", downloadId] });
      
      toast({
        title: "Download cancelled",
        description: "The download has been stopped",
      });
    } catch (error) {
      console.error('Cancel error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to cancel download",
        variant: "destructive",
      });
    }
  };

  const handleDownloadFile = async () => {
    if (!download?.downloadUrl) return;

    try {
      const response = await fetch(`/api/download/file/${encodeURIComponent(download.downloadUrl)}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Download failed');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = download.title || 'download';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Download started",
        description: "Your file will be saved to your downloads folder",
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download failed",
        description: error instanceof Error ? error.message : "Failed to download the file",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading download status...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto shadow-2xl">
      <CardContent className="p-8">
        <div className="text-center space-y-6">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto">
            <Download className="text-white text-xl w-8 h-8 animate-bounce" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {download?.status === "completed" ? "Download Completed!" : "Downloading Video"}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {download?.status === "completed" 
                ? "Your video is ready for download" 
                : "Please wait while we prepare your download..."}
            </p>
          </div>
          
          {download?.status !== "completed" && (
            <div className="space-y-3">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress 
                value={progress} 
                className="w-full"
                max={100}
              />
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>{download?.status || 'Processing video...'}</span>
                <span>
                  {download?.status === 'pending' && progress < 100
                    ? `${100 - Math.round(progress)}% remaining`
                    : ''}
                </span>
              </div>
            </div>
          )}
          
          <div className="space-y-3">
            {download?.status === "completed" ? (
              <Button
                onClick={handleDownloadFile}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3 px-6 rounded-xl"
                disabled={!download.downloadUrl}
              >
                <Download className="mr-2 h-4 w-4" />
                Download File
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={handleCancel}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                disabled={download?.status === "failed"}
              >
                <X className="mr-2 h-4 w-4" />
                Cancel Download
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
