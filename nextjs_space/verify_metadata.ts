import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyMetadata() {
  const article = await prisma.article.findFirst({
    where: { 
      status: 'APPROVED',
      isVideo: true
    },
    select: {
      id: true,
      title: true,
      aiSummary: true,
      thumbnailUrl: true,
      isVideo: true,
    },
  });

  if (article) {
    console.log('Sample Article for Testing:');
    console.log('===========================');
    console.log(`ID: ${article.id}`);
    console.log(`Title: ${article.title}`);
    console.log(`Has Summary: ${!!article.aiSummary}`);
    console.log(`Has Thumbnail: ${!!article.thumbnailUrl}`);
    console.log(`Thumbnail URL: ${article.thumbnailUrl?.substring(0, 70)}...`);
    console.log('\nMetadata that will be generated:');
    console.log(`- OG Title: ${article.title}`);
    console.log(`- OG Description: ${article.aiSummary?.substring(0, 100)}...`);
    console.log(`- OG Image: ${article.thumbnailUrl}`);
    console.log(`- Twitter Card: summary_large_image`);
    console.log(`\nShare URL: https://phipi.me/article/${article.id}`);
  }
}

verifyMetadata()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
