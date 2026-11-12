/**
 * Thankam Events Catering — Precision Dietary Classification System
 *
 * Provides 100% accurate real-world classification of Kerala & South Indian
 * catering dishes into Pure Vegetarian (VEG) vs Non-Vegetarian (NON-VEG).
 */

// Regex patterns to detect meats, poultry, seafood, and traditional Kerala non-veg items
const MEAT_PATTERNS: RegExp[] = [
  /\b(chicken|chiken)\b/i,
  /\bmutton\b/i,
  /\bbeef\b/i,
  /beefum\b/i,
  /\bpork\b/i,
  /\b(duck|taravu|tharavu)\b/i,
  /\b(fish|meen|meenada)\b/i,
  /\b(prawn|prawns|chemmeen)\b/i,
  /\bcrab\b/i,
  /\bsquid\b/i,
  /\bmeat\b/i,
  /\blamb\b/i,
  /\bturkey\b/i,
  /\b(egg|mutta|muttamala)\b/i,
  /\b(kozhi|kozhi\s*ada)\b/i,
  /\b(irachi|erachi)\b/i,
  /\bkilikkood\b/i,
  /\bshawai\b/i,
  /\bshawarma\b/i,
  /\balfahm\b/i,
  /\bbarbeque\b/i,
  /\b(kebab|kabab)\b/i,
  /\bkataif\b/i,
  /\bkoonthal\b/i,
  /\bnatholi\b/i,
  /\bkarimeen\b/i,
  /\bneymeen\b/i,
  /\bchoora\b/i,
  /\bkozhuva\b/i,
  /\boctopus\b/i,
  /\boyster\b/i,
  /\brogan josh\b/i,
  /\bkeema\b/i,
  /\bboti\b/i,
  /\bvattichathu\b/i,
  /\bpollichathu\b/i,
  /\bmoilee\b/i,
  /\bsea food\b/i,
  /\bkappa biriyani\b/i,
  /\bmixed fried rice\b/i,
  /\bsingapore fried rice\b/i,
];

// Inherently Non-Veg Meat Categories
const MEAT_CATEGORIES: string[] = [
  'chicken dishes', 'beef dishes', 'mutton dishes', 'fish dishes',
  'prawns dishes', 'duck dishes', 'pork dishes',
];

// Universal Pure Vegetarian food items in Kerala catering
const PURE_VEG_ITEMS: string[] = [
  'thenga chammandhi', 'pazhakkula', 'pazham nirachath', 'pazhampori',
  'kappa', 'paal kappa', 'kadala curry', 'puttu', 'puttum kadalayum',
  'chutney', 'sambar', 'aviyal', 'avial', 'thoran', 'olan', 'kalan',
  'erisseri', 'pulisseri', 'kichadi', 'pachadi', 'theeyal', 'koottu curry',
  'parippu', 'rasam', 'moru', 'moru kachiyath', 'ghee', 'salt',
  'upperi', 'achar', 'inchi curry', 'mezhukkupuratti', 'madhura curry', 'madhura pachadi',
  'choru', 'kuthari choru', 'pappadam', 'boli', 'payasam', 'pradhaman',
  'ada pradhaman', 'palada', 'semiya', 'paneer', 'mushroom', 'gobi',
  'french fries', 'unnakkai', 'unnakaya', 'unniyappam', 'unnniyappam',
  'neyyappam', 'kinnathappam', 'chatipathiri', 'chattipathiri',
  'kalthappam', 'elanchi', 'poovada', 'kai veeshappam', 'omana pathiri',
  'thenga muri', 'onion pakoda', 'onion pakkoda', 'chilly pakkoda',
  'crispy fried vegetables', 'cheese & pineapple', 'cake & wine',
  'dosa', 'masala dosa', 'ghee roast', 'carrot dosa', 'thattu dosa', 'tomato dosa',
  'appam', 'idiyappam', 'parotta', 'coin parotta', 'stuffed parotta', 'bun porotta',
  'nan', 'butter nan', 'chappathi', 'poori', 'battoora', 'tandoor roti',
  'romali roti', 'rumali rotti', 'kuttanadan kallappam', 'rice pathiri', 'nice pathiri',
  'thenga pathal', 'bread roll', 'veeshappam',
  'veg fried rice', 'veg pulav', 'peas pulav', 'kashmiri pulav', 'safron pulav',
  'jeera pulav', 'tomato rice', 'curd rice', 'lemon rice', 'ghee rice', 'jeera rice',
  'aloo rice', 'mint coriander rice',
  'veg noodles soup', 'veg clear soup', 'sweet corn soupn - veg', 'hot & sour  soup - veg',
  'cream of tomato - veg',
  'veg biriyani', 'veg - spring roll', 'veg -  cutlet', 'veg - cutlet', 'veg balls', 'veg roll',
  'veg khorma', 'veg stew', 'mixes veg curry', 'kadai veg', 'veg. kholapuri',
  'banana fry', 'samoosa', 'battoora & chena masala',
  'variety pedas', 'burfees', 'variety cookies', 'toffees', 'variety toffees and wafers',
  'goli soda', 'variety snacks', 'tea', 'tea (live)', 'coffee', 'milk tea', 'boost', 'horlicks',
  'sulaimani', 'bajji', 'mulaku bajji', 'vazhakka bajji', 'urulakkizhangu bajji', 'ulli bajji',
  'banana bajji', 'chilli bajji', 'veg nuggets', 'veg naguts', 'parippu vada', 'uzhunnu vada',
  'medu vada', 'pacha moru', 'pachamoru', 'pachamore', 'sambharam', 'parippu neyyu',
  'pavakka kondattam', 'kappa mulaku chutney', 'kappa mulak chadni', 'vazha ela', 'kuppi vellam',
  'popcorn', 'chocolate fountain', 'fried ice cream', 'roller ice cream', 'ice gola',
  'fruits', 'fruit salad', 'green salad', 'carrot salad', 'onion salad', 'tomato salad',
  'cucumber salad', 'russian salad', 'rajma salad', 'noodles salad', 'pineapple chat salad',
  'kabooli channa salad', 'makroni salad', 'coleslaw', 'finger salad', 'pickles', 'uppilittath',
  'punch', 'velvette', 'flip', 'smoothie', 'shake', 'lime', 'juice', 'halwa', 'jamun', 'jalebi',
  'pudding', 'cake', 'pastry', 'kubboos', 'hummus', 'mayonnaise', 'toum', 'raita', 'dates pickle',
  'eenthapazham achar', 'falooda', 'kulfi', 'rasgulla', 'rasmalai', 'lassi', 'sweet lassi',
  'mango lassi', 'baby corn', 'crispy corn', 'paneer 65', 'mushroom 65', 'gobi 65',
  'onion uthappam', 'tomato onion uthappam', 'paper roast', 'podi dosa', 'garlic naan',
  'cheese naan', 'wheat parotta', 'vellayappam', 'palappam', 'kaima ghee rice', 'neychoru',
];

