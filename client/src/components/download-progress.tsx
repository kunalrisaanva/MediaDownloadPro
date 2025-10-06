import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { Download as DownloadType } from "@/types";

interface DownloadProgressProps {
  downloadId: number;
}

export function DownloadProgress({ downloadId }: DownloadProgressProps) {
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();
// const response = await apiRequest("POST", "/api/analyze", { url });
  const { data: download, isLoading } = useQuery<DownloadType>({
    queryKey: ["/api/download", downloadId],
    refetchInterval: 1000,
    enabled: !!downloadId,
  });

  useEffect(() => {
    // console.log("Download data:", download);
    if (download?.status === "completed") {
      setProgress(100);
      toast({
        title: "Download completed!",
        description: "Your video is ready for download",
      });
    } else if (download?.status === "failed") {
      toast({
        title: "Download failed",
        description: "Please try again with a different quality",
        variant: "destructive",
      });
    } else if (download?.status === "pending") {
      // Simulate progress for pending downloads
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 10;
        });
      }, 500);

      return () => clearInterval(interval);
    }
  }, [download, toast]);

  const handleCancel = () => {
    // TODO: Implement cancel functionality
    toast({
      title: "Download cancelled",
      description: "The download has been stopped",
    });
  };

  const handleDownloadFile = () => {
    if (download?.downloadUrl) {
      window.open(`/api/download/file/${download.downloadUrl}`, '_blank');
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
              <Progress value={progress} className="w-full" />
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>Processing video...</span>
                <span>{100 - Math.round(progress)}% remaining</span>
              </div>
            </div>
          )}
          
          <div className="space-y-3">
            {download?.status === "completed" ? (
              <Button
                onClick={handleDownloadFile}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3 px-6 rounded-xl"
              >
                <Download className="mr-2 h-4 w-4" />
                Download File
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={handleCancel}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
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
