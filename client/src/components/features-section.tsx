import { Card, CardContent } from "@/components/ui/card";
import { Zap, Shield, Smartphone, Settings, Heart, History } from "lucide-react";

export function FeaturesSection() {
  const features = [
    {
      icon: <Zap className="w-6 h-6 text-blue-600 dark:text-blue-400" />,
      title: "Lightning Fast",
      description: "Download videos at maximum speed with our optimized servers",
      bgColor: "bg-blue-100 dark:bg-blue-900/20",
    },
    {
      icon: <Shield className="w-6 h-6 text-green-600 dark:text-green-400" />,
      title: "Safe & Secure",
      description: "No malware, no ads, no tracking. Your privacy is protected",
      bgColor: "bg-green-100 dark:bg-green-900/20",
    },
    {
      icon: <Smartphone className="w-6 h-6 text-purple-600 dark:text-purple-400" />,
      title: "Mobile Friendly",
      description: "Works perfectly on all devices - desktop, tablet, and mobile",
      bgColor: "bg-purple-100 dark:bg-purple-900/20",
    },
    {
      icon: <Settings className="w-6 h-6 text-orange-600 dark:text-orange-400" />,
      title: "Multiple Formats",
      description: "Download in MP4, MP3, and various quality options",
      bgColor: "bg-orange-100 dark:bg-orange-900/20",
    },
    {
      icon: <Heart className="w-6 h-6 text-red-600 dark:text-red-400" />,
      title: "No Registration",
      description: "Start downloading immediately without creating an account",
      bgColor: "bg-red-100 dark:bg-red-900/20",
    },
    {
      icon: <History className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />,
      title: "Download History",
      description: "Keep track of your downloads with local session history",
      bgColor: "bg-indigo-100 dark:bg-indigo-900/20",
    },
  ];

  return (
    <section id="features" className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Powerful Features
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Everything you need for downloading videos and media content
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="hover:shadow-xl transition-shadow duration-300"
            >
              <CardContent className="p-6">
                <div className={`w-12 h-12 ${feature.bgColor} rounded-lg flex items-center justify-center mb-4`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
