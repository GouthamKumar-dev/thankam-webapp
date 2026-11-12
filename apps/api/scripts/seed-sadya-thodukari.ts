import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const sadyaCategory = await prisma.category.findUnique({
    where: { id: '785f8008-405c-4d2b-9121-9b96494fbc2f' },
  });

  if (!sadyaCategory) {
    console.error('Sadya leaf category not found');
    return;
  }

  const itemsToAdd = [
    {
      name: 'THORAN',
      description: 'Traditional Kerala dry vegetable stir-fry with grated fresh coconut, mustard seeds, curry leaves, and green chillies (Cabbage / Beans / Raw Banana).',
      unit: 'plate',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661d19681404026.webp',
    },
    {
      name: 'MADHURA PACHADI',
      description: 'Sweet, rich Sadhya pachadi slow-cooked with fresh ripe pineapple chunks, purple grapes, mustard, curd, and pure jaggery.',
      unit: 'plate',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661d1a00c940b26.webp',
    },
    {
      name: 'PACHADI',
      description: 'Classic Kerala banquet curd and grated coconut pachadi tempered with mustard seeds and curry leaves.',
      unit: 'plate',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661d19dfb37fc26.webp',
    },
  ];

  for (const it of itemsToAdd) {
    const upserted = await prisma.item.upsert({
      where: {
        categoryId_name: {
          categoryId: sadyaCategory.id,
          name: it.name,
        },
      },
      update: {
        description: it.description,
        unit: it.unit,
        basePrice: 0,
        imageUrl: it.imageUrl,
        isActive: true,
      },
      create: {
        categoryId: sadyaCategory.id,
        name: it.name,
        description: it.description,
        unit: it.unit,
        basePrice: 0,
        imageUrl: it.imageUrl,
        isActive: true,
      },
    });
    console.log(`✓ Seeded Sadya item: ${upserted.name}`);
  }
}

main().finally(async () => {
  await prisma.$disconnect();
});
