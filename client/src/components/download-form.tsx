import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, Search, Clipboard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { PlatformDetection } from "@/components/platform-detection";
import { VideoPreview } from "@/components/video-preview";
import type { VideoInfo } from "@/types";

export function DownloadForm() {
  const [url, setUrl] = useState("");
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const { toast } = useToast();

  const analyzeMutation = useMutation({
    mutationFn: async (url: string) => {
      const response = await apiRequest("POST", "/api/analyze", { url });
      return response.json();
    },
    onSuccess: (data) => {
      setVideoInfo(data);
      toast({
        title: "Video analyzed successfully",
        description: "Choose your preferred quality to download",
      });
    },
    onError: (error) => {
      toast({
        title: "Analysis failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
      toast({
        title: "URL pasted",
        description: "Click analyze to get video information",
      });
    } catch (err) {
      toast({
        title: "Paste failed",
        description: "Please paste the URL manually",
        variant: "destructive",
      });
    }
  };

  const handleAnalyze = () => {
    if (!url.trim()) {
      toast({
        title: "URL required",
        description: "Please enter a video URL",
        variant: "destructive",
      });
      return;
    }

    analyzeMutation.mutate(url);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col space-y-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Link className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            </div>
            <Input
              type="url"
              placeholder="Paste your video link here (YouTube, TikTok, Instagram, Pinterest...)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="pl-12 pr-16 py-4 text-lg border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePaste}
              className="absolute inset-y-0 right-0 pr-4 flex items-center"
              title="Paste from clipboard"
            >
              <Clipboard className="h-5 w-5" />
            </Button>
          </div>
          
          <Button
            onClick={handleAnalyze}
            disabled={analyzeMutation.isPending}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-4 px-8 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            {analyzeMutation.isPending ? (
              <>
                <Search className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Analyze Video
              </>
            )}
          </Button>
        </div>
      </div>

      {videoInfo && (
        <div className="mt-6 space-y-6">
          <PlatformDetection platform={videoInfo.platform} />
          <VideoPreview videoInfo={videoInfo} />
        </div>
      )}
    </div>
  );
}
