import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Starting Database Deduplication and Cleanup...\n');

  // 1. Read seed items to get canonical names and categories
  const seedFile = path.join(__dirname, '../prisma/seed.ts');
  const content = fs.readFileSync(seedFile, 'utf8');
  const start = content.indexOf('const categorySeeds: CategorySeed[] = [');
  const end = content.indexOf('async function main()');
  const js = content.substring(start, end).replace(': CategorySeed[]', '');
  const sandbox: any = {};
  new Function('sandbox', js + '\nsandbox.seeds = categorySeeds;')(sandbox);

  const seedItems = new Map<string, { name: string; category: string; unit?: string }>();
  function walk(node: any) {
    if (node.items) {
      node.items.forEach((it: any) => {
        seedItems.set(`${node.name.toLowerCase()}:::${it.name.toLowerCase().trim()}`, {
          name: it.name,
          category: node.name,
          unit: it.unit,
        });
      });
    }
    if (node.children) node.children.forEach(walk);
  }
  sandbox.seeds.forEach(walk);

  console.log(`Loaded ${seedItems.size} canonical items from seed.ts.`);

  // 2. Fetch all DB items
  const allDbItems = await prisma.item.findMany({
    include: {
      category: true,
      _count: { select: { quotationItems: true, menuItems: true } },
    },
  });

  console.log(`Found ${allDbItems.length} total items in DB.\n`);

  // 3. Separate into canonical seed items, case duplicates, and orphan legacy items
  const canonicalMap = new Map<string, typeof allDbItems[0]>();
  const duplicatesToDelete: typeof allDbItems[0][] = [];
  const orphansToDelete: typeof allDbItems[0][] = [];

  for (const it of allDbItems) {
    const catNameLower = (it.category?.name || '').toLowerCase();
    const nameLower = it.name.toLowerCase().trim();
    const key = `${catNameLower}:::${nameLower}`;

    if (seedItems.has(key)) {
      const seedDef = seedItems.get(key)!;
      if (it.name === seedDef.name) {
        canonicalMap.set(key, it);
      } else {
        duplicatesToDelete.push(it);
      }
    } else {
      orphansToDelete.push(it);
    }
  }

  console.log(`✓ Canonical items to keep: ${canonicalMap.size}`);
  console.log(`⚠ Case-mismatch duplicates to merge & remove: ${duplicatesToDelete.length}`);
  console.log(`⚠ Stale / typo legacy items to remove: ${orphansToDelete.length}\n`);

  // 4. Merge case duplicates (e.g. "Kappa biriyani" -> "Kappa Biriyani", "GHEE" -> "Ghee")
  for (const dup of duplicatesToDelete) {
    const key = `${(dup.category?.name || '').toLowerCase()}:::${dup.name.toLowerCase().trim()}`;
    const target = canonicalMap.get(key);

    if (target) {
      // Re-point any quotation items referencing the duplicate to the target canonical item
      if (dup._count.quotationItems > 0) {
        await prisma.quotationItem.updateMany({
          where: { itemId: dup.id },
          data: { itemId: target.id },
        });
        console.log(`Re-linked ${dup._count.quotationItems} quotes from "${dup.name}" to "${target.name}".`);
      }

      // Re-link menu items if any
      if (dup._count.menuItems > 0) {
        await prisma.menuItem.deleteMany({
          where: { itemId: dup.id },
        });
      }

      await prisma.item.delete({ where: { id: dup.id } });
      console.log(`Deleted duplicate: "${dup.name}" in category "${dup.category?.name}".`);
    }
  }

  // 5. Clean up stale orphan items not in the seed
  for (const orphan of orphansToDelete) {
    // If referenced in quotations, unlink itemId gracefully
    if (orphan._count.quotationItems > 0) {
      await prisma.quotationItem.updateMany({
        where: { itemId: orphan.id },
        data: { itemId: null },
      });
      console.log(`Unlinked ${orphan._count.quotationItems} quotes from legacy item "${orphan.name}".`);
    }

    if (orphan._count.menuItems > 0) {
      await prisma.menuItem.deleteMany({
        where: { itemId: orphan.id },
      });
    }

    await prisma.item.delete({ where: { id: orphan.id } });
    console.log(`Deleted stale item: "${orphan.name}" (${orphan.category?.name || 'Uncategorized'}).`);
  }

  // 6. Verify final count
  const remainingCount = await prisma.item.count();
  console.log(`\n🎉 Cleanup complete! Total clean items in database: ${remainingCount}`);
}

main()
  .catch((e) => {
    console.error('Cleanup failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
