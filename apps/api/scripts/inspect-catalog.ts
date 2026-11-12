import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const cats = await prisma.category.findMany({
    include: { items: { select: { name: true } } },
    orderBy: { name: 'asc' },
  });

  for (const c of cats) {
    if (c.items.length > 0) {
      console.log(`\n=== [${c.name}] (Total: ${c.items.length}) ===`);
      console.log(c.items.map((i) => i.name).join(' | '));
    }
  }
}

main().finally(async () => {
  await prisma.$disconnect();
});
