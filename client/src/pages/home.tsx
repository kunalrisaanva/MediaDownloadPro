import { Navigation } from "@/components/navigation";
import { HeroSection } from "@/components/hero-section";
import { SupportedPlatforms } from "@/components/supported-platforms";
import { FeaturesSection } from "@/components/features-section";
import { DownloadHistory } from "@/components/download-history";
import { Footer } from "@/components/footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <Navigation />
      <HeroSection />
      <SupportedPlatforms />
      <FeaturesSection />
      <DownloadHistory />
      <Footer />
    </div>
  );
}
