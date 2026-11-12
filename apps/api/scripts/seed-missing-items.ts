import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding missing real-world event and catering items...');

  // 1. Find or create Categories
  const food = await prisma.category.findFirst({
    where: { name: 'Food', parentId: null },
  });

  const general = await prisma.category.findFirst({
    where: { name: { in: ['General', 'GENERAL'] } },
  });

  const sadya = await prisma.category.findFirst({
    where: { name: { in: ['Sadya', 'SADYA'] } },
  });

  // Subcategories
  const eveningSnacks = await prisma.category.findFirst({
    where: { name: 'Evening Snacks' },
  });

  const thattukada = await prisma.category.findFirst({
    where: { name: 'Special Thattukada' },
  });

  const hotBeverages = await prisma.category.findFirst({
    where: { name: 'Hot Beverages' },
  });

  // Sadya leaf category
  const sadyaLeaf = (await prisma.category.findFirst({
    where: {
      parentId: sadya?.id,
      name: { in: ['Sadya', 'SADYA'] },
    },
  })) ?? sadya;

  console.log('Categories identified:');
  console.log('- Sadya Leaf:', sadyaLeaf?.id, sadyaLeaf?.name);
  console.log('- Evening Snacks:', eveningSnacks?.id);
  console.log('- Special Thattukada:', thattukada?.id);
  console.log('- Hot Beverages:', hotBeverages?.id);

  // ── Items to Seed ──
  type SeedItem = {
    name: string;
    description?: string;
    unit: string;
    basePrice: number;
    categoryId?: string;
    imageUrl?: string;
  };

  const sadyaItems: SeedItem[] = [
    {
      name: 'PACHA MORU',
      description: 'Refreshing traditional Kerala spiced buttermilk (Sambharam) infused with ginger, green chillies, shallots, and fresh curry leaves.',
      unit: 'glass',
      basePrice: 0,
      categoryId: sadyaLeaf?.id,
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661d1c101eb5c26.webp',
    },
    {
      name: 'PARIPPU VADA',
      description: 'Crispy, golden, and crunchy Kerala-style chana dal fritters seasoned with shallots, ginger, and curry leaves.',
      unit: 'piece',
      basePrice: 0,
      categoryId: sadyaLeaf?.id,
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_6614c2770a4af26.webp',
    },
    {
      name: 'PAVAKKA KONDATTAM',
      description: 'Sun-dried bitter gourd curd crisps fried in coconut oil to crunchy perfection.',
      unit: 'plate',
      basePrice: 0,
      categoryId: sadyaLeaf?.id,
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661d19bb55be226.webp',
    },
    {
      name: 'KAPPA MULAKU CHUTNEY',
      description: 'Spiced red chilli and shallot dip (Kanthari Chammanthi) for hot boiled tapioca.',
      unit: 'plate',
      basePrice: 0,
      categoryId: sadyaLeaf?.id,
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_6614c0e838b2b26.webp',
    },
    {
      name: 'PARIPPU NEYYU',
      description: 'Slow-simmered yellow moong dal topped with pure desi ghee for the initial Sadhya course.',
      unit: 'bowl',
      basePrice: 0,
      categoryId: sadyaLeaf?.id,
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661d1baf01b1326.webp',
    },
    {
      name: 'VAZHA ELA',
      description: 'Fresh clean organic plantain banana leaves prepared for traditional Sadhya dining.',
      unit: 'piece',
      basePrice: 0,
      categoryId: sadyaLeaf?.id,
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661d18965aa4f26.webp',
    },
    {
      name: 'KUPPI VELLAM (500ML)',
      description: 'Packaged 500ml sealed mineral drinking water bottles for banquet guests.',
      unit: 'piece',
      basePrice: 0,
      categoryId: sadyaLeaf?.id,
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_6614c1ca0287526.webp',
    },
  ];

  const snacksItems: SeedItem[] = [
    {
      name: 'Mulaku Bajji',
      description: 'Crispy golden batter-fried long green banana chillies (Mirchi Bajji) served hot with onion coconut chutney.',
      unit: 'piece',
      basePrice: 0,
      categoryId: eveningSnacks?.id,
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661fa199c786026.webp',
    },
    {
      name: 'Vazhakka Bajji',
      description: 'Thinly sliced raw banana dipped in spiced gram flour batter and fried crisp in fresh coconut oil.',
      unit: 'piece',
      basePrice: 0,
      categoryId: eveningSnacks?.id,
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661fa199c786026.webp',
    },
    {
      name: 'Urulakkizhangu Bajji',
      description: 'Spiced potato slices batter-coated and deep-fried to golden crispness.',
      unit: 'piece',
      basePrice: 0,
      categoryId: eveningSnacks?.id,
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661fa199c786026.webp',
    },
    {
      name: 'Ulli Bajji',
      description: 'Crunchy sliced onion fritters seasoned with fresh ginger, curry leaves, and green chillies.',
      unit: 'piece',
      basePrice: 0,
      categoryId: eveningSnacks?.id,
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661fa199c786026.webp',
    },
    {
      name: 'Veg Nuggets',
      description: 'Crunchy golden vegetarian nuggets made with mashed garden vegetables and aromatic herbs.',
      unit: 'piece',
      basePrice: 0,
      categoryId: eveningSnacks?.id,
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661fa23be7c6e26.webp',
    },
    {
      name: 'Parippu Vada',
      description: 'Crispy Kerala crunchy dal fritters with ginger, shallots, and curry leaves.',
      unit: 'piece',
      basePrice: 0,
      categoryId: eveningSnacks?.id,
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_6614c2770a4af26.webp',
    },
    {
      name: 'Uzhunnu Vada',
      description: 'Traditional crispy golden medu vada made from fluffy urad dal batter with whole black pepper.',
      unit: 'piece',
      basePrice: 0,
      categoryId: eveningSnacks?.id,
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_6614c2770a4af26.webp',
    },
    {
      name: 'Veg Cutlet',
      description: 'Crispy breadcrumb-coated vegetable patties spiced with Malabar garam masala.',
      unit: 'piece',
      basePrice: 0,
      categoryId: eveningSnacks?.id,
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661fa23be7c6e26.webp',
    },
    {
      name: 'Pazham Pori',
      description: 'Authentic Kerala ripe plantain fritters (Ethakka Appam) fried golden in pure coconut oil.',
      unit: 'piece',
      basePrice: 0,
      categoryId: eveningSnacks?.id,
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661fa199c786026.webp',
    },
  ];

  const thattukadaItems: SeedItem[] = [
    {
      name: 'Kappa Mulaku Chutney',
      description: 'Spiced red chilli and shallot chutney paired with steaming hot tapioca.',
      unit: 'plate',
      basePrice: 0,
      categoryId: thattukada?.id,
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_6614c0e838b2b26.webp',
    },
    {
      name: 'Mulaku Bajji',
      description: 'Hot chilli bajjis served live straight from the wok.',
      unit: 'piece',
      basePrice: 0,
      categoryId: thattukada?.id,
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661fa199c786026.webp',
    },
    {
      name: 'Vazhakka Bajji',
      description: 'Hot raw banana bajjis fried live in fresh oil.',
      unit: 'piece',
      basePrice: 0,
      categoryId: thattukada?.id,
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661fa199c786026.webp',
    },
    {
      name: 'Parippu Vada',
      description: 'Crunchy hot parippu vada straight from the live stall.',
      unit: 'piece',
      basePrice: 0,
      categoryId: thattukada?.id,
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_6614c2770a4af26.webp',
    },
  ];

  const beverageItems: SeedItem[] = [
    {
      name: 'Sulaimani',
      description: 'Fragrant Malabar spiced black tea brewed with fresh mint leaves, lemon juice, and crushed cardamom.',
      unit: 'glass',
      basePrice: 0,
      categoryId: hotBeverages?.id,
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e68f19e75b26.webp',
    },
    {
      name: 'Filter Coffee (Live)',
      description: 'Freshly brewed aromatic South Indian filter kaapi served frothy and hot.',
      unit: 'cup',
      basePrice: 0,
      categoryId: hotBeverages?.id,
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e69797f69f26.webp',
    },
  ];

  const allItemsToSeed = [
    ...sadyaItems,
    ...snacksItems,
    ...thattukadaItems,
    ...beverageItems,
  ].filter((it) => Boolean(it.categoryId));

  let upsertedCount = 0;
  for (const item of allItemsToSeed) {
    if (!item.categoryId) continue;

    await prisma.item.upsert({
      where: {
        categoryId_name: {
          categoryId: item.categoryId,
          name: item.name,
        },
      },
      update: {
        description: item.description,
        unit: item.unit,
        basePrice: item.basePrice,
        imageUrl: item.imageUrl,
        isActive: true,
      },
      create: {
        categoryId: item.categoryId,
        name: item.name,
        description: item.description,
        unit: item.unit,
        basePrice: item.basePrice,
        imageUrl: item.imageUrl,
        isActive: true,
      },
    });
    upsertedCount++;
    console.log(`✓ Seeded item: [${item.name}] in category [${item.categoryId}]`);
  }

  console.log(`\nSuccessfully seeded ${upsertedCount} missing real-world items into database.`);
}

main()
  .catch((err) => {
    console.error('Seeding error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
