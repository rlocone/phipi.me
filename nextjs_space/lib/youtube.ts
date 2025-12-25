/**
 * YouTube URL Parser and Metadata Fetcher
 * Handles various YouTube URL formats and extracts video metadata
 */

import { sanitizeUrl } from './url-sanitizer';

export interface YouTubeVideoMetadata {
  videoId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  publishDate: string;
  channelName: string;
  duration?: string;
}

/**
 * Extract YouTube video ID from various URL formats
 */
export function extractYouTubeVideoId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    
    if (urlObj.hostname === 'youtu.be') {
      const videoId = urlObj.pathname.slice(1).split('?')[0];
      return videoId || null;
    }
    
    if (urlObj.hostname.includes('youtube.com')) {
      const videoId = urlObj.searchParams.get('v');
      return videoId || null;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Check if a URL is a YouTube video URL
 */
export function isYouTubeUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname === 'youtu.be' || urlObj.hostname.includes('youtube.com');
  } catch {
    return false;
  }
}

/**
 * Get YouTube video thumbnail URL
 */
export function getYouTubeThumbnail(videoId: string, quality: 'default' | 'hq' | 'max' = 'max'): string {
  const qualityMap = {
    default: 'default',
    hq: 'hqdefault',
    max: 'maxresdefault'
  };
  return `https://i.ytimg.com/vi/${videoId}/${qualityMap[quality]}.jpg`;
}

/**
 * Get the best available thumbnail for a YouTube video
 */
export async function getBestYouTubeThumbnail(videoId: string): Promise<string> {
  const qualities = ['maxresdefault', 'sddefault', 'hqdefault', 'mqdefault', 'default'];
  
  for (const quality of qualities) {
    const url = `https://i.ytimg.com/vi/${videoId}/${quality}.jpg`;
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok) {
        const contentLength = response.headers.get('content-length');
        if (contentLength && parseInt(contentLength) > 1000) {
          return url;
        }
      }
    } catch (error) {
      // Continue to next quality
    }
  }
  
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

/**
 * Clean YouTube URL to standard format and remove tracking parameters
 */
export function cleanYouTubeUrl(url: string): string | null {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) return null;
  const cleanUrl = `https://www.youtube.com/watch?v=${videoId}`;
  // Apply URL sanitization to remove any tracking parameters
  return sanitizeUrl(cleanUrl);
}

/**
 * Get YouTube video embed URL
 */
export function getYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`;
}

/**
 * Fetch YouTube video metadata
 */
export async function fetchYouTubeMetadata(url: string): Promise<YouTubeVideoMetadata | null> {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) return null;

  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const oembedResponse = await fetch(oembedUrl);
    
    if (!oembedResponse.ok) {
      throw new Error('Failed to fetch oEmbed data');
    }
    
    const oembedData = await oembedResponse.json();
    
    const pageUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const pageResponse = await fetch(pageUrl);
    const pageHtml = await pageResponse.text();
    
    const description = extractMetaContent(pageHtml, 'description') || extractMetaContent(pageHtml, 'og:description') || 'No description available';
    const publishDate = extractMetaContent(pageHtml, 'uploadDate') || new Date().toISOString();
    const channelName = oembedData.author_name || 'Unknown Channel';
    
    const thumbnailUrl = await getBestYouTubeThumbnail(videoId);
    
    return {
      videoId,
      title: oembedData.title || 'Untitled Video',
      description,
      thumbnailUrl,
      publishDate,
      channelName,
    };
  } catch (error) {
    console.error('Error fetching YouTube metadata:', error);
    
    return {
      videoId,
      title: 'YouTube Video',
      description: 'Unable to fetch video description',
      thumbnailUrl: getYouTubeThumbnail(videoId, 'hq'),
      publishDate: new Date().toISOString(),
      channelName: 'Unknown Channel',
    };
  }
}

/**
 * Helper function to extract meta content from HTML
 */
function extractMetaContent(html: string, property: string): string | null {
  const ogRegex = new RegExp(`<meta\\s+property="og:${property}"\\s+content="([^"]+)"`, 'i');
  const ogMatch = html.match(ogRegex);
  if (ogMatch) return ogMatch[1];
  
  const nameRegex = new RegExp(`<meta\\s+name="${property}"\\s+content="([^"]+)"`, 'i');
  const nameMatch = html.match(nameRegex);
  if (nameMatch) return nameMatch[1];
  
  const itemRegex = new RegExp(`<meta\\s+itemprop="${property}"\\s+content="([^"]+)"`, 'i');
  const itemMatch = html.match(itemRegex);
  if (itemMatch) return itemMatch[1];
  
  return null;
}
