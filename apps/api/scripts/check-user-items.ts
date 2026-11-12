import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const targets = [
  // Payasam
  { label: 'adapradhaman', terms: ['ada', 'pradhaman'] },
  { label: 'semiya', terms: ['semiya'] },
  { label: 'kadala', terms: ['kadala'] },
  
  // Ozhippu (5 types)
  { label: 'parippu neyyu', terms: ['parippu', 'neyy'] },
  { label: 'sambar', terms: ['sambar'] },
  { label: 'pulisheri', terms: ['pulisheri', 'pulissery'] },
  { label: 'rasam', terms: ['rasam'] },
  { label: 'pachamore', terms: ['pacha more', 'pachamore', 'more', 'moru', 'sambharam'] },
  
  // Staples
  { label: 'sharakkaraperatty', terms: ['sharakkara', 'sharkara', 'varatti', 'peratty'] },
  { label: 'chips', terms: ['chips', 'upperi'] },
  { label: 'pappadam', terms: ['pappadam', 'pappad'] },
  { label: 'pazham', terms: ['pazham', 'banana'] },
  { label: 'vazhaela', terms: ['vazha', 'ela', 'leaf'] },
];

async function main() {
  const allItems = await prisma.item.findMany({
    include: { category: true },
    orderBy: { name: 'asc' },
  });

  console.log(`Total items in DB: ${allItems.length}`);

  for (const t of targets) {
    const matches = allItems.filter((i) => {
      const lowerName = i.name.toLowerCase();
      const lowerDesc = (i.description ?? '').toLowerCase();
      return t.terms.some((term) => lowerName.includes(term) || lowerDesc.includes(term));
    });

    console.log(`\n=============================`);
    console.log(`Target: "${t.label}" -> Found ${matches.length} item(s):`);
    if (matches.length === 0) {
      console.log(`  MISSING!`);
    } else {
      for (const m of matches) {
        console.log(`  - [${m.category?.name ?? 'No Cat'}] ${m.name} (id: ${m.id})`);
      }
    }
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
