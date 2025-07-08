import { DownloadForm } from "@/components/download-form";

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-purple-600 opacity-5"></div>
      
      <div className="relative z-10 max-w-4xl mx-auto text-center">
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
          Download Videos from{' '}
          <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Any Platform
          </span>
        </h1>
        
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-12 max-w-2xl mx-auto">
          Paste any video link and download in your preferred quality. Supports YouTube, TikTok, Instagram, Pinterest and more.
        </p>

        <DownloadForm />
      </div>
    </section>
  );
}
