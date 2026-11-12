import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type ItemDef = {
  name: string;
  description: string;
  unit: string;
  basePrice?: number;
  imageUrl?: string;
};

const CATEGORY_ITEMS_MAP: Record<string, ItemDef[]> = {
  'Arabian Dishes': [
    {
      name: 'Shawarma',
      description: 'Authentic Middle Eastern spiced slow-roasted meat sliced from vertical rotisserie, wrapped in soft kubboos with garlic toum and pickled vegetables.',
      unit: 'piece',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e6cf554e7726.webp',
    },
    {
      name: 'Plate Shawarma',
      description: 'Carved slow-roasted juicy chicken shawarma meat served on a platter with warm kubboos, French fries, garlic sauce, and pickled turnips.',
      unit: 'plate',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e6cf554e7726.webp',
    },
    {
      name: 'Rumali Roll Shawarma',
      description: 'Tender spiced shawarma meat and crisp salad wrapped tightly in paper-thin fresh Rumali roti with signature garlic cream.',
      unit: 'piece',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e6cf554e7726.webp',
    },
    {
      name: 'Peri Peri Alfahm',
      description: 'Charcoal-grilled whole/half chicken infused with fiery African bird\'s eye peri-peri spices and fresh lemon marinade.',
      unit: 'piece',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e6d11a6f5826.webp',
    },
    {
      name: 'Kanthari Alfahm',
      description: 'Signature Kerala charcoal grilled chicken marinated with crushed raw bird\'s eye green chillies (Kanthari Mulaku), garlic, and shallots.',
      unit: 'piece',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e6d11a6f5826.webp',
    },
    {
      name: 'Honey Chilli Alfahm',
      description: 'Smoky charcoal-grilled chicken glazed with sweet natural bee honey, red chilli flakes, and crushed garlic.',
      unit: 'piece',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e6d11a6f5826.webp',
    },
    {
      name: 'Pepper Alfahm',
      description: 'Slow charcoal-grilled chicken coated with aromatic Wayanad crushed black pepper, shallots, and curry leaf marinade.',
      unit: 'piece',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e6d11a6f5826.webp',
    },
    {
      name: 'Kubboos',
      description: 'Traditional soft and pillowy Arabian pita flatbread, baked fresh as the staple accompaniment for Alfahm and Shawarma.',
      unit: 'piece',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e577569bb726.webp',
    },
    {
      name: 'Garlic Paste (Toum)',
      description: 'Silky, creamy Lebanese-style whipped garlic emulsion made with fresh garlic cloves, lemon juice, and pure oil.',
      unit: 'bowl',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_6614c0e838b2b26.webp',
    },
    {
      name: 'Hummus',
      description: 'Velvety smooth dip crafted from boiled chickpeas blended with pure tahini sesame paste, extra virgin olive oil, and lemon.',
      unit: 'bowl',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_6614c0e838b2b26.webp',
    },
  ],

  'Chicken Dishes': [
    {
      name: 'Nadan Chicken Fry',
      description: 'Crispy Kerala wedding-style bone-in chicken fry tossed with crunchy fried shallots, curry leaves, and green chillies.',
      unit: 'plate',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_6611867da344f26.webp',
    },
    {
      name: 'Chicken Perattiyathu',
      description: 'Succulent chicken pieces cooked in a thick, semi-dry gravy bursting with browned onions, black pepper, and fennel.',
      unit: 'plate',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_6611867da344f26.webp',
    },
    {
      name: 'Chicken Ularthiyathu',
      description: 'Traditional slow-roasted tender chicken cubes tossed in coconut oil with fresh roasted coconut slivers and Malabar spices.',
      unit: 'plate',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_6611867da344f26.webp',
    },
    {
      name: 'Kerala Chicken Stew',
      description: 'Mildly spiced, fragrant chicken curry simmered in fresh first-press coconut milk with potatoes, carrots, and whole spices.',
      unit: 'plate',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_6611867da344f26.webp',
    },
    {
      name: 'Chicken Korma',
      description: 'Rich and creamy chicken curry prepared with cashew paste, poppy seeds, and fragrant whole garam masala.',
      unit: 'plate',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_6611867da344f26.webp',
    },
    {
      name: 'Dragon Chicken',
      description: 'Crispy fried chicken strips tossed in a spicy, tangy Indo-Chinese sauce with cashews, bell peppers, and chilli paste.',
      unit: 'plate',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_6611867da344f26.webp',
    },
  ],

  'Beef Dishes': [
    {
      name: 'Beef Varattiyathu',
      description: 'Iconic Kerala wedding-style dark roasted beef chunks caramelized with shallots, crushed garlic, and crunchy coconut slivers.',
      unit: 'plate',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_66118ae704afc26.webp',
    },
    {
      name: 'Beef Chilly Roast',
      description: 'Spicy slow-cooked beef cubes sauteed with cracked black pepper, fresh green chillies, and curry leaves.',
      unit: 'plate',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_66118ae704afc26.webp',
    },
    {
      name: 'Beef Ribs Roast',
      description: 'Tender marinated beef ribs slow-braised and pan-roasted with rich Malabar roasted spice blend.',
      unit: 'plate',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_66118ae704afc26.webp',
    },
    {
      name: 'Nadan Beef Curry with Thengakothu',
      description: 'Home-style authentic Kerala beef gravy simmered with fried coconut pieces, coriander powder, and roasted shallots.',
      unit: 'plate',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_66118ae704afc26.webp',
    },
  ],

  'Mutton Dishes': [
    {
      name: 'Mutton Roast',
      description: 'Succulent tender mutton pieces slow-cooked to fork tenderness in an aromatic caramelized onion and tomato masala.',
      unit: 'plate',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_66118b7f83b2726.webp',
    },
    {
      name: 'Mutton Chops',
      description: 'Juicy mutton rib chops shallow fried in spicy peppercorn marinade and garnished with crispy curry leaves.',
      unit: 'plate',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_66118b7f83b2726.webp',
    },
    {
      name: 'Nadan Mutton Curry',
      description: 'Traditional Kerala banquet mutton curry cooked in coconut oil with roasted coriander, shallots, and green chillies.',
      unit: 'plate',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_66118b7f83b2726.webp',
    },
    {
      name: 'Mutton Pepper Fry',
      description: 'Tender pieces of mutton dry-fried with a heavy coating of crushed black pepper, garlic, and curry leaves.',
      unit: 'plate',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_66118b7f83b2726.webp',
    },
  ],

  'Fish Dishes': [
    {
      name: 'Karimeen Pollichathu',
      description: 'Fresh pearl spot fish marinated in shallots, ginger, and kokum masala, wrapped in banana leaf and slow-cooked on tawa.',
      unit: 'piece',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_6614bf55c5a7826.webp',
    },
    {
      name: 'Neymeen Fry (Seer Fish Fry)',
      description: 'Prime cut king seer fish steaks marinated in traditional red chilli turmeric marinade and shallow fried crisp.',
      unit: 'piece',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_6614bf55c5a7826.webp',
    },
    {
      name: 'Karimeen Fry',
      description: 'Whole pearl spot fish scored and seasoned with authentic spices, deep-fried golden in pure coconut oil.',
      unit: 'piece',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_6614bf55c5a7826.webp',
    },
    {
      name: 'Natholi Fry',
      description: 'Fresh small anchovy fish seasoned with crushed chillies and curry leaves, fried super crunchy.',
      unit: 'plate',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_6614bf55c5a7826.webp',
    },
    {
      name: 'Kallummakkaya Fry (Mussels Fry)',
      description: 'Fresh coastal sea mussels tossed in spicy shallot, black pepper, and fennel masala.',
      unit: 'plate',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_6614bf55c5a7826.webp',
    },
  ],

  'Prawns Dishes': [
    {
      name: 'Chemmeen Fry (Prawns Fry)',
      description: 'Crispy fried medium prawns coated with chilli, turmeric, lemon juice, and curry leaf paste.',
      unit: 'plate',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_66118b0933b9826.webp',
    },
    {
      name: 'Chemmeen Roast (Kerala Prawns Roast)',
      description: 'Juicy tiger prawns simmered and pan-roasted in a spicy onion, tomato, and coconut paste gravy.',
      unit: 'plate',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_66118b0933b9826.webp',
    },
    {
      name: 'Chemmeen Mango Curry',
      description: 'Prawns cooked with tangy slices of raw green mango in coconut milk gravy seasoned with mustard seeds.',
      unit: 'plate',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_66118b0933b9826.webp',
    },
  ],

  'Dum Biriyani': [
    {
      name: 'Malabar Chicken Dum Biriyani',
      description: 'Authentic Thalassery-style fragrant kaima rice chicken dum biriyani layered with fried onions, cashews, and raisins.',
      unit: 'plate',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e57a3e5c9f26.webp',
    },
    {
      name: 'Malabar Mutton Dum Biriyani',
      description: 'Tender mutton pieces dum-cooked with scented jeerakasala rice, aromatic saffron, and traditional spices.',
      unit: 'plate',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e57a3e5c9f26.webp',
    },
    {
      name: 'Kozhikodan Chicken Biriyani',
      description: 'Calicut wedding specialty dum biriyani prepared with tender chicken and layered short-grain kaima rice.',
      unit: 'plate',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e57a3e5c9f26.webp',
    },
    {
      name: 'Egg Biriyani',
      description: 'Hard-boiled farm eggs simmered in rich caramelized biriyani gravy, dum cooked with fragrant ghee rice.',
      unit: 'plate',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e57a3e5c9f26.webp',
    },
    {
      name: 'Biriyani Raita & Dates Pickle',
      description: 'Chilled curd onion salad paired with sweet, tangy authentic Kerala dates pickle (Eenthapazham Achar).',
      unit: 'plate',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_6614c0e838b2b26.webp',
    },
  ],

  'Mandhi': [
    {
      name: 'Peri Peri Mandhi',
      description: 'Fragrant Arabic long-grain mandi rice served with smoky grilled chicken coated in spicy peri-peri marinade.',
      unit: 'plate',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e57a3e5c9f26.webp',
    },
    {
      name: 'Kuzhimanthi (Kerala Style)',
      description: 'Pit-smoked tender whole chicken over spiced basmati rice infused with whole black cardamom and dried lemon.',
      unit: 'plate',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e57a3e5c9f26.webp',
    },
    {
      name: 'Mandhi Chutney & Salata Hara',
      description: 'Tangy Yemeni tomato, green chilli, and garlic salsa dip served as the essential condiment for Mandhi rice.',
      unit: 'bowl',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_6614c0e838b2b26.webp',
    },
  ],

  'Breads': [
    {
      name: 'Kerala Porotta (Malabar Parotta)',
      description: 'Flaky, layered, and golden ribbon parotta hand-rolled and cooked on hot tawa with fresh oil/ghee.',
      unit: 'piece',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661fa04f33f9826.webp',
    },
    {
      name: 'Wheat Parotta',
      description: 'Multi-layered flaky parotta made with healthy whole wheat flour, light and fluffy.',
      unit: 'piece',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661fa04f33f9826.webp',
    },
    {
      name: 'Palappam',
      description: 'Traditional fermented rice pancake with a soft spongy honeycomb center and crispy lacy edges.',
      unit: 'piece',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e57267c3fa26.webp',
    },
    {
      name: 'Vellayappam',
      description: 'Soft and thick steamed rice pancake fermented with coconut water and yeast, ideal for banquets.',
      unit: 'piece',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e57267c3fa26.webp',
    },
    {
      name: 'Garlic Naan',
      description: 'Tandoor-baked leavened flatbread brushed with pure melted butter, minced garlic, and fresh coriander.',
      unit: 'piece',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661fa076f233126.webp',
    },
    {
      name: 'Cheese Naan',
      description: 'Soft tandoori naan stuffed with melted mozzarella and processed cheese, finished with butter.',
      unit: 'piece',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661fa076f233126.webp',
    },
  ],

  'Veg Dishes': [
    {
      name: 'Kadala Curry',
      description: 'Traditional spicy black chickpeas curry prepared with roasted coconut paste and curry leaves.',
      unit: 'bowl',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_6614bfe02150926.webp',
    },
    {
      name: 'Paneer Tikka Masala',
      description: 'Charcoal-grilled cottage cheese cubes simmered in a creamy, velvety spiced tomato gravy.',
      unit: 'plate',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_66118ae704afc26.webp',
    },
    {
      name: 'Mushroom Pepper Fry',
      description: 'Fresh button mushrooms tossed on high heat with cracked black pepper, onions, and curry leaves.',
      unit: 'plate',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_66118ae704afc26.webp',
    },
    {
      name: 'Gobi 65',
      description: 'Crispy batter-fried cauliflower florets seasoned with ginger, garlic, red chillies, and lemon.',
      unit: 'plate',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661fa23be7c6e26.webp',
    },
    {
      name: 'Yellow Dal Tadka',
      description: 'Smooth yellow toor dal tempered with cumin seeds, garlic, dried red chillies, and pure ghee.',
      unit: 'bowl',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661d1baf01b1326.webp',
    },
  ],

  'Starters': [
    {
      name: 'Fish Finger',
      description: 'Crisp breadcrumb-crusted boneless fish fillets served golden brown with tartar sauce.',
      unit: 'piece',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_6614bf55c5a7826.webp',
    },
    {
      name: 'Chicken Popcorn',
      description: 'Bite-sized tender boneless chicken nuggets fried extra crunchy with southern spices.',
      unit: 'plate',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661fa23be7c6e26.webp',
    },
    {
      name: 'Crispy Corn',
      description: 'Sweet corn kernels coated in seasoned flour, deep-fried crisp, and tossed with bell peppers and chaat masala.',
      unit: 'plate',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661fa23be7c6e26.webp',
    },
    {
      name: 'Paneer 65',
      description: 'Spiced golden paneer cubes tossed with red chillies, curry leaves, and lemon zest.',
      unit: 'plate',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661fa23be7c6e26.webp',
    },
    {
      name: 'Veg Momos (Steamed / Fried)',
      description: 'Handmade Tibetan dumplings stuffed with seasoned finely minced garden vegetables, served with spicy red chutney.',
      unit: 'plate',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661fa23be7c6e26.webp',
    },
    {
      name: 'Chicken Momos (Steamed / Fried)',
      description: 'Juicy steamed/fried dumplings filled with spiced minced chicken, shallots, and ginger.',
      unit: 'plate',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661fa23be7c6e26.webp',
    },
  ],

  'Tandoor Counter': [
    {
      name: 'Tandoori Chicken (Full / Half)',
      description: 'Classic clay-oven roasted chicken marinated overnight in Kashmiri chilli, yogurt, and aromatic spices.',
      unit: 'piece',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e6d11a6f5826.webp',
    },
    {
      name: 'Tangdi Kebab (Drumstick)',
      description: 'Juicy chicken drumsticks marinated in rich cashew, cream, and tandoori spices, char-grilled to smoky perfection.',
      unit: 'piece',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e6d11a6f5826.webp',
    },
    {
      name: 'Mushroom Tikka',
      description: 'Plump button mushrooms skewered with onions and capsicum, roasted in tandoor with aromatic marinade.',
      unit: 'plate',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e6d11a6f5826.webp',
    },
  ],

  'Evening Snacks': [
    {
      name: 'Chicken Cutlet',
      description: 'Crispy breadcrumb-coated patties of spiced minced chicken, potatoes, and Malabar spices.',
      unit: 'piece',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661fa23be7c6e26.webp',
    },
    {
      name: 'Beef Cutlet',
      description: 'Traditional Kerala banquet cutlet made with seasoned minced beef, shallots, and crushed pepper.',
      unit: 'piece',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661fa23be7c6e26.webp',
    },
    {
      name: 'Egg Bonda (Mutta Bajji)',
      description: 'Hard-boiled egg coated in seasoned gram flour batter and fried golden crisp.',
      unit: 'piece',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661fa199c786026.webp',
    },
    {
      name: 'Chicken Samosa',
      description: 'Crispy triangular pastry stuffed with spicy minced chicken, onions, and green chillies.',
      unit: 'piece',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661fa23be7c6e26.webp',
    },
    {
      name: 'Chicken Puff',
      description: 'Flaky baked golden puff pastry filled with rich chicken masala stuffing.',
      unit: 'piece',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661fa23be7c6e26.webp',
    },
    {
      name: 'Veg Puff',
      description: 'Crispy multi-layered puff pastry packed with seasoned mixed vegetable masala.',
      unit: 'piece',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661fa23be7c6e26.webp',
    },
  ],

  'Special Thattukada': [
    {
      name: 'Thattu Dosa',
      description: 'Small, soft, and fluffy roadside stall dosa served with coconut chutney and spicy tomato chammanthi.',
      unit: 'piece',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661fcdadee6b626.webp',
    },
    {
      name: 'Mutta Roast (Egg Roast)',
      description: 'Hard-boiled eggs cooked in a thick spicy onion and tomato pepper roast gravy.',
      unit: 'plate',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661fcdadee6b626.webp',
    },
    {
      name: 'Beef Fry Thattukada Style',
      description: 'Sizzling roadside stall beef fry with crunchy coconut slivers, garlic, and curry leaves.',
      unit: 'plate',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661fcdadee6b626.webp',
    },
    {
      name: 'Chicken Fry Thattukada Style',
      description: 'Hot, spicy, and crunchy chicken pieces fried in seasoned coconut oil straight from the wok.',
      unit: 'plate',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661fcdadee6b626.webp',
    },
    {
      name: 'Double Egg Omelette',
      description: 'Fluffy pan-fried double egg omelette with chopped onions, green chillies, and cracked black pepper.',
      unit: 'piece',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661fcdadee6b626.webp',
    },
  ],

  'Dosa Varieties': [
    {
      name: 'Paper Roast',
      description: 'Extra thin, crisp, and gigantic golden dosa brushed with pure ghee, served folded.',
      unit: 'piece',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661d1c101eb5c26.webp',
    },
    {
      name: 'Onion Uthappam',
      description: 'Thick, fluffy savory pancake studded with caramelized onions, curry leaves, and green chillies.',
      unit: 'piece',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661d1c101eb5c26.webp',
    },
    {
      name: 'Podi Dosa',
      description: 'Crispy ghee roast sprinkled generously with spicy South Indian gun powder (milagai podi).',
      unit: 'piece',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661d1c101eb5c26.webp',
    },
    {
      name: 'Paneer Dosa',
      description: 'Golden dosa filled with spiced grated cottage cheese, onions, and bell peppers.',
      unit: 'piece',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661d1c101eb5c26.webp',
    },
    {
      name: 'Beef Dosa',
      description: 'Crisp dosa stuffed with spicy Kerala beef roast masala filling.',
      unit: 'piece',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661d1c101eb5c26.webp',
    },
  ],

  'Hot Beverages': [
    {
      name: 'Black Coffee (Kattan Kaapi)',
      description: 'Traditional Kerala black coffee brewed with fresh ground roasted beans and pure palm jaggery or sugar.',
      unit: 'cup',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e69797f69f26.webp',
    },
    {
      name: 'Black Tea (Kattan Chaaya)',
      description: 'Classic strong Kerala black tea brewed to perfection with fresh tea dust.',
      unit: 'cup',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e68f19e75b26.webp',
    },
    {
      name: 'Cardamom Tea (Elakka Chaaya)',
      description: 'Rich milk tea infused with freshly crushed green cardamom pods.',
      unit: 'cup',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e68f19e75b26.webp',
    },
    {
      name: 'Ginger Tea (Inchi Chaaya)',
      description: 'Hot stimulating milk tea infused with freshly crushed ginger root.',
      unit: 'cup',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e68f19e75b26.webp',
    },
    {
      name: 'Badam Milk (Hot)',
      description: 'Creamy warm milk flavored with real almond paste, saffron strands, and crushed pistachios.',
      unit: 'glass',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e69a54d69326.webp',
    },
  ],

  'Welcome Drinks': [
    {
      name: 'Virgin Mojito',
      description: 'Crisp and refreshing cooler muddled with fresh mint sprigs, lime wedges, sugar, and sparkling soda.',
      unit: 'glass',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_6614c1ca0287526.webp',
    },
    {
      name: 'Blue Curacao Mojito',
      description: 'Vibrant electric-blue cooler with citrus curaçao notes, muddled mint, and chilled fizz.',
      unit: 'glass',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_6614c1ca0287526.webp',
    },
    {
      name: 'Green Apple Mojito',
      description: 'Tart and sweet green apple cooler with crushed ice, fresh garden mint, and sparkling water.',
      unit: 'glass',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_6614c1ca0287526.webp',
    },
    {
      name: 'Watermelon Mint Cooler',
      description: 'Fresh pressed sweet watermelon juice combined with a dash of lime and crushed mint leaves.',
      unit: 'glass',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_6614c1ca0287526.webp',
    },
    {
      name: 'Mango Lassi',
      description: 'Thick and luscious Punjabi-style lassi blended with sweet alphonso mango pulp and fresh curd.',
      unit: 'glass',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_6614c1ca0287526.webp',
    },
    {
      name: 'Sweet Lassi',
      description: 'Creamy churned curd beverage flavored with rose water and topped with clotted malai cream.',
      unit: 'glass',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_6614c1ca0287526.webp',
    },
  ],

  'Desserts': [
    {
      name: 'Gulab Jamun with Ice Cream',
      description: 'Warm, soft milk-solid dumplings soaked in rose syrup, paired with a scoop of vanilla bean ice cream.',
      unit: 'plate',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661d1ca3a8f2a26.webp',
    },
    {
      name: 'Sizzling Brownie with Ice Cream',
      description: 'Warm fudge walnut brownie served on a smoking hot sizzler plate with vanilla ice cream and melted chocolate sauce.',
      unit: 'plate',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661d1ca3a8f2a26.webp',
    },
    {
      name: 'Matka Kulfi',
      description: 'Traditional slow-cooked condensed milk ice cream set in earthen clay pots and flavored with saffron and pistachios.',
      unit: 'piece',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661d1ca3a8f2a26.webp',
    },
    {
      name: 'Rasmalai',
      description: 'Delicate flattened cottage cheese discs soaked in chilled clotted milk infused with saffron and cardamom.',
      unit: 'bowl',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661d1ca3a8f2a26.webp',
    },
    {
      name: 'Royal Falooda',
      description: 'Grand dessert glass layered with rose syrup, vermicelli, sabja basil seeds, mixed jelly, rabri, nuts, and ice cream.',
      unit: 'glass',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661d1ca3a8f2a26.webp',
    },
  ],

  'Rice Varieties': [
    {
      name: 'Kaima Ghee Rice (Neychoru)',
      description: 'Fragrant short-grain kaima rice slow-cooked in pure desi ghee with whole spices, fried onions, and roasted cashews.',
      unit: 'plate',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e57a3e5c9f26.webp',
    },
    {
      name: 'Schezwan Chicken Fried Rice',
      description: 'Wok-tossed long-grain basmati rice with shredded chicken, eggs, and fiery house-made Schezwan red pepper sauce.',
      unit: 'plate',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e57a3e5c9f26.webp',
    },
    {
      name: 'Schezwan Veg Fried Rice',
      description: 'Wok-fried rice tossed with crisp diced vegetables, spring onions, and spicy Schezwan sauce.',
      unit: 'plate',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661e57a3e5c9f26.webp',
    },
  ],

  'Soup': [
    {
      name: 'Mutton Bone Soup (Aattukal Soup)',
      description: 'Rich, restorative, and peppery bone broth simmered for hours with tender mutton trotters and southern spices.',
      unit: 'bowl',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_66118b7f83b2726.webp',
    },
    {
      name: 'Chicken Manchow Soup',
      description: 'Spicy Indo-Chinese dark broth loaded with minced chicken, garlic, cilantro, and topped with crisp fried noodles.',
      unit: 'bowl',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_6611867da344f26.webp',
    },
    {
      name: 'Veg Manchow Soup',
      description: 'Hearty dark vegetable soup with chopped mushrooms, carrots, garlic, and crispy fried noodles.',
      unit: 'bowl',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_6611867da344f26.webp',
    },
  ],

  'Salads': [
    {
      name: 'Greek Salad',
      description: 'Crisp cucumbers, ripe tomatoes, red onions, kalamata olives, and creamy feta cheese dressed with oregano olive oil.',
      unit: 'plate',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_6614c0e838b2b26.webp',
    },
    {
      name: 'Caesar Salad',
      description: 'Fresh romaine lettuce leaves tossed in creamy garlic dressing with golden herb croutons and shaved parmesan.',
      unit: 'plate',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_6614c0e838b2b26.webp',
    },
    {
      name: 'Pasta Salad',
      description: 'Chilled spiral pasta with diced bell peppers, olives, sweet corn, and creamy Italian herb dressing.',
      unit: 'plate',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_6614c0e838b2b26.webp',
    },
  ],

  'Kids': [
    {
      name: 'Candy Floss (Cotton Candy Live)',
      description: 'Freshly spun fluffy pink and blue sugar cotton candy on sticks for young guests.',
      unit: 'piece',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_6614c1ca0287526.webp',
    },
    {
      name: 'Chocolate Fountain with Marshmallows',
      description: 'Cascading warm Belgian milk chocolate fountain served with soft marshmallows and fresh fruit skewers.',
      unit: 'plate',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_6614c1ca0287526.webp',
    },
    {
      name: 'Mini Burgers',
      description: 'Bite-sized soft slider buns with crisp vegetable or chicken patties, lettuce, cheese, and mayonnaise.',
      unit: 'piece',
      imageUrl: 'https://cdn.eypas.com/uploads/400x400_661fa23be7c6e26.webp',
    },
  ],
};

