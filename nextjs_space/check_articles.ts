import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkArticles() {
  const articles = await prisma.article.findMany({
    select: {
      id: true,
      title: true,
      rawContent: true,
      aiSummary: true,
      aiFullPost: true,
      originalUrl: true,
      isVideo: true,
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

  console.log(`Total articles: ${articles.length}`);
  console.log(`Problematic articles: ${problematicArticles.length}\n`);

  problematicArticles.forEach(article => {
    console.log(`ID: ${article.id}`);
    console.log(`Title: ${article.title}`);
    console.log(`Source: ${article.originalUrl || 'N/A'}`);
    console.log(`Is Video: ${article.isVideo}`);
    
    if (article.rawContent) {
      console.log(`Raw Content preview: ${article.rawContent.substring(0, 200)}...`);
    }
    if (article.aiSummary && article.aiSummary.includes('<')) {
      console.log(`AI Summary has HTML: ${article.aiSummary.substring(0, 200)}...`);
    }
    if (article.aiFullPost && article.aiFullPost.includes('<')) {
      console.log(`AI Full Post has HTML: ${article.aiFullPost.substring(0, 200)}...`);
    }
    console.log('---\n');
  });
}

checkArticles()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
