import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixBrokenLink() {
  const article = await prisma.article.findUnique({
    where: { id: 'cmjiv2k01000ko608op433jc2' },
    select: { id: true, title: true, aiFullPost: true },
  });

  if (!article || !article.aiFullPost) {
    console.log('Article not found or has no aiFullPost');
    return;
  }

  // Replace the broken link with a generic reference
  const updatedContent = article.aiFullPost.replace(
    /https:\/\/archive\.org\/details\/unix-fourth-edition/g,
    'the Internet Archive'
  );

  await prisma.article.update({
    where: { id: article.id },
    data: { aiFullPost: updatedContent },
  });

  console.log('✓ Fixed broken link in article:', article.title);
  console.log('  Replaced archive.org URL with generic reference');
}

fixBrokenLink()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