async function main() {
  console.log('--- Seeding essential missing catering & event items across categories ---');

  let totalAdded = 0;
  let totalUpdated = 0;

  for (const [categoryName, items] of Object.entries(CATEGORY_ITEMS_MAP)) {
    // Find category in DB
    const category = await prisma.category.findFirst({
      where: { name: categoryName },
    });

    if (!category) {
      console.warn(`[WARNING] Category "${categoryName}" not found in database. Skipping items.`);
      continue;
    }

    console.log(`\nProcessing Category: [${category.name}] (ID: ${category.id})`);

    for (const item of items) {
      const existing = await prisma.item.findUnique({
        where: {
          categoryId_name: {
            categoryId: category.id,
            name: item.name,
          },
        },
      });

      if (existing) {
        await prisma.item.update({
          where: { id: existing.id },
          data: {
            description: item.description,
            unit: item.unit,
            basePrice: item.basePrice ?? 0,
            imageUrl: item.imageUrl ?? existing.imageUrl,
            isActive: true,
          },
        });
        totalUpdated++;
        console.log(`  ↻ Updated: ${item.name} (${item.unit})`);
      } else {
        await prisma.item.create({
          data: {
            categoryId: category.id,
            name: item.name,
            description: item.description,
            unit: item.unit,
            basePrice: item.basePrice ?? 0,
            imageUrl: item.imageUrl,
            isActive: true,
          },
        });
        totalAdded++;
        console.log(`  + Created: ${item.name} (${item.unit})`);
      }
    }
  }

  console.log(`\nDone! Created: ${totalAdded} new items, Updated: ${totalUpdated} items.`);
}

main()
  .catch((e) => {
    console.error('Error seeding items:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
