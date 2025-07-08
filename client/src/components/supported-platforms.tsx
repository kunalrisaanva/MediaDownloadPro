import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Youtube, Instagram } from "lucide-react";
import { SiTiktok, SiPinterest } from "react-icons/si";

export function SupportedPlatforms() {
  const platforms = [
    {
      name: "YouTube",
      icon: <Youtube className="w-8 h-8 text-red-600 dark:text-red-400" />,
      description: "Videos, Shorts, Live streams",
      features: ["4K", "1080p", "720p"],
      bgColor: "bg-red-100 dark:bg-red-900/20",
    },
    {
      name: "TikTok",
      icon: <SiTiktok className="w-8 h-8 text-gray-900 dark:text-white" />,
      description: "Videos without watermark",
      features: ["HD", "No Watermark"],
      bgColor: "bg-gray-100 dark:bg-gray-700",
    },
    {
      name: "Instagram",
      icon: <Instagram className="w-8 h-8 text-pink-600 dark:text-pink-400" />,
      description: "Reels, Posts, Stories, Profile pics",
      features: ["Reels", "Stories", "HD Photos"],
      bgColor: "bg-gradient-to-r from-purple-500 to-pink-500",
    },
    {
      name: "Pinterest",
      icon: <SiPinterest className="w-8 h-8 text-red-600 dark:text-red-400" />,
      description: "Images, Videos, Boards",
      features: ["Original Quality", "Bulk Download"],
      bgColor: "bg-red-100 dark:bg-red-900/20",
    },
  ];

  return (
    <section id="supported" className="py-20 bg-gray-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Supported Platforms
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Download from your favorite platforms with ease
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {platforms.map((platform) => (
            <Card
              key={platform.name}
              className="hover:shadow-xl transition-shadow duration-300"
            >
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <div className={`w-16 h-16 ${platform.bgColor} rounded-full flex items-center justify-center mx-auto`}>
                    {platform.name === "Instagram" ? (
                      <Instagram className="w-8 h-8 text-white" />
                    ) : (
                      platform.icon
                    )}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {platform.name}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {platform.description}
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {platform.features.map((feature) => (
                      <Badge
                        key={feature}
                        variant="secondary"
                        className="text-xs px-2 py-1"
                      >
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
