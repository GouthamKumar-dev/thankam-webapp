/**
 * fix-units.ts
 *
 * Normalises the `unit` field on every Item row so it matches one of:
 *   plate | bowl | glass | piece | scoop
 *
 * Rules are applied in priority order:
 *   1. Item-name keyword match  (highest specificity)
 *   2. Category-name keyword match
 *   3. Parent-category keyword match
 *   4. Fallback → 'plate'
 *
 * Usage:
 *   ts-node scripts/fix-units.ts            # apply changes
 *   ts-node scripts/fix-units.ts --dry-run  # preview only (no DB writes)
 *
 * Add to package.json:
 *   "fix-units": "ts-node scripts/fix-units.ts"
 *   "fix-units:dry": "ts-node scripts/fix-units.ts --dry-run"
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const isDry  = process.argv.includes('--dry-run');

/* ─── Allowed units ─────────────────────────────────────────────────────── */
type Unit = 'plate' | 'bowl' | 'glass' | 'piece' | 'scoop';
const ALLOWED: Unit[] = ['plate', 'bowl', 'glass', 'piece', 'scoop'];

/* ─── Keyword rules ─────────────────────────────────────────────────────── */
// Each entry: [keyword (lowercase substring), unit]
// Applied against item name, then category name, then parent category name.

const NAME_RULES: [string, Unit][] = [
  // Drinks → glass
  ['shake',        'glass'],
  ['punch',        'glass'],
  ['juice',        'glass'],
  ['mocktail',     'glass'],
  ['lassi',        'glass'],
  ['milkshake',    'glass'],
  ['smoothie',     'glass'],
  ['lemonade',     'glass'],
  ['lime',         'glass'],
  ['lemon',        'glass'],
  ['soda',         'glass'],
  ['cola',         'glass'],
  ['coffee',       'glass'],
  ['tea',          'glass'],
  ['buttermilk',   'glass'],
  ['rose milk',    'glass'],
  ['coconut water','glass'],
  ['energy drink', 'glass'],
  ['velvette',     'glass'],
  ['cool blue',    'glass'],
  ['fresh lime',   'glass'],
  ['mint lime',    'glass'],
  ['ginger lime',  'glass'],
  ['mirchi lime',  'glass'],

  // Soups → bowl
  ['soup',         'bowl'],
  ['rasam',        'bowl'],
  ['stew',         'bowl'],
  ['sambar',       'bowl'],
  ['dal',          'bowl'],
  ['curry',        'bowl'],
  ['gravy',        'bowl'],
  ['porridge',     'bowl'],
  ['payasam',      'bowl'],
  ['kheer',        'bowl'],

  // Ice creams → scoop
  ['ice cream',    'scoop'],
  ['scoop',        'scoop'],
  ['gelato',       'scoop'],
  ['sorbet',       'scoop'],

  // Individual pieces → piece
  ['sandwich',     'piece'],
  ['burger',       'piece'],
  ['roll',         'piece'],
  ['wrap',         'piece'],
  ['pancake',      'piece'],
  ['waffle',       'piece'],
  ['lollipop',     'piece'],
  ['kebab',        'piece'],
  ['cutlet',       'piece'],
  ['nugget',       'piece'],
  ['tikki',        'piece'],
  ['vada',         'piece'],
  ['puri',         'piece'],
  ['idli',         'piece'],
  ['dosa',         'piece'],
];

const CATEGORY_RULES: [string, Unit][] = [
  // Drink categories → glass
  ['welcome drink', 'glass'],
  ['mocktail',      'glass'],
  ['shake',         'glass'],
  ['juice',         'glass'],
  ['beverage',      'glass'],
  ['drink',         'glass'],
  ['lassi',         'glass'],

  // Soup categories → bowl
  ['soup',          'bowl'],
  ['rasam',         'bowl'],
  ['dal',           'bowl'],

  // Dessert/ice cream categories → scoop
  ['ice cream',     'scoop'],
  ['dessert',       'scoop'],

  // Salads → bowl (smaller, served in bowls)
  ['salad',         'bowl'],
  ['raita',         'bowl'],
  ['chutney',       'bowl'],
  ['pickle',        'bowl'],
];

