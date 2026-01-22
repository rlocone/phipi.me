'use client';
import { Shield, Home, Clock, Rss } from 'lucide-react';
import Link from 'next/link';

export default function PublicHeader() {
  return (
    <header className="bg-gray-900/90 backdrop-blur-sm border-b border-purple-500/20 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/home" className="flex items-center space-x-2">
          <Shield className="w-6 h-6 text-purple-500" />
          <span className="text-white font-bold text-lg">phipi | Love of Tech</span>
        </Link>
        <nav className="flex items-center space-x-6">
          <Link href="/home" className="text-gray-300 hover:text-purple-400 transition-colors flex items-center gap-1">
            <Home className="w-5 h-5" />
          </Link>
          <Link href="/timeline" className="text-gray-300 hover:text-purple-400 transition-colors flex items-center gap-1">
            <Clock className="w-5 h-5" />
            <span className="text-sm hidden sm:inline">Timeline</span>
          </Link>
          <Link href="/feed" className="text-gray-300 hover:text-orange-400 transition-colors flex items-center gap-1">
            <Rss className="w-5 h-5" />
            <span className="text-sm hidden sm:inline">RSS</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
