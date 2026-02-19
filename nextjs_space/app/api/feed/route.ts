import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Force dynamic rendering to avoid static prerendering with DB
export const dynamic = 'force-dynamic';

// Generate RSS feed dynamically - always fresh when articles are added
export async function GET() {
  const siteUrl = process.env.NEXTAUTH_URL || 'https://phipi.me';
  
  // Fetch approved articles
  const articles = await prisma.article.findMany({
    where: { status: 'APPROVED' },
    include: {
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
    },
    orderBy: { publishedAt: 'desc' },
    take: 50, // Last 50 articles
  });

  // Build RSS XML with media namespace for rich content
  const rssItems = articles.map((article) => {
    const pubDate = article.publishedAt || article.createdAt;
    const categories = article.categories.map((ac) => ac.category.name);
    const tags = article.tags.map((at) => at.tag.name);
    const allCategories = [...new Set([...categories, ...tags])];
    
    // Get the best image
    const image = article.featuredImage || article.thumbnailUrl || (article.images && article.images[0]);
    
    // Build description with emoji if available
    const title = article.emoji ? `${article.emoji} ${article.title}` : article.title;
    const description = article.aiSummary || article.rawContent?.slice(0, 500) || '';
    
    // Escape XML special characters
    const escapeXml = (str: string) => str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

    // Clean HTML for content
    const cleanContent = (article.aiFullPost || article.aiSummary || '')
      .replace(/<[^>]*>/g, '')
      .slice(0, 2000);

    // Build item with rich media
    let item = `
    <item>
      <title>${escapeXml(title)}</title>
      <link>${siteUrl}/article/${article.id}</link>
      <guid isPermaLink="true">${siteUrl}/article/${article.id}</guid>
      <pubDate>${pubDate.toUTCString()}</pubDate>
      <description><![CDATA[${description}]]></description>
      <content:encoded><![CDATA[${article.aiFullPost || description}]]></content:encoded>`;

    // Add categories
    allCategories.forEach((cat) => {
      item += `\n      <category>${escapeXml(cat)}</category>`;
    });

    // Add image as media:content and enclosure
    if (image) {
      item += `
      <enclosure url="${escapeXml(image)}" type="image/jpeg" length="0" />
      <media:content url="${escapeXml(image)}" medium="image" type="image/jpeg">
        <media:title type="plain">${escapeXml(article.title)}</media:title>
      </media:content>
      <media:thumbnail url="${escapeXml(image)}" />`;
    }

    // Add video if it's a video article
    if (article.isVideo && article.videoId) {
      const videoUrl = `https://www.youtube.com/watch?v=${article.videoId}`;
      const embedUrl = `https://www.youtube.com/embed/${article.videoId}`;
      item += `
      <media:content url="${embedUrl}" type="text/html" medium="video">
        <media:player url="${embedUrl}" />
        <media:title type="plain">${escapeXml(article.title)}</media:title>
      </media:content>`;
    }

    item += `\n    </item>`;
    return item;
  }).join('');

  // Build full RSS feed with media namespace
  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" 
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:media="http://search.yahoo.com/mrss/"
  xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>phipi | Love of Tech</title>
    <link>${siteUrl}</link>
    <description>Your daily dose of curated tech news, AI breakthroughs, cybersecurity insights, and innovation stories.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${siteUrl}/api/feed" rel="self" type="application/rss+xml" />
    <image>
      <url>${siteUrl}/og-image.png</url>
      <title>phipi | Love of Tech</title>
      <link>${siteUrl}</link>
    </image>
    <copyright>© ${new Date().getFullYear()} phipi. All rights reserved.</copyright>
    <managingEditor>admin@phipi.tech (phipi)</managingEditor>
    <webMaster>admin@phipi.tech (phipi)</webMaster>
    <ttl>60</ttl>${rssItems}
  </channel>
</rss>`;

  return new NextResponse(rss, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300', // 5 min cache
    },
  });
}
