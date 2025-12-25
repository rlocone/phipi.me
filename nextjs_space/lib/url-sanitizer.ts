/**
 * URL Sanitizer Utility
 * Removes tracking parameters and other anomalies from URLs
 */

/**
 * List of common tracking parameters to remove
 */
const TRACKING_PARAMS = [
  // UTM parameters (Google Analytics)
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'utm_id',
  'utm_source_platform',
  'utm_creative_format',
  'utm_marketing_tactic',
  
  // Social media trackers
  'fbclid',      // Facebook
  'gclid',       // Google Ads
  'msclkid',     // Microsoft Ads
  'twclid',      // Twitter
  'li_fat_id',   // LinkedIn
  'igshid',      // Instagram
  
  // Generic trackers
  'source',
  'ref',
  'referrer',
  'campaign',
  'medium',
  
  // Analytics and tracking
  '_ga',
  '_gl',
  'mc_cid',      // MailChimp
  'mc_eid',      // MailChimp
  'yclid',       // Yandex
  'zanpid',      // Zanox
  'kclickid',    // Kenshoo
  'vero_id',     // Vero
  'trk_',        // Generic tracker prefix
  
  // Email campaign trackers
  'email_source',
  'email_campaign',
  '_hsenc',      // HubSpot
  '_hsmi',       // HubSpot
  'mkt_tok',     // Marketo
  
  // Affiliate trackers
  'aff_id',
  'affiliate',
  'partner',
  'subid',
  'clickid',
];

/**
 * Sanitizes a URL by removing tracking parameters
 * @param url - The URL to sanitize
 * @returns Sanitized URL without tracking parameters
 */
export function sanitizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    
    // Remove tracking parameters
    TRACKING_PARAMS.forEach(param => {
      urlObj.searchParams.delete(param);
    });
    
    // Remove any parameters starting with utm_, _ga, trk_, etc.
    const paramsToDelete: string[] = [];
    urlObj.searchParams.forEach((_, key) => {
      if (
        key.startsWith('utm_') ||
        key.startsWith('_ga') ||
        key.startsWith('trk_') ||
        key.startsWith('mc_')
      ) {
        paramsToDelete.push(key);
      }
    });
    
    paramsToDelete.forEach(param => {
      urlObj.searchParams.delete(param);
    });
    
    // Return clean URL
    return urlObj.toString();
  } catch (error) {
    // If URL parsing fails, return original URL
    console.error('Failed to sanitize URL:', error);
    return url;
  }
}

/**
 * Checks if a URL is from Notion
 * @param url - The URL to check
 * @returns True if URL is from Notion
 */
export function isNotionUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.includes('notion.site') || urlObj.hostname === 'www.notion.so' || urlObj.hostname === 'notion.so';
  } catch {
    return false;
  }
}

/**
 * Extracts Notion page ID from URL
 * @param url - Notion URL
 * @returns Page ID or null
 */
export function getNotionPageId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    
    // Notion URLs have format: /{title}-{pageId} or /{pageId}
    const parts = pathname.split('-');
    if (parts.length > 0) {
      const lastPart = parts[parts.length - 1];
      // Remove leading slash and query params
      const pageId = lastPart.split('?')[0].replace(/\//g, '');
      if (pageId.length === 32) {
        return pageId;
      }
    }
    
    return null;
  } catch {
    return null;
  }
}
