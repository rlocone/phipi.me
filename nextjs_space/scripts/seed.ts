import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create initial categories
  const categories = [
    {
      name: 'Cybersecurity',
      slug: 'cybersecurity',
      description: 'Articles about cybersecurity threats, defenses, and best practices',
    },
    {
      name: 'Privacy',
      slug: 'privacy',
      description: 'Privacy-focused content, tools, and techniques',
    },
    {
      name: 'Hardware',
      slug: 'hardware',
      description: 'Hardware reviews, security, and technology',
    },
    {
      name: 'AI',
      slug: 'ai',
      description: 'Artificial Intelligence news and developments',
    },
  ];

  console.log('📁 Creating categories...');
  for (const category of categories) {
    const existing = await prisma.category.findUnique({
      where: { slug: category.slug },
    });

    if (!existing) {
      await prisma.category.create({
        data: category,
      });
      console.log(`  ✓ Created category: ${category.name}`);
    } else {
      console.log(`  → Category already exists: ${category.name}`);
    }
  }

  // Create admin users
  const users = [
    {
      email: 'john@doe.com',
      password: 'johndoe123',
      name: 'Test Admin',
      role: 'admin',
    },
    {
      email: 'admin@phipi.tech',
      password: 'SecureAdmin2024!',
      name: 'Admin User',
      role: 'admin',
    },
  ];

  console.log('👤 Creating admin users...');
  for (const user of users) {
    const existing = await prisma.user.findUnique({
      where: { email: user.email },
    });

    if (!existing) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      await prisma.user.create({
        data: {
          email: user.email,
          password: hashedPassword,
          name: user.name,
          role: user.role,
        },
      });
      console.log(`  ✓ Created admin user: ${user.email}`);
    } else {
      console.log(`  → Admin user already exists: ${user.email}`);
    }
  }

  console.log('✅ Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