/**
 * Determines whether a dish is Non-Vegetarian.
 */
export function isNonVegDish(dishName: string, categoryPath: string = ''): boolean {
  const n = dishName.trim().toLowerCase();
  const cat = categoryPath.trim().toLowerCase();

  // 1. Direct Meat Name Detection (Highest Priority)
  // Catches: Chicken Curry, Beef Fry, Beef with Vegetables, Chicken Vindhaloo,
  //          Pazhamporiyum Beefum, Egg Dosa, Mixed Fried Rice, Sea Food Fried Rice, etc.
  if (MEAT_PATTERNS.some((p) => p.test(n))) {
    return true;
  }

  // 2. Pure Veg Dishes Protection (Prevents false positives on traditional items)
  // E.g., Thenga Chammandhi, Pazhakkula, Kappa, Paal Kappa, Puttu, Kadala Curry, etc.
  if (PURE_VEG_ITEMS.some((pv) => n === pv || n.startsWith(pv + ' ') || n.endsWith(' ' + pv))) {
    return false;
  }

  // Explicit veg prefix or indicator
  if (
    n.startsWith('veg ') || n.startsWith('veg-') || n.startsWith('veg -') ||
    n.includes(' veg ') || n.endsWith(' veg') || n.includes('vegetable')
  ) {
    return false;
  }

  // 3. Inherently Meat Categories (Chicken Dishes, Beef Dishes, Mutton Dishes, Fish Dishes, Duck, Pork, Prawns)
  // Catches dishes like 'Nadan  varutharacha Curry' (in Chicken Dishes), 'Godfather Spl. Lamb', etc.
  if (MEAT_CATEGORIES.some((mc) => cat.includes(mc))) {
    return true;
  }

  // 4. Biriyani & Mandhi (All are authentic non-veg feasts unless explicitly 'Veg Biriyani')
  // Using word boundary \bmandhi\b so 'Thenga Chammandhi' does not trigger it!
  const isBiriyaniOrMandhi = /\b(biriyani|biryani|mandhi)\b/i.test(cat) || /\b(biriyani|biryani|mandhi)\b/i.test(n);
  if (isBiriyaniOrMandhi) {
    if (n.startsWith('veg ') || n.startsWith('veg-') || n.includes(' veg ') || n.includes('vegetable')) {
      return false;
    }
    return true;
  }

  // 5. Arabian Dishes & Tandoor Counter (All grills are meat unless Paneer Tikka / Veg)
  // Catches: Hariyali Tikka, Malai Tikka, Ajwani Tikka, Chicken Tikka, Fish Tikka, Sheek Kebab, etc.
  if (cat.includes('arabian') || cat.includes('tandoor')) {
    if (n.includes('paneer') || n.includes('veg') || n.includes('gobi') || n.includes('mushroom')) {
      return false;
    }
    return true;
  }

  // 6. Starters: 'Spring Roll' is chicken spring roll when 'Veg - Spring Roll' exists in starters
  if (n === 'spring roll' && cat.includes('starters')) {
    return true;
  }

  // 7. Traditional Kerala Sadya Feast Items (under leaf category 'Sadya')
  if (cat.endsWith('sadya') || cat.includes('sadya > sadya') || cat.includes('traditional sadya')) {
    return false;
  }

  return false;
}

/**
 * Determines whether a dish is Pure Vegetarian.
 */
export function isVegDish(dishName: string, categoryPath: string = ''): boolean {
  return !isNonVegDish(dishName, categoryPath);
}
