import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkStarred() {
  const starredArticles = await prisma.article.findMany({
    where: { isStarred: true, status: 'APPROVED' },
    select: {
      id: true,
      title: true,
      isStarred: true,
    },
  });

  console.log(`Starred articles (${starredArticles.length}):`);
  starredArticles.forEach(article => {
    console.log(`- ${article.title}`);
  });

  const quantumArticle = await prisma.article.findFirst({
    where: {
      title: { contains: 'Quantum Revolution' }
    },
    select: {
      id: true,
      title: true,
      isStarred: true,
      status: true,
    },
  });

  console.log('\nQuantum Revolution article:');
  console.log(quantumArticle);
}

checkStarred()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
