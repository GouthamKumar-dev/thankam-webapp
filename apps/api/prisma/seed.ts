import { PrismaClient, Role, TemplateStyle } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

type CategorySeed = {
  name: string;
  description?: string;
  children?: CategorySeed[];
  items?: Array<{
    name: string;
    description?: string;
    unit?: string;
    basePrice: number;
    imageUrl?: string;
  }>;
};

const categorySeeds: CategorySeed[] = [
  {
    name: 'Food',
    description: 'Catering food categories',

  },
  {
    name: 'Catering',
    children: [
      {
        name: 'Welcome Drinks',
        items: [
          {
            name: 'Tender Coconut Punch',
            unit: 'glass',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_660edfb40ee0f26.webp',
          },
          {
            name: 'Strawberry Velvette',
            unit: 'glass',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_660ee04a3846526.webp',
          },
          {
            name: 'Badam Pista Velvette',
            unit: 'glass',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_660ee0c91a07226.webp',
          },
          {
            name: 'Chocolate Flip',
            unit: 'glass',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_660ee124320f026.webp',
          },
          {
            name: 'Mango Velvette',
            unit: 'glass',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_660ee1b0a6d6f26.webp',
          },
          {
            name: 'Fruit Punch',
            unit: 'glass',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_660ee1fb182bc26.webp',
          },
          {
            name: 'Cocktail Punch',
            unit: 'glass',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_660ee24f5b02926.webp',
          },
          {
            name: 'Grape Punch',
            unit: 'glass',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_660ee287a877226.webp',
          },
          {
            name: 'Passion Fruit Punch',
            unit: 'glass',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_660ee2d68311c26.webp',
          },
          {
            name: 'Pineapple Punch',
            unit: 'glass',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_660ee332791e126.webp',
          },
          {
            name: 'Mango Punch',
            unit: 'glass',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_660ee35d3977226.webp',
          },
          {
            name: 'Cool Blue',
            unit: 'glass',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_660ee37a19b8b26.webp',
          },
          {
            name: 'Fresh Lime',
            unit: 'glass',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_660ee3d03fec426.webp',
          },
          {
            name: 'Mint Lime',
            unit: 'glass',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_660ee3ed7ede226.webp',
          },
          {
            name: 'Ginger Lime',
            unit: 'glass',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_660ee407a2d9226.webp',
          },
          {
            name: 'Mirchi Lime',
            unit: 'glass',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610464158aa326.webp',
          },
          {
            name: 'Orange',
            unit: 'glass',
            basePrice: 1,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610466e4bc4826.webp',
          },
          {
            name: 'Water melon',
            unit: 'glass',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e505a148cf26.webp',
          },
          {
            name: 'Pine apple',
            unit: 'glass',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e508f4b8f626.webp',
          },
          {
            name: 'Grape',
            unit: 'glass',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e50abba7e726.webp',
          },
          {
            name: 'Mosambi',
            unit: 'glass',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e50d0df1c526.webp',
          },
          {
            name: 'Mango Juice',
            unit: 'glass',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e50fd9da8426.webp',
          },
          {
            name: 'Carrot',
            unit: 'glass',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e5113d07fe26.webp',
          },
          {
            name: 'Pappaya',
            unit: 'glass',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e51280aa8726.webp',
          },
          {
            name: 'Cucumber',
            unit: 'glass',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e5143a791826.webp',
          },
          {
            name: 'Beetroot',
            unit: 'glass',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e5160d894526.webp',
          },
          {
            name: 'Passion Fruit',
            unit: 'glass',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e519088bb626.webp',
          },
          {
            name: 'Guava',
            unit: 'glass',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e51d002c0a26.webp',
          },
          {
            name: 'Apple',
            unit: 'glass',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e51ec35bcd26.webp',
          },
          {
            name: 'Pomogranet',
            unit: 'glass',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e531b10cf126.webp',
          },
          {
            name: 'Gooseberry',
            unit: 'glass',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e534a269b726.webp',
          },
          {
            name: 'Pink Lady',
            unit: 'glass',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e5384b121526.webp',
          },
          {
            name: 'Sugar Cane',
            unit: 'glass',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e53aa7234926.webp',
          },
          {
            name: 'Chikku Shake',
            unit: 'glass',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e53dcb024f26.webp',
          },
          {
            name: 'Shamam Shake',
            unit: 'glass',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e5409ea1a626.webp',
          },
          {
            name: 'Pineapple Smoothie',
            unit: 'glass',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e543689af926.webp',
          },
          {
            name: 'Tender Coconut Shake',
            unit: 'glass',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e545a684ed26.webp',
          },
        ],
      },
      {
        name: 'Mocktails',
        items: [
          {
            name: 'Banana Bonkers',
            unit: 'glass',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6614bb33bb46d26.webp',
          },
          {
            name: 'Mockmosa',
            unit: 'glass',
            basePrice: 1,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6614bb8a2ebc826.webp',
          },
          {
            name: 'Nojito',
            unit: 'glass',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6614bc090cbea26.webp',
          },
          {
            name: 'Blue Shoe',
            unit: 'glass',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6614bc79b00d526.webp',
          },
          {
            name: 'Cherry cocktail',
            unit: 'glass',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6614bce3ccec826.webp',
          },
          {
            name: "Gabbie's Punch",
            unit: 'glass',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6614bd62d294126.webp',
          },
        ],
      },
      {
        name: 'Starters',
        items: [
          {
            name: 'Chicken Nuggets',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_66104812a6b0c26.webp',
          },
          {
            name: 'Spring Roll',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610485fea00826.webp',
          },
          {
            name: 'Chicken Lollipop',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661048ac2d98526.webp',
          },
          {
            name: 'Meat Cutlet',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_66104948138ad26.webp',
          },
          {
            name: 'Crab Balls',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610496cd475126.webp',
          },
          {
            name: 'Chicken Strips',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661049930cc4b26.webp',
          },
          {
            name: 'Squid Rings',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661049b35295626.webp',
          },
          {
            name: 'Veg - Spring Roll',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661049d3ecfb626.webp',
          },
          {
            name: 'Veg -  Cutlet',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_66104b091db4126.webp',
          },
          {
            name: 'Veg Balls',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_66104bcdb6b2026.webp',
          },
          {
            name: 'Veg Roll',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610e487a2aac26.webp',
          },
          {
            name: 'French Fries',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610e4a3e13f226.webp',
          },
          {
            name: 'Unnniyappam',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610e507ed08926.webp',
          },
          {
            name: 'Banana Fry',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610e5336717226.webp',
          },
          {
            name: 'Unnakaya',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610e54f17ffc26.webp',
          },
          {
            name: 'Kinnathappam',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610e5e55f3ac26.webp',
          },
          {
            name: 'Samoosa',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610e608cff3226.webp',
          },
          {
            name: 'Onion Pakkoda',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610e636a176926.webp',
          },
          {
            name: 'Chilly Pakkoda',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610e6ca8134026.webp',
          },
          {
            name: 'Crispy Fried Vegetables',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610e7385f3a026.webp',
          },
          {
            name: 'Cheese & Pineapple',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610e76c720fb26.webp',
          },
          {
            name: 'Cake & Wine',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610e7b6cbdca26.webp',
          },
          {
            name: 'Chiken kataif',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e55943711a26.webp',
          },
          {
            name: 'Prawns kataif',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e55fa7d80826.webp',
          },
          {
            name: 'Singapore Fried Rice',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661f969070a1826.webp',
          },
        ],
      },
      {
        name: 'Salads',
        items: [
          {
            name: 'Green Salad',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610efa1d336c26.webp',
          },
          {
            name: 'Carrot Salad',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610efda3f60b26.webp',
          },
          {
            name: 'Onion Salad',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610f005b7c6626.webp',
          },
          {
            name: 'Tomato Salad',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610f03831eb726.webp',
          },
          {
            name: 'Cucumber Salad',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610f051329e426.webp',
          },
          {
            name: 'Russian Salad',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610f06a5f27e26.webp',
          },
          {
            name: 'Rajma Salad',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610f07e2f6d626.webp',
          },
          {
            name: 'Noodles Salad',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610f0c017e9a26.webp',
          },
          {
            name: 'Pineapple Chat Salad',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610f113b870026.webp',
          },
          {
            name: 'Kabooli Channa Salad',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610f147dd8eb26.webp',
          },
          {
            name: 'Makroni Salad',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610f16baf21a26.webp',
          },
          {
            name: 'Coleslaw',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610f1818949126.webp',
          },
          {
            name: 'Finger Salad',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610f1b5bd98726.webp',
          },
          {
            name: 'Stuffed Chicken',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610f204b12f326.webp',
          },
          {
            name: 'Stuffed Fish',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610f281b5e0926.webp',
          },
          {
            name: 'Stuffed Turkey',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610f29a230e626.webp',
          },
          {
            name: 'Pickles',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610f2f51a99126.webp',
          },
          {
            name: 'Uppilittath',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610f32d0ae4426.webp',
          },
        ],
      },
      {
        name: 'Soup',
        items: [
          {
            name: 'Sweet Corn Chicken Soup',
            unit: 'bowl',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610ed5130cbd26.webp',
          },
          {
            name: 'Hot & Sour Chicken Soup',
            unit: 'bowl',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610ed678177026.webp',
          },
          {
            name: 'Cream of Chicken',
            unit: 'bowl',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610ed7f1556626.webp',
          },
          {
            name: 'Chicken Noodles Soup',
            unit: 'bowl',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610ed96b5b8f26.webp',
          },
          {
            name: 'Chicken Clear Soup',
            unit: 'bowl',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610edb00156326.webp',
          },
          {
            name: 'Sweet Corn Soupn - VEG',
            unit: 'bowl',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610edda8082d26.webp',
          },
          {
            name: 'Hot & Sour  Soup - VEG',
            unit: 'bowl',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610ee28eb54a26.webp',
          },
          {
            name: 'Cream of Tomato - VEG',
            unit: 'bowl',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610ee50e05e626.webp',
          },
          {
            name: 'Veg Noodles Soup',
            unit: 'bowl',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610eebb2fd9a26.webp',
          },
          {
            name: 'Veg Clear Soup',
            unit: 'bowl',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610eee8c7f9c26.webp',
          },
        ],
      },
      {
        name: 'Breads',
        items: [
          {
            name: 'Romali Roti',
            unit: 'piece',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610e9173e5d226.webp',
          },
          {
            name: 'Kuttanadan Kallappam',
            unit: 'piece',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610e934a24e026.webp',
          },
          {
            name: 'Rice Pathiri',
            unit: 'piece',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610e95b9bf6a26.webp',
          },
          {
            name: 'Coin Parotta',
            unit: 'piece',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610e983da7d026.webp',
          },
          {
            name: 'Parotta',
            unit: 'piece',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610e9a0af2d726.webp',
          },
          {
            name: 'Idiyappam',
            unit: 'piece',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610e9b59c1a526.webp',
          },
          {
            name: 'Nan',
            unit: 'piece',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610e9cc754d526.webp',
          },
          {
            name: 'Appam',
            unit: 'piece',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610e9f976fc326.webp',
          },
          {
            name: 'Battoora',
            unit: 'piece',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610eaa3aca1526.webp',
          },
          {
            name: 'Butter Nan',
            unit: 'piece',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610eade2375826.webp',
          },
          {
            name: 'Stuffed Parotta',
            unit: 'piece',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610ebf281fcd26.webp',
          },
          {
            name: 'Bread Roll',
            unit: 'piece',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610ec26641e426.webp',
          },
          {
            name: 'Chappathi',
            unit: 'piece',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610ec43e83b026.webp',
          },
          {
            name: 'Poori',
            unit: 'piece',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610ec7d83aa326.webp',
          },
          {
            name: 'Tandoor Roti',
            unit: 'piece',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610ec92c000326.webp',
          },
          {
            name: 'Bun Porotta',
            unit: 'piece',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661f94f48ac4f26.webp',
          },
          {
            name: 'Thenga Pathal',
            unit: 'piece',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661f95277388f26.webp',
          },
          {
            name: 'Veeshappam',
            unit: 'piece',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661f95abbc04c26.webp',
          },
          {
            name: 'Rumali Rotti',
            unit: 'piece',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661f95cb1f56226.webp',
          },
          {
            name: 'Nice Pathiri',
            unit: 'piece',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661f95f838cbd26.webp',
          },
        ],
      },
      {
        name: 'Rice Varieties',
        items: [
          {
            name: 'Veg Fried Rice',
            unit: 'kg',
            basePrice: 1,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610f43b0ce6226.webp',
          },
          {
            name: 'Chicken Fried Rice',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610f4750996726.webp',
          },
          {
            name: 'Egg Fried Rice',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610f48f47c2026.webp',
          },
          {
            name: 'Mixed Fried Rice',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610f4ba95daa26.webp',
          },
          {
            name: 'Sea Food Fried Rice',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610f4f4886d026.webp',
          },
          {
            name: 'Veg Pulav',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610f508ad19426.webp',
          },
          {
            name: 'Peas Pulav',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610f59d9345c26.webp',
          },
          {
            name: 'Kashmiri Pulav',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610f5b3316fc26.webp',
          },
          {
            name: 'Safron Pulav',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610f60f10f7d26.webp',
          },
          {
            name: 'Jeera Pulav',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610f63c6ab9226.webp',
          },
          {
            name: 'Tomato Rice',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610f650af13f26.webp',
          },
          {
            name: 'Curd Rice',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610f6649718726.webp',
          },
          {
            name: 'Lemon Rice',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610f674de06326.webp',
          },
          {
            name: 'Ghee Rice',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610f688bce8426.webp',
          },
          {
            name: 'Jeera Rice',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610f6ba803b526.webp',
          },
          {
            name: 'Aloo Rice',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610f6e282bdc26.webp',
          },
          {
            name: 'Mint Coriander Rice',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610f79bac82d26.webp',
          },
        ],
      },
      {
        name: 'Desserts',
        items: [
          {
            name: 'Ice Cream (Varieties)',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6612d60643eff26.webp',
          },
          {
            name: 'Carrot Halwa',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6612d64ae6cce26.webp',
          },
          {
            name: 'Gulab Jamoon',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6612d6a57b04e26.webp',
          },
          {
            name: 'Hot Jelebi',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6612d726db5ae26.webp',
          },
          {
            name: 'Fruit Salad',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6612d800ab64126.webp',
          },
          {
            name: 'Browney Cake',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6612d8462bd5126.webp',
          },
          {
            name: 'Black Forest Pastry',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6612d890d186126.webp',
          },
          {
            name: 'White Forest Pastry',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6612d8ab1caa226.webp',
          },
          {
            name: 'Braed Pudding',
            unit: 'plate',
            basePrice: 1,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6612dae7267e826.webp',
          },
          {
            name: 'Tender Coconut Pudding',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6612d8feda4a626.webp',
          },
          {
            name: 'Carmel Custard Pudding',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6612d91a33f8926.webp',
          },
          {
            name: 'Triffle Pudding',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6612d9c0925f526.webp',
          },
          {
            name: 'Butter-Pineapple Pudding',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6612da037de5a26.webp',
          },
          {
            name: 'Biscuit Pudding',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6612da4adda2426.webp',
          },
          {
            name: 'Payasam (Vaties)',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6612db5d6df6a26.webp',
          },
          {
            name: 'Hot Jilebi',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661df83f1546726.webp',
          },
          {
            name: 'Gulab Jamun',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661df863b417d26.webp',
          },
          {
            name: 'Carrot Halwa',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661df886b020f26.webp',
          },
          {
            name: 'Puddings',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661df8d3e7c3726.webp',
          },
          {
            name: 'Brownies',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661df8fd47ac826.webp',
          },
          {
            name: 'Brownies Chocolates',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661df93fbf47926.webp',
          },
          {
            name: 'Fruit Salad',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661df95d7f30426.webp',
          },
        ],
      },
      {
        name: 'Hot Beverages',
        items: [
          {
            name: 'Milk Tea',
            unit: 'cup',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e68f19e75b26.webp',
          },
          {
            name: 'Coffee',
            unit: 'cup',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e69797f69f26.webp',
          },
          {
            name: 'Boost',
            unit: 'cup',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e698f25ca726.webp',
          },
          {
            name: 'Horlicks',
            unit: 'cup',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e69a54d69326.webp',
          },
          {
            name: 'Nascafe',
            unit: 'cup',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e69b930a0226.webp',
          },
          {
            name: 'Masala Tea',
            unit: 'cup',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e69cb5d66726.webp',
          },
        ],
      },
    ],
  },
  {
    name: 'Sadya',
    children: [
      {
        name: 'Sadya',
        items: [
          {
            name: 'GHEE',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661d188440eca26.webp',
          },
          {
            name: 'SALT',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661d18965aa4f26.webp',
          },
          {
            name: 'VARUTHA UPPERI',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661d18bac705d26.webp',
          },
          {
            name: 'SHARKKARA UPPERI',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661d18d4c6fe826.webp',
          },
          {
            name: 'NARANGA ACHAR',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661d18f332b0626.webp',
          },
          {
            name: 'MANGA ACHAR',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661d190c9540926.webp',
          },
          {
            name: 'INCHI CURRY',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661d1925b8e7426.webp',
          },
          {
            name: 'AVIYAL',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661d1938374e026.webp',
          },
          {
            name: 'BEANS PORIYAL',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661d19681404026.webp',
          },
          {
            name: 'KICHADI',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661d199279c7a26.webp',
          },
          {
            name: 'PAVAKKA KICHADI',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661d19bb55be226.webp',
          },
          {
            name: 'BEETROOT PACHADI',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661d19dfb37fc26.webp',
          },
          {
            name: 'PINEAPPLE PACHADI',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661d1a00c940b26.webp',
          },
          {
            name: 'KOOTTU CURRY',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661d1a21de59d26.webp',
          },
          {
            name: 'OLAN',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661d1a348b80526.webp',
          },
          {
            name: 'KALAN',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661d1a51c916d26.webp',
          },
          {
            name: 'MEZHUKKUPURATTI',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661d1a8cc00c726.webp',
          },
          {
            name: 'MADHURA CURRY',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661d1aa50e6ff26.webp',
          },
          {
            name: 'THEEYAL',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661d1abf3c0a626.webp',
          },
          {
            name: 'THENGA CHAMMANDHI',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661d1ad3af13c26.webp',
          },
          {
            name: 'ERISSERI',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661d1b13aaa9226.webp',
          },
          {
            name: 'PULISSERI',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661d1b47aa0b026.webp',
          },
          {
            name: 'CHORU',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661d1b6b0228026.webp',
          },
          {
            name: 'KUTHARI CHORU',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661d1b8518f7226.webp',
          },
          {
            name: 'PARIPPU',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661d1baf01b1326.webp',
          },
          {
            name: 'SAMBAR',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661d1bc8a62a526.webp',
          },
          {
            name: 'RASAM',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661d1bdd2748426.webp',
          },
          {
            name: 'MORU KACHIYATH',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661d1bf98362e26.webp',
          },
          {
            name: 'MORU',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661d1c101eb5c26.webp',
          },
          {
            name: 'PAPPADAM',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661d1c4c2eb1426.webp',
          },
          {
            name: 'PAZHAM',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661d1c630bf8126.webp',
          },
          {
            name: 'BOLI',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661d1c7daf46826.webp',
          },
          {
            name: 'ADA PRADHAMAN',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661d1ca3a8f2a26.webp',
          },
          {
            name: 'PALADA PAYASAM',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661d1cca7a2b226.webp',
          },
          {
            name: 'SEMIYA PAYASAM',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661d1cee4741e26.webp',
          },
          {
            name: 'KADALA PAYASAM',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661d1d08c12c426.webp',
          },
          {
            name: 'CHERUPAYAR  PAYASAM',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661d1d258bf9126.webp',
          },
          {
            name: 'PINE APPLE PAYASAM',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661d1d47e2cff26.webp',
          },
          {
            name: 'NURUKK PACHARI PAYASAM',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661d1d98b336e26.webp',
          },
        ],
      },
      {
        name: 'Malabar Snacks',
        items: [
          {
            name: 'Pazham Nirachath',
            unit: 'piece',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e570da197a26.webp',
          },
          {
            name: 'Unnakkai',
            unit: 'piece',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e57267c3fa26.webp',
          },
          {
            name: 'Kai pola',
            unit: 'piece',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e574fec2fb26.webp',
          },
          {
            name: 'Chattipathiri',
            unit: 'piece',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e577569bb726.webp',
          },
          {
            name: 'Kalthappam',
            unit: 'piece',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e57990705826.webp',
          },
          {
            name: 'Elanchi',
            unit: 'piece',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e57d31125e26.webp',
          },
          {
            name: 'Irachi pathiri',
            unit: 'piece',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e58027ea5726.webp',
          },
          {
            name: 'Kilikkood',
            unit: 'piece',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e58208d5f826.webp',
          },
          {
            name: 'Poovada',
            unit: 'piece',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e584a79a1c26.webp',
          },
          {
            name: 'Kozhi Ada',
            unit: 'piece',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e5871852d326.webp',
          },
          {
            name: 'Kai Veeshappam',
            unit: 'piece',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e589bcc91f26.webp',
          },
          {
            name: 'Meenada',
            unit: 'piece',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e58b61217826.webp',
          },
          {
            name: 'Omana Pathiri',
            unit: 'piece',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e58d0eb5c326.webp',
          },
          {
            name: 'Thenga Muri',
            unit: 'piece',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e590092b2b26.webp',
          },
          {
            name: 'Onion Pakoda',
            unit: 'piece',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e592618cfd26.webp',
          },
          {
            name: 'Muttamala',
            unit: 'piece',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e594554e7026.webp',
          },
          {
            name: 'Neyyappam',
            unit: 'piece',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e59736265326.webp',
          },
          {
            name: 'Unniyappam',
            unit: 'piece',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e598de96a326.webp',
          },
          {
            name: 'Pazhampori',
            unit: 'piece',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e59b1c627226.webp',
          },
        ],
      },
      {
        name: 'Dum Biriyani',
        items: [
          {
            name: 'Mutton Dum Biriyani',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_66118cf97729926.webp',
          },
          {
            name: 'Chicken Dum Biriyani',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_66118d207707326.webp',
          },
          {
            name: 'Beef Dum Biriyani',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_66118d3a5ee5826.webp',
          },
          {
            name: 'Fish Biriyani',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_66118d4f812a726.webp',
          },
          {
            name: 'Prawns Biriyani',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_66118d6cba98b26.webp',
          },
          {
            name: 'Veg Biriyani',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_66118d873689226.webp',
          },
          {
            name: 'Thalasseri Dum Biriyani',
            unit: 'kg',
            basePrice: 1,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e3d1d8cff026.webp',
          },
          {
            name: 'Thalappakatti Biriyani',
            unit: 'kg',
            basePrice: 1,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e3d7df3d9c26.webp',
          },
          {
            name: 'Amboor Biriyani',
            unit: 'kg',
            basePrice: 1,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e3db970d8126.webp',
          },
          {
            name: 'Kappa biriyani',
            unit: 'kg',
            basePrice: 1,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e3df13a5cd26.webp',
          },
          {
            name: 'Hyderabadi Biryani',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661fcb36997c226.webp',
          },
        ],
      },
      {
        name: 'Mandhi',
        items: [
          {
            name: 'Chicken Mandhi',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e700e61d2926.webp',
          },
          {
            name: 'Mutton Mandhi',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e7026066b326.webp',
          },
          {
            name: 'Beef Mandhi',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e7041541af26.webp',
          },
          {
            name: 'Alfahm Mandhi',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e707a0969a26.webp',
          },
          {
            name: 'Fish Mandhi',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e70ab8bf2d26.webp',
          },
        ],
      },
      {
        name: 'Mutton Dishes',
        items: [
          {
            name: 'Mutton Stew',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610f834c110626.webp',
          },
          {
            name: 'Mutton Curry',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610f84c6c14d26.webp',
          },
          {
            name: 'Mutton Khorma',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610f85e270e826.webp',
          },
          {
            name: 'Mutton Masala',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610f8794fdc926.webp',
          },
          {
            name: 'Mutton Rogan-Josh',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610f88d4baf526.webp',
          },
          {
            name: 'Mutton Mappaz',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610f8a1936ce26.webp',
          },
          {
            name: 'Mutton Coconut Fry',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610f8d99053926.webp',
          },
          {
            name: 'Mutton Kolapuri',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610f93a3ac3826.webp',
          },
          {
            name: 'Mutton Varattiyathu',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610f972a719826.webp',
          },
          {
            name: 'Mutton Thala Curry',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610f9ab7ff5726.webp',
          },
          {
            name: 'Mutton Liver Ularthiathu',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610fae03e04626.webp',
          },
          {
            name: 'Mutton Liver Fry',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610faf1dbb4226.webp',
          },
          {
            name: 'Godfather Spl. Grilled  Full Lamb',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661f949310ac026.webp',
          },
          {
            name: 'Mutton rohan roast',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661f9b107a5a126.webp',
          },
          {
            name: 'Mutton shahi korma',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661f9b61d4f8126.webp',
          },
        ],
      },
      {
        name: 'Beef Dishes',
        items: [
          {
            name: 'Beef Fry',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661101d3f0b4526.webp',
          },
          {
            name: 'Beef Roast',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661101ec78bbe26.webp',
          },
          {
            name: 'Beef Khorma',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661101fe158a426.webp',
          },
          {
            name: 'Beef Stew',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_66110215570d126.webp',
          },
          {
            name: 'Beef Curry',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6611024a37cb626.webp',
          },
          {
            name: 'Beef Ularthu',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_66110262abafb26.webp',
          },
          {
            name: 'Beef Peppaer Fry',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661102829fd7b26.webp',
          },
          {
            name: 'Beef Peralan',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661102930b02426.webp',
          },
          {
            name: 'Chilly Beef',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661102c60951926.webp',
          },
          {
            name: 'Ginger Beef',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661102e7679d426.webp',
          },
          {
            name: 'Garlic Beef',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661103693706826.webp',
          },
          {
            name: 'Beef with Vegetables',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6611038dacb0726.webp',
          },
          {
            name: 'Beef Kaya Roast',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661dfeda6c5f526.webp',
          },
          {
            name: 'Beef Mappas',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661dfefbdaa6e26.webp',
          },
          {
            name: 'Beef Dry Fry',
            unit: 'kg',
            basePrice: 1,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661dff238981d26.webp',
          },
          {
            name: 'Mexican Beef',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661dff8fb1e4426.webp',
          },
          {
            name: 'Beef Poriyal',
            unit: 'kg',
            basePrice: 1,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661fccd810ae826.webp',
          },
        ],
      },
      {
        name: 'Chicken Dishes',
        items: [
          {
            name: 'Chicken Roast',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610fdfce971426.webp',
          },
          {
            name: 'Nadan Chicken Curry',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610fe122cfb926.webp',
          },
          {
            name: 'Butter Chicken',
            unit: 'kg',
            basePrice: 1,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610fedad4f3626.webp',
          },
          {
            name: 'Chicken Masala',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610fe83e8c0d26.webp',
          },
          {
            name: 'Ginger Chicken',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610fefe49a1326.webp',
          },
          {
            name: 'Pepper Chicken',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610ff15b4f7826.webp',
          },
          {
            name: 'Chicken Golden Fry',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610ff47c9e6126.webp',
          },
          {
            name: 'Chicken 65',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610ff5a1654926.webp',
          },
          {
            name: 'Kethel Style Chicken Fry',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610ff723f85526.webp',
          },
          {
            name: 'Kerala Chicken Roast',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610ffb0a0f3626.webp',
          },
          {
            name: 'Chicken Drum Stick',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6610ffeb000a626.webp',
          },
          {
            name: 'Chicken Do-Piazza',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661100172da4a26.webp',
          },
          {
            name: 'Chicken Chettinad',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6611003209fa326.webp',
          },
          {
            name: 'Chicken Chukka',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6611004d01d5526.webp',
          },
          {
            name: 'Chilly Chicken',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_66110067efa2326.webp',
          },
          {
            name: 'Chicken with Vegetables',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661100b78c4c626.webp',
          },
          {
            name: 'Sweet & Sour Chicken',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661100e73dbed26.webp',
          },
          {
            name: 'Hongkong Chicken',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661101175fda426.webp',
          },
          {
            name: 'Chicken Manjoorian',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6611012f638c226.webp',
          },
          {
            name: 'Nadan  varutharacha Curry',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e00066fafe26.webp',
          },
          {
            name: 'Chicken Vindhaloo',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e3c759cc3b26.webp',
          },
          {
            name: 'Chettinadu Chicken',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e3cba1d20426.webp',
          },
        ],
      },
      {
        name: 'Duck Dishes',
        items: [
          {
            name: 'Kuttanadan Duck Roast',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661107acd747526.webp',
          },
          {
            name: 'Duck Masala',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661107c42c19126.webp',
          },
          {
            name: 'Duck Mapaz',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661107d7dbe4726.webp',
          },
          {
            name: 'Duck Varutharacha Curry',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661107edc9c2926.webp',
          },
          {
            name: 'Duck Stew',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6611083369f8b26.webp',
          },
        ],
      },
      {
        name: 'Pork Dishes',
        items: [
          {
            name: 'Pork Masala',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661fa643ea2e526.webp',
          },
          {
            name: 'Pork Varattiyathu',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661fa676ab4ba26.webp',
          },
          {
            name: 'Pork Vindaloo',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661fa6b67c6e326.webp',
          },
          {
            name: 'Pork Roast',
            unit: 'kg',
            basePrice: 1,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661fa6f7b84b926.webp',
          },
          {
            name: 'Pork Peralan',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661fa71f5bf0526.webp',
          },
          {
            name: 'Pork Ularth',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661fa74dd98d726.webp',
          },
          {
            name: 'Pork Chops',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661fa7ce51b0826.webp',
          },
          {
            name: 'Pork Curry',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661fa83f7094226.webp',
          },
          {
            name: 'Pork green pepper masala',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661fa87fe79cd26.webp',
          },
          {
            name: 'Pork Dry Fry',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661fa8c09eb1026.webp',
          },
        ],
      },
      {
        name: 'Fish Dishes',
        items: [
          {
            name: 'Fish Vattichathu',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661104819e80526.webp',
          },
          {
            name: 'Fish Curry',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661104b49f5fd26.webp',
          },
          {
            name: 'Fish Moilee',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661104cdc757926.webp',
          },
          {
            name: 'Fish Pollichathu',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661104e3ddb0526.webp',
          },
          {
            name: 'Kozhuva Fry',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_66110542dc01e26.webp',
          },
          {
            name: 'Fish Fry',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661105559ba1b26.webp',
          },
          {
            name: 'Fish Tawa Fry',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6611056d12b7926.webp',
          },
          {
            name: 'Fish Masala',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6611058543b1226.webp',
          },
          {
            name: 'Schezwan Fish',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661105cb1b68b26.webp',
          },
          {
            name: 'Fish Mango Curry',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661105f4ef19226.webp',
          },
          {
            name: 'Chilly Fish',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6611065ee71c026.webp',
          },
          {
            name: 'Fish Manjoorian',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661106ad1a34626.webp',
          },
          {
            name: 'Garlic Fish',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661106c3ae08926.webp',
          },
          {
            name: 'Ginger Fish',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_66110701c186926.webp',
          },
          {
            name: 'Kottayam Fish Curry',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661dfdc409fac26.webp',
          },
          {
            name: 'Angamali mango fish curry',
            unit: 'kg',
            basePrice: 1,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661f9757c617d26.webp',
          },
          {
            name: 'Fish amritsary',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661f97a8a6e3026.webp',
          },
        ],
      },
      {
        name: 'Prawns Dishes',
        items: [
          {
            name: 'Prawns Masala',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661108d9b5b9226.webp',
          },
          {
            name: 'Prawns Roast',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6611091560cb626.webp',
          },
          {
            name: 'Tiger Prawns',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6611096bd55c526.webp',
          },
          {
            name: 'Chilly Prawns',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661109a83f09a26.webp',
          },
          {
            name: 'Prawns Manjoorian',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661109d02cd0826.webp',
          },
          {
            name: 'Prawn Tempura',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661dfcf681e0626.webp',
          },
          {
            name: 'Kataif Prawn',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661dfd4245fed26.webp',
          },
          {
            name: 'Golden Fried Prawns',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661dfd840bcca26.webp',
          },
        ],
      },
      {
        name: 'Veg Dishes',
        items: [
          {
            name: 'Veg Khorma',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661188dd1713426.webp',
          },
          {
            name: 'Veg Stew',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6611890ce5d1326.webp',
          },
          {
            name: 'Mixes Veg Curry',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661189237c84426.webp',
          },
          {
            name: 'Gobi Manjoorian',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661189461873026.webp',
          },
          {
            name: 'Aloo Gobi',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6611899ad26df26.webp',
          },
          {
            name: 'Dal Fry',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661189b75a1d426.webp',
          },
          {
            name: 'Navaratna Khorma',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661189d4f0bcd26.webp',
          },
          {
            name: 'Bhindi Masala',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_66118a20d5a0826.webp',
          },
          {
            name: 'Palak Paneer',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_66118a3c529e426.webp',
          },
          {
            name: 'Paneer Butter Masala',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_66118a4f3fd8126.webp',
          },
          {
            name: 'Chilly Paneer',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_66118a632d5b826.webp',
          },
          {
            name: 'Kadai Veg',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_66118a96cbd5326.webp',
          },
          {
            name: 'Mushroom Masala',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_66118aa9e008726.webp',
          },
          {
            name: 'Chilly Mushroom',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_66118ae704afc26.webp',
          },
          {
            name: 'Veg. Kholapuri',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661f9aaeed52a26.webp',
          },
        ],
      },
      {
        name: 'Arabian Dishes',
        items: [
          {
            name: 'Shawai',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e6c6982c8f26.webp',
          },
          {
            name: 'Mini Shawarma',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e6cf554e7726.webp',
          },
          {
            name: 'Alfahm',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e6d11a6f5826.webp',
          },
          {
            name: 'Barbeque',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e6d6219afd26.webp',
          },
          {
            name: 'Mutton raan',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e6df32acd726.webp',
          },
          {
            name: 'Sheek Kebab',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e6e0b87ec626.webp',
          },
          {
            name: 'Chicken Tikka',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e6e29d32c626.webp',
          },
          {
            name: 'Hariyali Tikka',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e6e63a9bc526.webp',
          },
          {
            name: 'Malai Tikka',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e6e7a88d3626.webp',
          },
          {
            name: 'Chicken Kebab',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e6eb1c068526.webp',
          },
          {
            name: 'Reshmi Kabab',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e6ec97b67926.webp',
          },
          {
            name: 'Fish Tikka',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e6ee9cc3bc26.webp',
          },
          {
            name: 'Ajwani Tikka',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e6f12de17526.webp',
          },
          {
            name: 'Octopus Grilled',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661fa9549acec26.webp',
          },
          {
            name: 'Oyster',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661fa9ab014a126.webp',
          },
          {
            name: 'Squid Grilled',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661faa1eb5c5f26.webp',
          },
          {
            name: 'Crab',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661faa64d0a3626.webp',
          },
          {
            name: 'Turkey Grilled',
            unit: 'kg',
            basePrice: 1,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661fcbc68fc4226.webp',
          },
          {
            name: 'Grilled Chicken',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661fcc4f80c0526.webp',
          },
        ],
      },
      {
        name: 'Tandoor Counter',
        items: [
          {
            name: 'Tandoor Lamb',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_66118deb8cb1926.webp',
          },
          {
            name: 'Chicken Tikka',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_66118e0096b4d26.webp',
          },
          {
            name: 'Hariyali Kabab',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_66118e1402e3a26.webp',
          },
          {
            name: 'Reshmi Kabab',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_66118e26a94cf26.webp',
          },
          {
            name: 'Paneer Tikka',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_66118e54adc6526.webp',
          },
          {
            name: 'Fish Tikka',
            unit: 'kg',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_66118e822a77926.webp',
          },
        ],
      },
      {
        name: 'Evening Snacks',
        items: [
          {
            name: 'Battoora & Chena Masala',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661f9fbee12d526.webp',
          },
          {
            name: 'Parotta',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661fa04f33f9826.webp',
          },
          {
            name: 'Chappathi',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661fa076f233126.webp',
          },
          {
            name: 'Beef Khorma',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661fa0a7a128726.webp',
          },
          {
            name: 'Kinnathappam',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661fa1533926226.webp',
          },
          {
            name: 'Banana Fry',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661fa199c786026.webp',
          },
          {
            name: 'Samoosa',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661fa23be7c6e26.webp',
          },
          {
            name: 'Unnakkaya',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661fa2551ec8526.webp',
          },
        ],
      },
      {
        name: 'Special Thattukada',
        items: [
          {
            name: 'Kappa',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6614bf1383c8826.webp',
          },
          {
            name: 'Fish Curry',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6614bf55c5a7826.webp',
          },
          {
            name: 'Puttu (Live)',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6614bf9de5f1e26.webp',
          },
          {
            name: 'Kadala Curry',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6614bfe02150926.webp',
          },
          {
            name: 'Chutney',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6614c0e838b2b26.webp',
          },
          {
            name: 'Variety Toffees and Wafers',
            unit: 'plate',
            basePrice: 1,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6614c154ea4e126.webp',
          },
          {
            name: 'Goli Soda',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6614c1ca0287526.webp',
          },
          {
            name: 'Pazhakkula',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6614c223e865426.webp',
          },
          {
            name: 'Variety Snacks',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6614c2770a4af26.webp',
          },
          {
            name: 'Tea (Live)',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6614c2ee6235926.webp',
          },
          {
            name: 'Paal Kappa',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661f988c0fbf626.webp',
          },
          {
            name: 'Sambar',
            unit: 'plate',
            basePrice: 1,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661f9ede30f6626.webp',
          },
          {
            name: 'Chutney',
            unit: 'plate',
            basePrice: 1,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661f9f83602b326.webp',
          },
          {
            name: 'Appam & Chicken Curry',
            unit: 'plate',
            basePrice: 1,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661f9fedb35ec26.webp',
          },
          {
            name: 'Pazhamporiyum Beefum',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661fcdadee6b626.webp',
          },
          {
            name: 'Puttum Kadalayum',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661fce018903e26.webp',
          },
        ],
      },
      {
        name: 'Sweets & Fruits',
        items: [
          {
            name: 'Variety Pedas',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_66118f593bd5026.webp',
          },
          {
            name: 'Burfees',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_66118f6a192bc26.webp',
          },
          {
            name: 'Variety Cookies',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_66118f92973e826.webp',
          },
          {
            name: 'Toffees',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_66118fc30fe8626.webp',
          },
          {
            name: 'FRUITS',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_6611900ff36aa26.webp',
          },
        ],
      },
      {
        name: 'Kids',
        items: [
          {
            name: 'Popcorn',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661dfb8b614fc26.webp',
          },
          {
            name: 'Chocolate fountain',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661dfbdf6be2626.webp',
          },
          {
            name: 'Fried Ice Cream',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661dfc40473e826.webp',
          },
          {
            name: 'Roller Ice cream',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661dfc8fc09b126.webp',
          },
          {
            name: 'Ice Gola',
            unit: 'plate',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661fcd47c9e4126.webp',
          },
        ],
      },
      {
        name: 'Herbal Tea',
        items: [
          {
            name: 'Black Tea',
            unit: 'cup',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e668ce484626.webp',
          },
          {
            name: 'Cardamom Tea',
            unit: 'cup',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e66ac9c88326.webp',
          },
          {
            name: 'Cinnamon Tea',
            unit: 'cup',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e66d7544d726.webp',
          },
          {
            name: 'Ginger Tea',
            unit: 'cup',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e66fc527ef26.webp',
          },
          {
            name: 'Blue Tea',
            unit: 'cup',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e67164886426.webp',
          },
          {
            name: 'Green Tea',
            unit: 'cup',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e67371b2c326.webp',
          },
          {
            name: 'Mint Tea',
            unit: 'cup',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e6750a77ed26.webp',
          },
          {
            name: 'Lemon Tea',
            unit: 'cup',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e67668389c26.webp',
          },
          {
            name: 'Jasmin Tea',
            unit: 'cup',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e677da9b0926.webp',
          },
          {
            name: 'Rose Tea',
            unit: 'cup',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e67969423926.webp',
          },
          {
            name: 'Tulsi Tea',
            unit: 'cup',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e67b3453cd26.webp',
          },
          {
            name: 'Masala Tea',
            unit: 'cup',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e67d38d44526.webp',
          },
          {
            name: 'Hibiscus Tea',
            unit: 'cup',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e68197c3c726.webp',
          },
          {
            name: 'Honey Pepper Tea',
            unit: 'cup',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e6832bfe7526.webp',
          },
          {
            name: 'Rosemary Tea',
            unit: 'cup',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e685ba929726.webp',
          },
          {
            name: 'Sulaimani',
            unit: 'cup',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e68729fa9926.webp',
          },
          {
            name: 'Iranian Tea',
            unit: 'cup',
            basePrice: 0,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e689a065b826.webp',
          },
        ],
      },
      {
        name: 'Dosa Varieties',
        items: [
          {
            name: 'Dosa',
            unit: 'piece',
            basePrice: 1,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661f9d7c0925426.webp',
          },
          {
            name: 'Masala Dosa',
            unit: 'piece',
            basePrice: 1,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661f9d988aa5626.webp',
          },
          {
            name: 'Ghee Roast',
            unit: 'piece',
            basePrice: 1,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661f9db24cd0726.webp',
          },
          {
            name: 'Egg Dosa',
            unit: 'piece',
            basePrice: 1,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661f9dd2b3a3426.webp',
          },
          {
            name: 'Carrot Dosa',
            unit: 'piece',
            basePrice: 1,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661f9de9c46ee26.webp',
          },
          {
            name: 'Thattu Dosa',
            unit: 'piece',
            basePrice: 1,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661f9e19344eb26.webp',
          },
          {
            name: 'Chicken Dosa',
            unit: 'piece',
            basePrice: 1,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661f9e633de1c26.webp',
          },
          {
            name: 'Tomato Dosa',
            unit: 'piece',
            basePrice: 1,
            imageUrl: 'https://cdn.eypas.com/uploads/400x400_661f9e8dbc28126.webp',
          },
        ],
      },
    ],
  },


  {
    name: 'Stage Decoration',
    children: [
      {
        name: 'Traditional Stage',
        items: [
          { name: 'Floral Backdrop', unit: 'set', basePrice: 15000 },
          { name: 'Nilavilakku Arrangement', unit: 'set', basePrice: 4500 },
          { name: 'Banana Stem Decor', unit: 'set', basePrice: 3000 },
        ],
      },
      {
        name: 'Premium Stage',
        items: [
          { name: 'LED Wall Stage', unit: 'set', basePrice: 45000 },
          { name: 'Crystal Theme Stage', unit: 'set', basePrice: 55000 },
          { name: 'Royal Wedding Stage', unit: 'set', basePrice: 75000 },
        ],
      },
      {
        name: 'Lighting',
        items: [
          { name: 'Ambient Lighting', unit: 'set', basePrice: 12000 },
          { name: 'Spot Lighting', unit: 'set', basePrice: 8000 },
          { name: 'Fairy Light Decor', unit: 'set', basePrice: 6000 },
        ],
      },
    ],
  },
  {
    name: 'Seating & Furniture',
    children: [
      {
        name: 'Guest Seating',
        items: [
          { name: 'Premium Chair', unit: 'piece', basePrice: 120 },
          { name: 'Plastic Chair', unit: 'piece', basePrice: 35 },
          { name: 'Sofa Set 3+1+1', unit: 'set', basePrice: 3000 },
        ],
      },
      {
        name: 'Dining Setup',
        items: [
          { name: 'Round Dining Table', unit: 'piece', basePrice: 450 },
          { name: 'Buffet Counter Table', unit: 'piece', basePrice: 650 },
          { name: 'Table Cloth Premium', unit: 'piece', basePrice: 70 },
        ],
      },
    ],
  },
  {
    name: 'Audio & Visual',
    children: [
      {
        name: 'Audio',
        items: [
          { name: 'PA System', unit: 'set', basePrice: 8000 },
          { name: 'Cordless Microphone', unit: 'piece', basePrice: 1200 },
          { name: 'DJ Console', unit: 'set', basePrice: 15000 },
        ],
      },
      {
        name: 'Visual',
        items: [
          { name: 'Projector Setup', unit: 'set', basePrice: 6500 },
          { name: 'LED Screen', unit: 'sqft', basePrice: 180 },
          { name: 'Live Streaming Setup', unit: 'set', basePrice: 25000 },
        ],
      },
    ],
  },
  {
    name: 'Hospitality & Service',
    children: [
      {
        name: 'Service Staff',
        items: [
          { name: 'Captain', unit: 'person', basePrice: 1400 },
          { name: 'Server', unit: 'person', basePrice: 900 },
          { name: 'Cleaning Staff', unit: 'person', basePrice: 700 },
        ],
      },
      {
        name: 'Guest Assistance',
        items: [
          { name: 'Welcome Team', unit: 'person', basePrice: 1200 },
          { name: 'Valet Parking', unit: 'person', basePrice: 1000 },
          { name: 'Help Desk Staff', unit: 'person', basePrice: 850 },
        ],
      },
    ],
  },
  {
    name: 'Photography & Media',
    children: [
      {
        name: 'Photography',
        items: [
          { name: 'Event Photography Basic', unit: 'day', basePrice: 18000 },
          { name: 'Event Photography Premium', unit: 'day', basePrice: 32000 },
          { name: 'Drone Photography', unit: 'day', basePrice: 12000 },
        ],
      },
      {
        name: 'Videography',
        items: [
          { name: 'Cinematic Video', unit: 'day', basePrice: 45000 },
          { name: 'Live Coverage', unit: 'day', basePrice: 22000 },
          { name: 'Highlight Reel', unit: 'project', basePrice: 15000 },
        ],
      },
    ],
  },
];

