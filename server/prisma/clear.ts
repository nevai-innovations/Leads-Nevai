import { PrismaClient } from '@prisma/client';

/** Deletes ALL leads and follow-up history and resets serial numbers to CW-0001. */
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "FollowUpNote", "Lead" RESTART IDENTITY CASCADE');
  console.log('All leads and follow-up notes deleted.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
