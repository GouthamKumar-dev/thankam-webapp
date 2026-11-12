import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const alternativeNames = [
    'BEANS PORIYAL',
    'PAVAKKA KICHADI',
    'BEETROOT PACHADI',
    'PINEAPPLE PACHADI',
    'MADHURA CURRY',
  ];

  for (const name of alternativeNames) {
    const item = await prisma.item.findFirst({
      where: { name },
      include: {
        _count: {
          select: { menuItems: true, quotationItems: true },
        },
      },
    });

    console.log(
      `- "${name}": menuItems count = ${item?._count.menuItems ?? 0}, quotationItems count = ${item?._count.quotationItems ?? 0}`,
    );
  }
}

main().finally(async () => {
  await prisma.$disconnect();
});
