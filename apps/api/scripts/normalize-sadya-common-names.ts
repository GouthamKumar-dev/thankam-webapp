import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Aligning Sadya thodukari items to common, customer-friendly names...');

  const sadyaCategory = await prisma.category.findUnique({
    where: { id: '785f8008-405c-4d2b-9121-9b96494fbc2f' },
  });

  if (!sadyaCategory) {
    console.error('Sadya leaf category not found');
    return;
  }

  // 1. Ensure primary common items are present with clean descriptions
  const commonNames = [
    {
      name: 'Thoran',
      description: 'Traditional Kerala dry vegetable stir-fry with grated fresh coconut, shallots, and curry leaves (Cabbage / Beans / Raw Banana).',
      unit: 'plate',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661d19681404026.webp',
    },
    {
      name: 'Kichadi',
      description: 'Classic Kerala banquet lightly spiced curd and grated coconut relish tempered with mustard seeds and curry leaves (Cucumber / Okra / Bitter Gourd).',
      unit: 'plate',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661d199279c7a26.webp',
    },
    {
      name: 'Pachadi',
      description: 'Traditional Kerala sweet and tangy yogurt relish prepared with mustard and coconut paste.',
      unit: 'plate',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661d19dfb37fc26.webp',
    },
    {
      name: 'Madhura Pachadi',
      description: 'Authentic sweet Sadhya pachadi slow-cooked with fresh ripe pineapple chunks, purple grapes, curd, and natural jaggery.',
      unit: 'plate',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661d1a00c940b26.webp',
    },
  ];

  for (const it of commonNames) {
    // Check if uppercase or exact exists
    const existing = await prisma.item.findFirst({
      where: {
        categoryId: sadyaCategory.id,
        name: { in: [it.name, it.name.toUpperCase()] },
      },
    });

    if (existing) {
      await prisma.item.update({
        where: { id: existing.id },
        data: {
          name: it.name, // clean Title Case name: "Thoran", "Kichadi", "Pachadi", "Madhura Pachadi"
          description: it.description,
          unit: it.unit,
          imageUrl: it.imageUrl,
          isActive: true,
        },
      });
      console.log(`✓ Updated common item: "${it.name}" (ID: ${existing.id})`);
    } else {
      await prisma.item.create({
        data: {
          categoryId: sadyaCategory.id,
          name: it.name,
          description: it.description,
          unit: it.unit,
          basePrice: 0,
          imageUrl: it.imageUrl,
          isActive: true,
        },
      });
      console.log(`+ Created common item: "${it.name}"`);
    }
  }

  // 2. Also label the specific varieties clearly so they are obvious sub-options
  const renameVarieties = [
    {
      from: 'BEANS PORIYAL',
      to: 'Thoran (Beans Poriyal)',
      desc: 'Fresh French beans stir-fried with grated coconut and mustard seeds.',
    },
    {
      from: 'PAVAKKA KICHADI',
      to: 'Kichadi (Pavakka / Bitter Gourd)',
      desc: 'Crispy fried bitter gourd slices mixed in spiced yogurt sauce.',
    },
    {
      from: 'BEETROOT PACHADI',
      to: 'Pachadi (Beetroot)',
      desc: 'Vibrant pink-hued grated beetroot cooked in coconut yogurt gravy.',
    },
    {
      from: 'PINEAPPLE PACHADI',
      to: 'Pachadi (Pineapple)',
      desc: 'Sweet and tangy crushed pineapple slow-cooked in mustard yogurt sauce.',
    },
    {
      from: 'MADHURA CURRY',
      to: 'Madhura Pachadi (Sweet Curry)',
      desc: 'Rich sweet Sadhya fruit curry with pineapple, grapes, and jaggery.',
    },
  ];

  for (const v of renameVarieties) {
    const it = await prisma.item.findFirst({
      where: {
        categoryId: sadyaCategory.id,
        name: { in: [v.from, v.to] },
      },
    });

    if (it) {
      await prisma.item.update({
        where: { id: it.id },
        data: {
          name: v.to,
          description: v.desc,
        },
      });
      console.log(`✓ Clarified variant name: "${v.from}" -> "${v.to}"`);
    }
  }

  console.log('\nAll common Sadya thodukari names are now standard and easy to recognize!');
}

main().finally(async () => {
  await prisma.$disconnect();
});
