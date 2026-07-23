import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 10);

  // Valid 28-byte (56-char hex) PKHs for dev/testnet Council
  // These are placeholder PKHs for development — replace with real testnet PKHs in production
  const admins = [
    {
      email: 'admin1@freelancepact.io',
      fullName: 'Council Admin 1',
      password: passwordHash,
      isAdmin: true,
      walletPkh: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8',
    },
    {
      email: 'admin2@freelancepact.io',
      fullName: 'Council Admin 2',
      password: passwordHash,
      isAdmin: true,
      walletPkh: 'b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9',
    },
    {
      email: 'admin3@freelancepact.io',
      fullName: 'Council Admin 3',
      password: passwordHash,
      isAdmin: true,
      walletPkh: 'c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0',
    },
  ];

  console.log('Start seeding admins...');
  for (const admin of admins) {
    const user = await prisma.user.upsert({
      where: { email: admin.email },
      update: {
        isAdmin: admin.isAdmin,
        walletPkh: admin.walletPkh,
      },
      create: admin,
    });
    console.log(`Upserted admin: ${user.email} (PKH: ${user.walletPkh})`);
  }
  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