/* ─── Helpers ───────────────────────────────────────────────────────────── */

function matchRules(text: string, rules: [string, Unit][]): Unit | null {
  const lower = text.toLowerCase();
  for (const [kw, unit] of rules) {
    if (lower.includes(kw)) return unit;
  }
  return null;
}

function resolveUnit(item: {
  name: string;
  unit: string | null;
  category: { name: string; parent?: { name: string } | null };
}): Unit {
  // 1. Item name keywords
  const byName = matchRules(item.name, NAME_RULES);
  if (byName) return byName;

  // 2. Immediate category keywords
  const byCat = matchRules(item.category.name, CATEGORY_RULES);
  if (byCat) return byCat;

  // 3. Parent category keywords
  if (item.category.parent) {
    const byParent = matchRules(item.category.parent.name, CATEGORY_RULES);
    if (byParent) return byParent;
  }

  // 4. If the existing unit is already valid, keep it
  if (item.unit && ALLOWED.includes(item.unit as Unit)) {
    return item.unit as Unit;
  }

  // 5. Default fallback
  return 'plate';
}

/* ─── Main ──────────────────────────────────────────────────────────────── */

async function main() {
  console.log(`\n🔧  fix-units  ${isDry ? '[DRY RUN — no changes will be written]' : '[LIVE RUN]'}\n`);

  const items = await prisma.item.findMany({
    select: {
      id: true,
      name: true,
      unit: true,
      category: {
        select: {
          name: true,
          parent: { select: { name: true } },
        },
      },
    },
    orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }],
  });

  console.log(`Found ${items.length} items.\n`);

  type Change = { id: string; name: string; category: string; old: string | null; new: Unit };
  const changes: Change[]  = [];
  const nochange: string[] = [];

  for (const item of items) {
    const resolved = resolveUnit(item);
    if (item.unit === resolved) {
      nochange.push(item.name);
    } else {
      changes.push({
        id:       item.id,
        name:     item.name,
        category: `${item.category.parent ? item.category.parent.name + ' › ' : ''}${item.category.name}`,
        old:      item.unit,
        new:      resolved,
      });
    }
  }

  /* ── Print changes ── */
  if (changes.length === 0) {
    console.log('✅  All items already have correct units. Nothing to update.\n');
  } else {
    console.log(`📝  ${changes.length} item(s) will be updated:\n`);
    const colW = Math.min(42, Math.max(...changes.map(c => c.name.length)) + 2);
    console.log(`  ${'ITEM'.padEnd(colW)}  ${'CATEGORY'.padEnd(36)}  OLD → NEW`);
    console.log(`  ${'─'.repeat(colW)}  ${'─'.repeat(36)}  ─────────`);
    for (const c of changes) {
      const old = (c.old ?? 'null').padEnd(8);
      console.log(`  ${c.name.padEnd(colW)}  ${c.category.padEnd(36)}  ${old} → ${c.new}`);
    }
    console.log();
  }

  if (!isDry && changes.length > 0) {
    console.log('💾  Applying updates…');
    let updated = 0;
    for (const c of changes) {
      await prisma.item.update({
        where: { id: c.id },
        data:  { unit: c.new },
      });
      updated++;
      if (updated % 20 === 0) process.stdout.write(`   ${updated}/${changes.length}…\r`);
    }
    console.log(`✅  Updated ${updated} item(s) successfully.\n`);
  } else if (isDry) {
    console.log('ℹ️   Dry run — no changes written. Re-run without --dry-run to apply.\n');
  }

  /* ── Summary ── */
  const byUnit: Record<string, number> = {};
  for (const item of items) {
    const u = changes.find(c => c.id === item.id)?.new ?? (item.unit as Unit) ?? 'plate';
    byUnit[u] = (byUnit[u] ?? 0) + 1;
  }
  console.log('📊  Unit distribution after run:');
  for (const [unit, count] of Object.entries(byUnit).sort()) {
    console.log(`   ${unit.padEnd(8)} ${count} items`);
  }
  console.log();
}

main()
  .catch(e => { console.error('❌  Error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
