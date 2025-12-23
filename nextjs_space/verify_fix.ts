import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyFix() {
  const article = await prisma.article.findUnique({
    where: {
      id: "cmjhqi8810009ru086coyqygw"
    },
    select: {
      id: true,
      title: true,
      rawContent: true,
      isVideo: true,
      videoId: true,
      thumbnailUrl: true,
      channelName: true,
    },
  });

  console.log('Article Details:');
  console.log('================');
  console.log(`Title: ${article?.title}`);
  console.log(`Is Video: ${article?.isVideo}`);
  console.log(`Video ID: ${article?.videoId}`);
  console.log(`Channel: ${article?.channelName}`);
  console.log(`Thumbnail: ${article?.thumbnailUrl?.substring(0, 60)}...`);
  console.log('\nRaw Content Preview:');
  console.log(article?.rawContent?.substring(0, 300) || '(empty)');
  console.log('\n\nFull Raw Content Length:', article?.rawContent?.length || 0);
}

verifyFix()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
