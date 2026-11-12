import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const sadyaCategory = await prisma.category.findUnique({
    where: { id: '785f8008-405c-4d2b-9121-9b96494fbc2f' },
    include: {
      items: {
        orderBy: { name: 'asc' },
      },
    },
  });

  console.log(`Sadya Items Count: ${sadyaCategory?.items.length}`);
  for (const it of sadyaCategory?.items ?? []) {
    console.log(`- ${it.id} : "${it.name}" (unit: ${it.unit}, active: ${it.isActive})`);
  }
}

main().finally(async () => {
  await prisma.$disconnect();
});
