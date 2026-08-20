import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const CATEGORIES = [
  { name: 'AI', slug: 'ai', description: 'Artificial Intelligence news and developments' },
  { name: 'Cybersecurity', slug: 'cybersecurity', description: 'Threats, defenses, and advisories' },
  { name: 'Privacy', slug: 'privacy', description: 'Privacy tools, policy, and technique' },
  { name: 'Nix', slug: 'nix', description: 'Nix, NixOS, and reproducible systems' },
  { name: 'Governance', slug: 'governance', description: 'Tech policy and regulation' },
  { name: 'Quantum', slug: 'quantum', description: 'Quantum computing and post-quantum crypto' },
  { name: 'Hardware', slug: 'hardware', description: 'Hardware, chips, and devices' },
  { name: 'Hacking', slug: 'hacking', description: 'Offensive research and exploit writeups' },
];

async function main() {
  const email = process.env.TEST_ADMIN_EMAIL || 'james@phipi.me';
  const password = process.env.TEST_ADMIN_PASSWORD;
  const name = process.env.TEST_ADMIN_NAME || 'James';

  if (!password) {
    throw new Error('TEST_ADMIN_PASSWORD is required for the test seed');
  }

  console.log('Seeding morning-queue test data...');

  for (const category of CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name, description: category.description },
      create: category,
    });
    console.log(`  category ${category.name}`);
  }

  const hashed = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { email },
    update: { password: hashed, name, role: 'admin' },
    create: { email, password: hashed, name, role: 'admin' },
  });
  console.log(`  admin ${email}`);
  console.log('Done.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
