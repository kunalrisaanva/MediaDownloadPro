import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Trash2, Clock, Monitor } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { Download as DownloadType } from "@/types";
import {useMutation, useQueryClient} from "@tanstack/react-query";

export function DownloadHistory() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: downloads, isLoading } = useQuery<DownloadType[]>({
    queryKey: ["/api/downloads/recent"],
    staleTime: 30000,
  });

  const handleRedownload = (download: DownloadType) => {
    toast({
      title: "Redownload started",
      description: `Starting download for ${download.title}`,
    });
  };

  const clearHistoryMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/downloads', {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to clear history');
      }
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["/api/downloads/recent"] });
      const previousDownloads = queryClient.getQueryData(["/api/downloads/recent"]);
      queryClient.setQueryData(["/api/downloads/recent"], []);
      return { previousDownloads };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(["/api/downloads/recent"], context?.previousDownloads);
      toast({
        title: "Error",
        description: "Failed to clear download history",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/downloads/recent"] });
      toast({
        title: "Success",
        description: "All downloads have been removed from history",
      });
    },
  });




const removeDownloadMutation = useMutation({
    mutationFn: async (downloadId: number) => {
      const response = await fetch(`/api/downloads/${downloadId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to remove download');
      }
      return downloadId;
    },
    onMutate: async (downloadId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/downloads/recent"] });

      // Snapshot the previous value
      const previousDownloads = queryClient.getQueryData(["/api/downloads/recent"]);

      // Optimistically update to the new value
      queryClient.setQueryData<DownloadType[]>(["/api/downloads/recent"], (old) => 
        old?.filter(d => d.id !== downloadId) ?? []
      );

      return { previousDownloads };
    },
    onError: (err, downloadId, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData(["/api/downloads/recent"], context?.previousDownloads);
      
      toast({
        title: "Error",
        description: "Failed to remove download from history",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ["/api/downloads/recent"] });
    }
  });

  const handleRemoveFromHistory = (downloadId: number) => {
    removeDownloadMutation.mutate(downloadId, {
      onSuccess: () => {
        toast({
          title: "Success",
          description: "Download removed from history",
        });
      }
    });
  };

  const handleClearHistory = () => {
    clearHistoryMutation.mutate();
    toast({
      title: "History cleared",
      description: "All downloads have been removed from history",
    });
  };

  if (isLoading) {
    return (
      <section className="py-20 bg-gray-50 dark:bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading download history...</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="downloadHistory" className="py-20 bg-gray-50 dark:bg-slate-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Recent Downloads
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Your download history for this session
          </p>
        </div>
        
        <Card className="shadow-lg">
          <CardHeader className="border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                Downloads ({downloads?.length || 0})
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearHistory}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
              >
                Clear History
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {!downloads || downloads.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <Monitor className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No downloads yet. Start by pasting a video link above!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {downloads.map((download) => (
                  <div
                    key={download.id}
                    className="p-6 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        {download.thumbnail ? (
                          <img
                            src={download.thumbnail}
                            alt="Download thumbnail"
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                            <Download className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {download.title}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            {download.platform} • {download.quality}
                            {download.fileSize && ` • ${download.fileSize}`}
                          </p>
                          <Badge
                            variant={
                              download.status === "completed" ? "default" :
                              download.status === "failed" ? "destructive" : "secondary"
                            }
                            className="text-xs"
                          >
                            {download.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {download.createdAt ? new Date(download.createdAt).toLocaleString() : "Recently"}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRedownload(download)}
                          title="Download again"
                          className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveFromHistory(download.id)}
                          title="Remove from history"
                          className="text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
