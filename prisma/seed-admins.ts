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

  // Replace these with real testnet wallet PKHs later
  const admins = [
    {
      email: 'admin1@freelancepact.io',
      fullName: 'Council Admin 1',
      password: passwordHash,
      isAdmin: true,
      walletPkh: 'dummy_pkh_1', // UPDATE ME
    },
    {
      email: 'admin2@freelancepact.io',
      fullName: 'Council Admin 2',
      password: passwordHash,
      isAdmin: true,
      walletPkh: 'dummy_pkh_2', // UPDATE ME
    },
    {
      email: 'admin3@freelancepact.io',
      fullName: 'Council Admin 3',
      password: passwordHash,
      isAdmin: true,
      walletPkh: 'dummy_pkh_3', // UPDATE ME
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
