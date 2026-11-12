import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const sadyaCats = await prisma.category.findMany({
    where: {
      OR: [
        { name: { in: ['Sadya', 'SADYA'] } },
        { parent: { name: { in: ['Sadya', 'SADYA'] } } },
      ],
    },
    include: {
      items: {
        select: { id: true, name: true, unit: true },
        orderBy: { name: 'asc' },
      },
    },
  });

  for (const c of sadyaCats) {
    console.log(`\n=== Category: [${c.name}] (ID: ${c.id}) ===`);
    console.log(c.items.map((i) => i.name).join(' | '));
  }
}

main().finally(async () => {
  await prisma.$disconnect();
});
