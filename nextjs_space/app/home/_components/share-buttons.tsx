'use client';
import { Twitter, Facebook, Linkedin, Share2 } from 'lucide-react';

export default function ShareButtons({ article }: { article: any }) {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://phipi.me';
  const shareUrl = `${baseUrl}/article/${article.id}`;
  const title = article.title;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url: shareUrl });
      } catch (error) {
        console.error('Share failed:', error);
      }
    }
  };

  return (
    <div className="flex items-center gap-2">
      <a
        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(shareUrl)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 bg-gray-700/50 hover:bg-purple-600/30 border border-gray-600/30 hover:border-purple-500/40 rounded-md transition-colors"
      >
        <Twitter className="w-4 h-4 text-gray-300" />
      </a>
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 bg-gray-700/50 hover:bg-purple-600/30 border border-gray-600/30 hover:border-purple-500/40 rounded-md transition-colors"
      >
        <Facebook className="w-4 h-4 text-gray-300" />
      </a>
      <a
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 bg-gray-700/50 hover:bg-purple-600/30 border border-gray-600/30 hover:border-purple-500/40 rounded-md transition-colors"
      >
        <Linkedin className="w-4 h-4 text-gray-300" />
      </a>
      <button
        onClick={handleShare}
        className="p-2 bg-gray-700/50 hover:bg-purple-600/30 border border-gray-600/30 hover:border-purple-500/40 rounded-md transition-colors"
      >
        <Share2 className="w-4 h-4 text-gray-300" />
      </button>
    </div>
  );
}