async function main() {
  const passwordHash = await bcrypt.hash('Admin@123', 12);

  await prisma.user.upsert({
    where: { email: 'admin@thankamevents.in' },
    update: {
      name: 'Super Admin',
      role: Role.ADMIN,
      passwordHash,
      phone: '9999999999',
      isActive: true,
    },
    create: {
      name: 'Super Admin',
      email: 'admin@thankamevents.in',
      role: Role.ADMIN,
      passwordHash,
      phone: '9999999999',
    },
  });

  const templates = [
    [TemplateStyle.MODERN_MINIMAL, 'Modern Minimal'],
    [TemplateStyle.PREMIUM_GOLD, 'Premium Gold'],
    [TemplateStyle.TRADITIONAL_KERALA, 'Traditional Kerala Style'],
    [TemplateStyle.ELEGANT_CORPORATE, 'Elegant Corporate'],
    [TemplateStyle.CLEAN_SIMPLE, 'Clean Simple'],
  ] as const;

  for (const [style, name] of templates) {
    await prisma.quotationTemplate.upsert({
      where: { style },
      update: { name },
      create: { style, name },
    });
  }

  await prisma.setting.upsert({
    where: { key: 'company' },
    update: {},
    create: {
      key: 'company',
      value: {
        name: 'Thankam Events Management',
        website: 'https://thankamevents.in',
        app: 'https://app.thankamevents.in',
        contact: '',
        gstNumber: '',
      },
    },
  });

  await seedCategoriesAndItems(categorySeeds);
  await normalizeFoodHierarchy();
}

