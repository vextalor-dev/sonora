import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/auth.js';

const prisma = new PrismaClient();

async function main() {
  const total = await prisma.user.count();
  if (total === 0) {
    await prisma.user.create({
      data: {
        name: 'Sonora Admin',
        email: 'admin@sonora.local',
        passwordHash: await hashPassword('admin123'),
        role: 'ADMIN',
      },
    });
    console.log('[seed] created admin account: admin@sonora.local / admin123');
  } else {
    console.log('[seed] users exist; skipping admin creation.');
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());