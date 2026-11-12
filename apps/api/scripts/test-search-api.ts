import { PrismaClient } from '@prisma/client';
import { ItemsService } from '../src/modules/items/items.service';

const prisma = new PrismaClient();
const service = new ItemsService(prisma as any);

const testQueries = [
  'adapradhaman',
  'semiya',
  'kadala',
  'parippu neyyu',
  'sambar',
  'pulisheri',
  'pulisseri',
  'rasam',
  'pachamore',
  'pacha moru',
  'sharakkaraperatty',
  'chips',
  'pappadam',
  'pazham',
  'vazhaela',
  'vazha ela',
];

async function main() {
  console.log('Testing ItemsService.findAll with live search queries:');
  for (const q of testQueries) {
    const res = await service.findAll({ search: q, limit: 10 });
    const names = res.data.map((x) => x.name);
    console.log(`Query "${q}" => ${res.meta.total} found: [${names.slice(0, 3).join(', ')}]`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
