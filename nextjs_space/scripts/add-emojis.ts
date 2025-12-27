/**
 * Script to add emojis to existing articles
 * Analyzes article title and category to suggest appropriate emojis
 */
import 'dotenv/config';

import { PrismaClient } from '@prisma/client';
import { suggestEmoji } from '../lib/emoji-suggester';

const prisma = new PrismaClient();

async function addEmojisToArticles() {
  console.log('Starting emoji addition to articles...');

  try {
    // Fetch all articles without emojis
    const articles = await prisma.article.findMany({
      where: {
        emoji: null,
      },
      include: {
        categories: {
          include: {
            category: true,
          },
        },
      },
    });

    console.log(`Found ${articles.length} articles without emojis`);

    let updated = 0;
    let failed = 0;

    for (const article of articles) {
      try {
        // Get the first category slug if available
        const categorySlug = article.categories[0]?.category?.slug;
        
        // Suggest emoji based on title and category
        const suggestion = suggestEmoji(article.title, categorySlug);
        
        // Update the article with the suggested emoji
        await prisma.article.update({
          where: { id: article.id },
          data: { emoji: suggestion.emoji },
        });

        updated++;
        console.log(`✅ Updated "${article.title}" with ${suggestion.emoji} (${suggestion.reason})`);
      } catch (error) {
        failed++;
        console.error(`❌ Failed to update article ${article.id}:`, error);
      }
    }

    console.log('\n=== Summary ===');
    console.log(`Total articles: ${articles.length}`);
    console.log(`Successfully updated: ${updated}`);
    console.log(`Failed: ${failed}`);
  } catch (error) {
    console.error('Error in main execution:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
addEmojisToArticles();