async function seedCategoriesAndItems(
  seeds: CategorySeed[],
  parentId: string | null = null,
) {
  for (let index = 0; index < seeds.length; index += 1) {
    const seed = seeds[index];

    const existing = await prisma.category.findFirst({
      where: {
        parentId,
        name: seed.name,
      },
    });

    const category = existing
      ? await prisma.category.update({
          where: { id: existing.id },
          data: {
            description: seed.description,
            sortOrder: index,
          },
        })
      : await prisma.category.create({
          data: {
            name: seed.name,
            description: seed.description,
            parentId,
            sortOrder: index,
          },
        });

    if (seed.children && seed.children.length > 0) {
      await seedCategoriesAndItems(seed.children, category.id);
      continue;
    }

    if (!seed.items || seed.items.length === 0) {
      continue;
    }

    for (const item of seed.items) {
      await prisma.item.upsert({
        where: {
          categoryId_name: {
            categoryId: category.id,
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
          categoryId: category.id,
          name: item.name,
          description: item.description,
          unit: item.unit,
          basePrice: item.basePrice,
          imageUrl: item.imageUrl,
          isActive: true,
        },
      });
    }
  }
}

async function normalizeFoodHierarchy() {
  const food = await prisma.category.findFirst({
    where: { name: 'Food', parentId: null },
    select: { id: true },
  });

  if (!food) return;

  const topCatering = await prisma.category.findFirst({
    where: { name: 'Catering', parentId: null },
    select: { id: true },
  });
  const topGeneral = await prisma.category.findFirst({
    where: { name: { in: ['General', 'GENERAL'] }, parentId: null },
    select: { id: true },
  });
  const childCatering = await prisma.category.findFirst({
    where: { name: 'Catering', parentId: food.id },
    select: { id: true },
  });
  const childGeneral = await prisma.category.findFirst({
    where: { name: { in: ['General', 'GENERAL'] }, parentId: food.id },
    select: { id: true },
  });

  const generalSource = topCatering ?? topGeneral ?? childCatering ?? childGeneral;

  if (childGeneral && generalSource && childGeneral.id !== generalSource.id) {
    await deleteCategoryTree(childGeneral.id);
  }

  const general = generalSource
    ? await prisma.category.update({
        where: { id: generalSource.id },
        data: {
          name: 'GENERAL',
          parentId: food.id,
        },
      })
    : await prisma.category.create({
        data: {
          name: 'GENERAL',
          parentId: food.id,
          sortOrder: 0,
        },
      });

  const topSadya = await prisma.category.findFirst({
    where: { name: { in: ['Sadya', 'SADYA'] }, parentId: null },
    select: { id: true },
  });
  const topSadhya = await prisma.category.findFirst({
    where: { name: { in: ['Sadhya', 'SADYA'] }, parentId: null },
    select: { id: true },
  });
  const childSadya = await prisma.category.findFirst({
    where: { name: { in: ['Sadya', 'SADYA'] }, parentId: food.id },
    select: { id: true },
  });
  const childSadhya = await prisma.category.findFirst({
    where: { name: { in: ['Sadhya', 'SADYA'] }, parentId: food.id },
    select: { id: true },
  });

  const sadhyaSource = topSadya ?? topSadhya ?? childSadya ?? childSadhya;

  if (childSadhya && sadhyaSource && childSadhya.id !== sadhyaSource.id) {
    await deleteCategoryTree(childSadhya.id);
  }

  const sadhya = sadhyaSource
    ? await prisma.category.update({
        where: { id: sadhyaSource.id },
        data: {
          name: 'SADYA',
          parentId: food.id,
        },
      })
    : await prisma.category.create({
        data: {
          name: 'SADYA',
          parentId: food.id,
          sortOrder: 1,
        },
      });

  const desiredGeneralSubcategories = [
    'Welcome Drinks',
    'Mocktails',
    'Malabar Snacks',
    'Starters',
    'Salads',
    'Soup',
    'Breads',
    'Rice Varieties',
    'Dum Biriyani',
    'Mandhi',
    'Mutton Dishes',
    'Beef Dishes',
    'Chicken Dishes',
    'Duck Dishes',
    'Pork Dishes',
    'Fish Dishes',
    'Prawns Dishes',
    'Veg Dishes',
    'Arabian Dishes',
    'Tandoor Counter',
    'Evening Snacks',
    'Special Thattukada',
    'Sweets & Fruits',
    'Desserts',
    'Kids',
    'Hot Beverages',
    'Herbal Tea',
    'Dosa Varieties',
  ] as const;

  for (let index = 0; index < desiredGeneralSubcategories.length; index += 1) {
    const desiredName = desiredGeneralSubcategories[index];
    const source = await prisma.category.findFirst({
      where: { name: desiredName },
      orderBy: { updatedAt: 'desc' },
      select: { id: true },
    });

    if (!source) {
      await prisma.category.create({
        data: {
          name: desiredName,
          parentId: general.id,
          sortOrder: index,
        },
      });
      continue;
    }

    const duplicateUnderGeneral = await prisma.category.findFirst({
      where: {
        parentId: general.id,
        name: desiredName,
        id: { not: source.id },
      },
      select: { id: true },
    });

    if (duplicateUnderGeneral) {
      await deleteCategoryTree(duplicateUnderGeneral.id);
    }

    await prisma.category.update({
      where: { id: source.id },
      data: {
        name: desiredName,
        parentId: general.id,
        sortOrder: index,
      },
    });
  }

  const sadhyaLeafSource = await prisma.category.findFirst({
    where: {
      name: { in: ['Sadya', 'SADYA'] },
      parentId: { not: null },
      id: { not: sadhya.id },
    },
    orderBy: { updatedAt: 'desc' },
    select: { id: true },
  });

  const sadhyaLeaf = sadhyaLeafSource
    ? await prisma.category.update({
        where: { id: sadhyaLeafSource.id },
        data: { name: 'SADYA', parentId: sadhya.id, sortOrder: 0 },
      })
    : await prisma.category.create({
        data: {
          name: 'SADYA',
          parentId: sadhya.id,
          sortOrder: 0,
        },
      });

  const sadhyaChildren = await prisma.category.findMany({
    where: { parentId: sadhya.id, id: { not: sadhyaLeaf.id } },
    select: { id: true, name: true },
  });

  for (const child of sadhyaChildren) {
    const existingUnderGeneral = await prisma.category.findFirst({
      where: { parentId: general.id, name: child.name },
      select: { id: true },
    });

    if (existingUnderGeneral) {
      await deleteCategoryTree(child.id);
    } else {
      await prisma.category.update({
        where: { id: child.id },
        data: { parentId: general.id },
      });
    }
  }

  const outsideFoodNames = [
    'Stage Decoration',
    'Seating & Furniture',
    'Audio & Visual',
    'Hospitality & Service',
    'Photography & Media',
  ];

  for (const name of outsideFoodNames) {
    const topLevel = await prisma.category.findFirst({
      where: { name, parentId: null },
      select: { id: true },
    });

    const underGeneral = await prisma.category.findFirst({
      where: { name, parentId: general.id },
      select: { id: true },
    });

    const underFood = await prisma.category.findFirst({
      where: { name, parentId: food.id },
      select: { id: true },
    });

    if (topLevel && underGeneral && topLevel.id !== underGeneral.id) {
      await deleteCategoryTree(underGeneral.id);
    } else if (!topLevel && underGeneral) {
      await prisma.category.update({
        where: { id: underGeneral.id },
        data: { parentId: null },
      });
    }

    if (topLevel && underFood && topLevel.id !== underFood.id) {
      await deleteCategoryTree(underFood.id);
    } else if (!topLevel && underFood) {
      await prisma.category.update({
        where: { id: underFood.id },
        data: { parentId: null },
      });
    }
  }

  const topLevelOthers = await prisma.category.findMany({
    where: {
      parentId: null,
      id: { not: food.id },
      name: { notIn: outsideFoodNames },
    },
    select: { id: true },
  });

  for (const category of topLevelOthers) {
    if (category.id !== general.id && category.id !== sadhya.id) {
      await prisma.category.update({
        where: { id: category.id },
        data: { parentId: general.id },
      });
    }
  }

  const foodChildren = await prisma.category.findMany({
    where: { parentId: food.id },
    select: { id: true, name: true },
  });

  for (const child of foodChildren) {
    if (child.id !== general.id && child.id !== sadhya.id) {
      if (outsideFoodNames.includes(child.name)) {
        await prisma.category.update({
          where: { id: child.id },
          data: { parentId: null },
        });
      } else {
        await prisma.category.update({
          where: { id: child.id },
          data: { parentId: general.id },
        });
      }
    }
  }

  const currentGeneralChildren = await prisma.category.findMany({
    where: { parentId: general.id },
    select: { id: true, name: true },
  });

  for (const child of currentGeneralChildren) {
    if (!desiredGeneralSubcategories.includes(child.name as (typeof desiredGeneralSubcategories)[number])) {
      await deleteCategoryTree(child.id);
    }
  }
}

async function deleteCategoryTree(categoryId: string) {
  const children = await prisma.category.findMany({
    where: { parentId: categoryId },
    select: { id: true },
  });

  for (const child of children) {
    await deleteCategoryTree(child.id);
  }

  const items = await prisma.item.findMany({
    where: { categoryId },
    select: { id: true },
  });

  if (items.length > 0) {
    const itemIds = items.map((item) => item.id);

    await prisma.menuItem.deleteMany({
      where: { itemId: { in: itemIds } },
    });

    await prisma.item.deleteMany({
      where: { id: { in: itemIds } },
    });
  }

  await prisma.category.delete({
    where: { id: categoryId },
  });
}

main()
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
