/**
 * Content Parser Utility
 * Handles parsing and cleaning of RSS feed content
 */

import { extractYouTubeVideoId } from './youtube';

/**
 * Extracts YouTube video ID from iframe embed code
 */
export function extractVideoIdFromIframe(html: string): string | null {
  // Match iframe src with YouTube embed URL
  const iframeRegex = /<iframe[^>]+src=["']https?:\/\/(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]+)["'][^>]*>/i;
  const match = html.match(iframeRegex);
  
  if (match && match[1]) {
    return match[1];
  }
  
  return null;
}

/**
 * Checks if content contains YouTube embed
 */
export function containsYouTubeEmbed(content: string): boolean {
  return /youtube\.com\/embed\//i.test(content) || /<iframe[^>]*youtube/i.test(content);
}

/**
 * Removes HTML tags and extracts plain text
 */
export function stripHtml(html: string): string {
  if (!html) return '';
  
  // Remove script and style tags with their content
  let text = html.replace(/<script[^>]*>.*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>.*?<\/style>/gi, '');
  
  // Remove iframe tags
  text = text.replace(/<iframe[^>]*>.*?<\/iframe>/gi, '');
  
  // Remove FetchRSS attribution
  text = text.replace(/\(Feed generated with <a href[^>]*>FetchRSS<\/a>\)/gi, '');
  text = text.replace(/\(Feed generated with FetchRSS\)/gi, '');
  
  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, ' ');
  
  // Decode HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&#x27;/g, "'");
  
  // Clean up whitespace
  text = text.replace(/\s+/g, ' ');
  text = text.trim();
  
  return text;
}

/**
 * Parses RSS content and detects if it's a YouTube video
 */
export function parseRssContent(content: string): {
  isVideo: boolean;
  videoId: string | null;
  cleanText: string;
} {
  if (!content) {
    return {
      isVideo: false,
      videoId: null,
      cleanText: '',
    };
  }
  
  // Check if content contains YouTube embed
  const isVideo = containsYouTubeEmbed(content);
  let videoId: string | null = null;
  
  if (isVideo) {
    videoId = extractVideoIdFromIframe(content);
  }
  
  // Extract clean text (without HTML)
  const cleanText = stripHtml(content);
  
  return {
    isVideo,
    videoId,
    cleanText,
  };
}

/**
 * Cleans and formats content for display
 */
export function formatContent(content: string): string {
  if (!content) return '';
  
  // Parse the content
  const parsed = parseRssContent(content);
  
  // Return clean text
  return parsed.cleanText;
}
