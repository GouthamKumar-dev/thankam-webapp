import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const rootCats = await prisma.category.findMany({
    where: { parentId: null },
    include: {
      children: {
        include: {
          children: true,
          items: true,
        },
      },
      items: true,
    },
  });

  console.log(`Root categories count: ${rootCats.length}`);
  for (const c of rootCats) {
    console.log(`\nRoot [${c.name}] id=${c.id}`);
    console.log(`- Direct items: ${c.items.length}`);
    console.log(`- Children: ${c.children.length}`);
    for (const ch of c.children) {
      console.log(`  -> Child [${ch.name}] id=${ch.id}, items=${ch.items.length}, grandchildren=${ch.children.length}`);
      for (const gc of ch.children) {
        console.log(`     -> Grandchild [${gc.name}] id=${gc.id}`);
      }
    }
  }
}

main().finally(async () => {
  await prisma.$disconnect();
});
