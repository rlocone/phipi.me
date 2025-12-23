/**
 * Image Extraction and Generation Utilities
 * Extracts images from HTML content and provides fallback generation
 */

interface ExtractedImage {
  url: string;
  alt?: string;
  width?: number;
  height?: number;
}

/**
 * Extract images from HTML content
 * Prioritizes content images over icons, ads, and tracking pixels
 */
export function extractImagesFromHTML(html: string, baseUrl: string): ExtractedImage[] {
  const images: ExtractedImage[] = [];
  
  // Parse all img tags
  const imgRegex = /<img[^>]+>/gi;
  const matches = html.match(imgRegex) || [];
  
  for (const imgTag of matches) {
    // Extract src
    const srcMatch = imgTag.match(/src=["']([^"']+)["']/i);
    if (!srcMatch) continue;
    
    let src = srcMatch[1];
    
    // Skip data URIs, tracking pixels, and tiny images
    if (src.startsWith('data:')) continue;
    if (src.includes('pixel') || src.includes('tracker')) continue;
    
    // Convert relative URLs to absolute
    if (src.startsWith('//')) {
      src = 'https:' + src;
    } else if (src.startsWith('/')) {
      const base = new URL(baseUrl);
      src = base.origin + src;
    } else if (!src.startsWith('http')) {
      try {
        src = new URL(src, baseUrl).href;
      } catch (e) {
        continue;
      }
    }
    
    // Extract alt text
    const altMatch = imgTag.match(/alt=["']([^"']+)["']/i);
    const alt = altMatch ? altMatch[1] : undefined;
    
    // Extract dimensions if available
    const widthMatch = imgTag.match(/width=["']?(\d+)/i);
    const heightMatch = imgTag.match(/height=["']?(\d+)/i);
    const width = widthMatch ? parseInt(widthMatch[1]) : undefined;
    const height = heightMatch ? parseInt(heightMatch[1]) : undefined;
    
    // Filter out small images (likely icons or ads)
    if (width && width < 200) continue;
    if (height && height < 200) continue;
    
    images.push({ url: src, alt, width, height });
  }
  
  return images;
}

/**
 * Extract Open Graph and Twitter Card images
 */
export function extractMetaImages(html: string): string[] {
  const images: string[] = [];
  
  // Open Graph image
  const ogImageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  if (ogImageMatch) images.push(ogImageMatch[1]);
  
  // Twitter Card image
  const twitterImageMatch = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
  if (twitterImageMatch) images.push(twitterImageMatch[1]);
  
  return images;
}

/**
 * Get the best images from content
 * Returns up to maxImages, prioritizing larger and content-relevant images
 */
export function getBestImages(
  contentImages: ExtractedImage[],
  metaImages: string[],
  maxImages: number = 5
): string[] {
  const imageUrls = new Set<string>();
  
  // First, add meta images (usually the best quality)
  for (const url of metaImages) {
    if (imageUrls.size >= maxImages) break;
    imageUrls.add(url);
  }
  
  // Sort content images by size (larger first)
  const sortedImages = contentImages.sort((a, b) => {
    const aSize = (a.width || 0) * (a.height || 0);
    const bSize = (b.width || 0) * (b.height || 0);
    return bSize - aSize;
  });
  
  // Add content images
  for (const img of sortedImages) {
    if (imageUrls.size >= maxImages) break;
    imageUrls.add(img.url);
  }
  
  return Array.from(imageUrls);
}

/**
 * Validate if an image URL is accessible
 */
export async function validateImageUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
    const contentType = response.headers.get('content-type');
    return response.ok && (contentType ? contentType.startsWith('image/') : false);
  } catch {
    return false;
  }
}

/**
 * Filter and validate images
 */
export async function getValidImages(urls: string[]): Promise<string[]> {
  const validImages: string[] = [];
  
  for (const url of urls) {
    const isValid = await validateImageUrl(url);
    if (isValid) {
      validImages.push(url);
    }
  }
  
  return validImages;
}
