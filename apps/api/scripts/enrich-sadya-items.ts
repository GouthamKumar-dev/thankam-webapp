import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const sadyaCategory = await prisma.category.findFirst({
    where: {
      name: { in: ['SADYA', 'Sadya'] },
      parentId: { not: null },
    },
  });

  if (!sadyaCategory) {
    console.error('Sadya category not found!');
    return;
  }

  const categoryId = sadyaCategory.id;
  console.log('Using Sadya Category ID:', categoryId);

  // 1. Update PULISSERI to include 'pulisheri' and 'pulissery' in description & title
  const pulisseri = await prisma.item.findFirst({
    where: { name: { contains: 'pulisseri', mode: 'insensitive' } },
  });
  if (pulisseri) {
    await prisma.item.update({
      where: { id: pulisseri.id },
      data: {
        name: 'Pulisheri (Pulisseri)',
        description: 'Pulisheri / Pulissery / Moru curry traditional Kerala sadhya ozhippu curry',
      },
    });
    console.log('Updated Pulisheri:', pulisseri.id);
  }

  // 2. Update SHARKKARA UPPERI to include 'sharakkaraperatty', 'sharakkara peratty', 'sharkkara varatti'
  const sharkkaraUpperi = await prisma.item.findFirst({
    where: { name: { contains: 'sharkkara upperi', mode: 'insensitive' } },
  });
  if (sharkkaraUpperi) {
    await prisma.item.update({
      where: { id: sharkkaraUpperi.id },
      data: {
        name: 'Sharakkaraperatty (Sharkkara Upperi)',
        description: 'Sharakkaraperatty / Sharakkara Peratty / Sharkkara Upperi / Sarkara Varatti jaggery banana chips',
      },
    });
    console.log('Updated Sharkkara Upperi / Sharakkaraperatty:', sharkkaraUpperi.id);
  }

  // 3. Update VARUTHA UPPERI to include 'chips' and 'banana chips'
  const varuthaUpperi = await prisma.item.findFirst({
    where: { name: { contains: 'varutha upperi', mode: 'insensitive' } },
  });
  if (varuthaUpperi) {
    await prisma.item.update({
      where: { id: varuthaUpperi.id },
      data: {
        name: 'Chips (Banana Chips / Varutha Upperi)',
        description: 'Chips / Banana Chips / Upperi / Kaya Varuthathu crisp Kerala banana chips',
      },
    });
    console.log('Updated Varutha Upperi / Chips:', varuthaUpperi.id);
  }

  // 4. Update VAZHA ELA to include 'vazhaela', 'banana leaf', 'plantain leaf'
  const vazhaEla = await prisma.item.findFirst({
    where: { name: { contains: 'vazha ela', mode: 'insensitive' } },
  });
  if (vazhaEla) {
    await prisma.item.update({
      where: { id: vazhaEla.id },
      data: {
        description: 'Vazhaela / Vazha Ela / Banana Leaf / Plantain leaf clean organic dining leaf',
      },
    });
    console.log('Updated Vazha Ela:', vazhaEla.id);
  }

  // 5. Update PACHA MORU to include 'pachamore' and 'sambharam'
  const pachaMoru = await prisma.item.findFirst({
    where: { name: { contains: 'pacha moru', mode: 'insensitive' } },
  });
  if (pachaMoru) {
    await prisma.item.update({
      where: { id: pachaMoru.id },
      data: {
        description: 'Pachamore / Pacha Moru / Sambharam / Buttermilk traditional spiced sadhya buttermilk',
      },
    });
    console.log('Updated Pacha Moru:', pachaMoru.id);
  }

  // 6. Update PARIPPU NEYYU to include 'parippu neyyu', 'ghee'
  const parippuNeyyu = await prisma.item.findFirst({
    where: { name: { contains: 'parippu neyyu', mode: 'insensitive' } },
  });
  if (parippuNeyyu) {
    await prisma.item.update({
      where: { id: parippuNeyyu.id },
      data: {
        description: 'Parippu Neyyu / Parippu and Ghee traditional first course sadhya ozhippu curry',
      },
    });
    console.log('Updated Parippu Neyyu:', parippuNeyyu.id);
  }

  // 7. Update ADA PRADHAMAN to include 'adapradhaman'
  const adaPradhaman = await prisma.item.findFirst({
    where: { name: { contains: 'ada pradhaman', mode: 'insensitive' } },
  });
  if (adaPradhaman) {
    await prisma.item.update({
      where: { id: adaPradhaman.id },
      data: {
        description: 'Ada Pradhaman / Adapradhaman traditional Kerala sadhya jaggery & coconut milk payasam',
      },
    });
    console.log('Updated Ada Pradhaman:', adaPradhaman.id);
  }

  // 8. Update KADALA PAYASAM to include 'kadala'
  const kadalaPayasam = await prisma.item.findFirst({
    where: { name: { contains: 'kadala payasam', mode: 'insensitive' } },
  });
  if (kadalaPayasam) {
    await prisma.item.update({
      where: { id: kadalaPayasam.id },
      data: {
        description: 'Kadala Payasam / Kadalapayasam traditional chana dal jaggery payasam',
      },
    });
    console.log('Updated Kadala Payasam:', kadalaPayasam.id);
  }

  // 9. Update SEMIYA PAYASAM to include 'semiya'
  const semiyaPayasam = await prisma.item.findFirst({
    where: { name: { contains: 'semiya payasam', mode: 'insensitive' } },
  });
  if (semiyaPayasam) {
    await prisma.item.update({
      where: { id: semiyaPayasam.id },
      data: {
        description: 'Semiya Payasam / Semiyapayasam vermicelli milk payasam',
      },
    });
    console.log('Updated Semiya Payasam:', semiyaPayasam.id);
  }

  // 10. Update SAMBAR
  const sambar = await prisma.item.findFirst({
    where: { name: 'SAMBAR', categoryId },
  });
  if (sambar) {
    await prisma.item.update({
      where: { id: sambar.id },
      data: {
        description: 'Sambar traditional Kerala sadhya mixed vegetable lentil ozhippu curry',
      },
    });
    console.log('Updated Sambar:', sambar.id);
  }

  // 11. Update RASAM
  const rasam = await prisma.item.findFirst({
    where: { name: 'RASAM', categoryId },
  });
  if (rasam) {
    await prisma.item.update({
      where: { id: rasam.id },
      data: {
        description: 'Rasam traditional Kerala tangy spiced pepper ozhippu broth',
      },
    });
    console.log('Updated Rasam:', rasam.id);
  }

  // 12. Update PAPPADAM
  const pappadam = await prisma.item.findFirst({
    where: { name: 'PAPPADAM', categoryId },
  });
  if (pappadam) {
    await prisma.item.update({
      where: { id: pappadam.id },
      data: {
        description: 'Pappadam / Papad crisp fried Kerala lentil wafers',
      },
    });
    console.log('Updated Pappadam:', pappadam.id);
  }

  // 13. Update PAZHAM
  const pazham = await prisma.item.findFirst({
    where: { name: 'PAZHAM', categoryId },
  });
  if (pazham) {
    await prisma.item.update({
      where: { id: pazham.id },
      data: {
        description: 'Pazham / Small banana (Rasakadali / Poovan) served for sadhya with payasam',
      },
    });
    console.log('Updated Pazham:', pazham.id);
  }

  console.log('\nEnrichment complete!');
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
