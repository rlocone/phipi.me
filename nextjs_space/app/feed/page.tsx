'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Rss, Twitter, Linkedin, Facebook, Mail, Copy, Check, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function FeedPage() {
  const [copied, setCopied] = useState(false);
  const feedUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/api/feed` 
    : 'https://phipi.me/api/feed';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(feedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Social share URLs
  const shareText = encodeURIComponent('Subscribe to phipi | Love of Tech RSS feed for the latest tech news! 🚀');
  const shareUrl = encodeURIComponent(feedUrl);

  const socialLinks = [
    {
      name: 'Twitter',
      icon: Twitter,
      url: `https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`,
      color: 'hover:bg-[#1DA1F2] hover:border-[#1DA1F2]',
    },
    {
      name: 'LinkedIn',
      icon: Linkedin,
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`,
      color: 'hover:bg-[#0A66C2] hover:border-[#0A66C2]',
    },
    {
      name: 'Facebook',
      icon: Facebook,
      url: `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`,
      color: 'hover:bg-[#1877F2] hover:border-[#1877F2]',
    },
    {
      name: 'Email',
      icon: Mail,
      url: `mailto:?subject=${encodeURIComponent('Check out this RSS feed!')}&body=${shareText}%0A%0A${shareUrl}`,
      color: 'hover:bg-purple-600 hover:border-purple-600',
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800/50 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/home" className="flex items-center gap-2">
            <span className="text-xl font-bold">
              <span className="text-purple-500">phi</span>
              <span className="text-white">pi</span>
            </span>
          </Link>
          <nav className="flex gap-4">
            <Link href="/home" className="text-zinc-400 hover:text-white transition-colors">Home</Link>
            <Link href="/timeline" className="text-zinc-400 hover:text-white transition-colors">Timeline</Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 mb-6">
            <Rss className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">RSS Feed</h1>
          <p className="text-zinc-400 text-lg max-w-xl mx-auto">
            Subscribe to stay updated with the latest tech news, AI breakthroughs, and innovation stories.
          </p>
        </div>

        {/* Feed URL Card */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Rss className="w-5 h-5 text-orange-500" />
            Feed URL
          </h2>
          <div className="flex gap-2">
            <div className="flex-1 bg-zinc-800 rounded-lg px-4 py-3 font-mono text-sm text-zinc-300 overflow-x-auto">
              {feedUrl}
            </div>
            <Button
              onClick={copyToClipboard}
              variant="outline"
              className="border-zinc-700 hover:border-purple-500 hover:bg-purple-500/10"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-zinc-500 text-sm mt-3">
            Copy this URL to your favorite RSS reader (Feedly, Inoreader, NewsBlur, etc.)
          </p>
        </div>

        {/* Open in Reader */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Open in RSS Reader</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { name: 'Feedly', url: `https://feedly.com/i/subscription/feed/${encodeURIComponent(feedUrl)}` },
              { name: 'Inoreader', url: `https://www.inoreader.com/search/feeds/${encodeURIComponent(feedUrl)}` },
              { name: 'The Old Reader', url: `https://theoldreader.com/feeds/subscribe?url=${encodeURIComponent(feedUrl)}` },
              { name: 'NewsBlur', url: `https://newsblur.com/?url=${encodeURIComponent(feedUrl)}` },
            ].map((reader) => (
              <a
                key={reader.name}
                href={reader.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg px-4 py-3 text-sm font-medium text-white transition-colors"
              >
                {reader.name}
                <ExternalLink className="w-3 h-3 text-zinc-400" />
              </a>
            ))}
          </div>
        </div>

        {/* Share on Social Media */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Share on Social Media</h2>
          <p className="text-zinc-400 text-sm mb-4">
            Help others discover great tech content by sharing our RSS feed!
          </p>
          <div className="flex flex-wrap gap-3">
            {socialLinks.map((social) => (
              <a
                key={social.name}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white transition-all ${social.color}`}
              >
                <social.icon className="w-4 h-4" />
                <span className="text-sm font-medium">{social.name}</span>
              </a>
            ))}
          </div>
        </div>

        {/* What's Included */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">What&apos;s Included</h2>
          <ul className="space-y-3">
            {[
              { emoji: '📰', text: 'Latest approved articles with full content' },
              { emoji: '🖼️', text: 'Rich media with images and thumbnails' },
              { emoji: '🎬', text: 'Video content with YouTube embeds' },
              { emoji: '🏷️', text: 'Categories and tags for easy filtering' },
              { emoji: '✨', text: 'AI-generated summaries and enhanced posts' },
              { emoji: '🔄', text: 'Auto-updates when new articles are published' },
            ].map((item) => (
              <li key={item.text} className="flex items-start gap-3 text-zinc-300">
                <span className="text-lg">{item.emoji}</span>
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/50 py-8 mt-12">
        <div className="max-w-4xl mx-auto px-4 text-center text-zinc-500 text-sm">
          © {new Date().getFullYear()} phipi | Love of Tech. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
