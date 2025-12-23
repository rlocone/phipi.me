import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findBrokenLink() {
  const articles = await prisma.article.findMany({
    where: {
      id: 'cmjiv2k01000ko608op433jc2'
    },
    select: {
      id: true,
      title: true,
      aiFullPost: true,
    },
  });

  const article = articles[0];
  if (article && article.aiFullPost) {
    const matches = article.aiFullPost.match(/https?:\/\/archive\.org[^\s\)]+/g);
    if (matches) {
      console.log('Found archive.org links:');
      matches.forEach(link => console.log(link));
    }
  }
}

findBrokenLink()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
