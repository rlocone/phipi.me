import { PrismaClient } from '@prisma/client';
import { parseRssContent } from '../lib/content-parser';
import { fetchYouTubeMetadata } from '../lib/youtube';

const prisma = new PrismaClient();

async function fixArticles() {
  console.log('Starting article fix process...\n');

  // Find all articles with problematic content
  const articles = await prisma.article.findMany({
    select: {
      id: true,
      title: true,
      rawContent: true,
      aiSummary: true,
      aiFullPost: true,
      originalUrl: true,
      isVideo: true,
      videoId: true,
    },
  });

  const problematicArticles = articles.filter(article => {
    const rawContent = article.rawContent || '';
    const aiSummary = article.aiSummary || '';
    const aiFullPost = article.aiFullPost || '';
    
    const allContent = rawContent + aiSummary + aiFullPost;
    
    return allContent.includes('<iframe') || 
           allContent.includes('FetchRSS') || 
           allContent.includes('<br/>') ||
           allContent.includes('<span style=') ||
           allContent.includes('allowFullScreen');
  });

  console.log(`Found ${problematicArticles.length} articles to fix\n`);

  let fixed = 0;
  let errors = 0;

  for (const article of problematicArticles) {
    try {
      console.log(`Fixing: ${article.title}`);
      
      // Parse the raw content
      const rawContent = article.rawContent || '';
      const parsed = parseRssContent(rawContent);
      
      const updateData: any = {
        rawContent: parsed.cleanText || null, // Set to null if empty, don't keep HTML
        isVideo: parsed.isVideo,
      };
      
      // If it's a YouTube video, fetch metadata
      if (parsed.isVideo && parsed.videoId) {
        console.log(`  - Detected YouTube video: ${parsed.videoId}`);
        
        try {
          const videoMetadata = await fetchYouTubeMetadata(`https://www.youtube.com/watch?v=${parsed.videoId}`);
          if (videoMetadata) {
            updateData.videoId = parsed.videoId;
            updateData.thumbnailUrl = videoMetadata.thumbnailUrl;
            updateData.channelName = videoMetadata.channelName;
            
            console.log(`  - Fetched metadata: ${videoMetadata.title}`);
            console.log(`  - Channel: ${videoMetadata.channelName}`);
          }
        } catch (videoError: any) {
          console.error(`  - Error fetching YouTube metadata: ${videoError.message}`);
          // Continue with basic video data
          updateData.videoId = parsed.videoId;
        }
      }
      
      // Also clean aiSummary and aiFullPost if they contain HTML
      if (article.aiSummary && article.aiSummary.includes('<')) {
        const summaryParsed = parseRssContent(article.aiSummary);
        updateData.aiSummary = summaryParsed.cleanText;
      }
      
      if (article.aiFullPost && article.aiFullPost.includes('<')) {
        const fullPostParsed = parseRssContent(article.aiFullPost);
        updateData.aiFullPost = fullPostParsed.cleanText;
      }
      
      // Update the article
      await prisma.article.update({
        where: { id: article.id },
        data: updateData,
      });
      
      console.log(`  ✓ Fixed successfully\n`);
      fixed++;
    } catch (error: any) {
      console.error(`  ✗ Error fixing article: ${error.message}\n`);
      errors++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`Fix complete!`);
  console.log(`  - Total articles processed: ${problematicArticles.length}`);
  console.log(`  - Successfully fixed: ${fixed}`);
  console.log(`  - Errors: ${errors}`);
  console.log('='.repeat(50));
}

fixArticles()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
