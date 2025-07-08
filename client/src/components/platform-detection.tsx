import { Youtube, Instagram, Music } from "lucide-react";
import { SiTiktok, SiPinterest } from "react-icons/si";

interface PlatformDetectionProps {
  platform: string;
}

export function PlatformDetection({ platform }: PlatformDetectionProps) {
  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "youtube":
        return <Youtube className="w-6 h-6 text-red-600" />;
      case "tiktok":
        return <SiTiktok className="w-6 h-6 text-black dark:text-white" />;
      case "instagram":
        return <Instagram className="w-6 h-6 text-pink-600" />;
      case "pinterest":
        return <SiPinterest className="w-6 h-6 text-red-600" />;
      default:
        return <Music className="w-6 h-6 text-gray-600" />;
    }
  };

  const getPlatformName = (platform: string) => {
    switch (platform) {
      case "youtube":
        return "YouTube";
      case "tiktok":
        return "TikTok";
      case "instagram":
        return "Instagram";
      case "pinterest":
        return "Pinterest";
      default:
        return platform;
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-center space-x-3">
          <span className="text-sm text-gray-600 dark:text-gray-400">Detected Platform:</span>
          <div className="flex items-center space-x-2">
            {getPlatformIcon(platform)}
            <span className="font-medium text-gray-900 dark:text-white">
              {getPlatformName(platform)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
