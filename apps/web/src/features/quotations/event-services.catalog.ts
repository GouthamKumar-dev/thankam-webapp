export type ServiceDepartment =
  | 'DECOR'
  | 'LIGHTING'
  | 'RENTALS'
  | 'STAFF'
  | 'PRODUCTION'
  | 'LIVE_STALLS'
  | 'CEREMONIAL';

export type AtomicEventService = {
  id: string;
  department: ServiceDepartment;
  departmentLabel: string;
  name: string;
  description: string;
  defaultUnit: string;
  defaultPrice: number;
  popular?: boolean;
};

export const SERVICE_DEPARTMENTS: Record<
  ServiceDepartment,
  { label: string; icon: string; description: string }
> = {
  LIVE_STALLS: {
    label: 'Live Stalls & Counters',
    icon: '🍹',
    description: 'Tea shop, fresh juice counters, snack stalls, and live food counters',
  },
  CEREMONIAL: {
    label: 'Ceremonial & Rituals',
    icon: '🪔',
    description: 'Pooja essentials, sweekarana mala, nirapara, nilavilakku, manchal & olakkuda',
  },
  DECOR: {
    label: 'Stage & Decor',
    icon: '🌸',
    description: 'Stage, pathway, entrance arch, and photo frames',
  },
  LIGHTING: {
    label: 'Lights & Generator',
    icon: '💡',
    description: 'Edison canopy, focus lights, and silent generator with fuel',
  },
  RENTALS: {
    label: 'Buffet & Furniture',
    icon: '🪑',
    description: 'Buffet counters, chairs, covers, tables, and plates',
  },
  STAFF: {
    label: 'Service Staff',
    icon: '🤵',
    description: 'Serving boys, floor captain, chefs, and cleaning crew',
  },
  PRODUCTION: {
    label: 'Sound & Special FX',
    icon: '✨',
    description: 'Dry ice fog, cold pyros, sound system, and chenda melam',
  },
};

export const ATOMIC_EVENT_SERVICES: AtomicEventService[] = [
  /* ── 0. Live Stalls & Food Counters ── */
  {
    id: 'stall-tea-shop-live',
    department: 'LIVE_STALLS',
    departmentLabel: 'Live Stalls & Counters',
    name: 'Tea Shop Live (Chaya Thattukada)',
    description: 'Live Kerala tea stall with hot Tea, Filter Coffee, Sulaimani, Horlicks, and Boost',
    defaultUnit: 'setup',
    defaultPrice: 0,
    popular: true,
  },
  {
    id: 'stall-juice-counter-live',
    department: 'LIVE_STALLS',
    departmentLabel: 'Live Stalls & Counters',
    name: 'Juice Counter Live',
    description: 'Live fresh juices with Pineapple, Watermelon, Grape, Mojito, and Mint Lime',
    defaultUnit: 'person',
    defaultPrice: 30,
    popular: true,
  },
  {
    id: 'stall-snack-counter-live',
    department: 'LIVE_STALLS',
    departmentLabel: 'Live Stalls & Counters',
    name: 'Live Kerala Snack Counter',
    description: 'Hot Pazham Pori, 2 varieties of fresh Bajjis, Veg Nuggets, and Parippu Vada',
    defaultUnit: 'person',
    defaultPrice: 25,
    popular: true,
  },

  /* ── 0b. Ceremonial & Traditional Rituals ── */
  {
    id: 'ceremonial-pooja-essentials-suite',
    department: 'CEREMONIAL',
    departmentLabel: 'Ceremonial & Rituals',
    name: 'Pooja Essentials, Sweekarana Mala, Bouquets & Nilavilakku (Package)',
    description: 'Complete ceremonial bundle: Pooja sadhanangal kit, welcoming garlands (Sweekarana Mala), flower bouquets (bokke), nirapara with paddy, and bronze nilavilakku with oil & wicks',
    defaultUnit: 'setup',
    defaultPrice: 8000,
    popular: true,
  },
  {
    id: 'ceremonial-pooja-kit',
    department: 'CEREMONIAL',
    departmentLabel: 'Ceremonial & Rituals',
    name: 'Pooja Essentials Kit (Pooja Sadhanangal)',
    description: 'Brass pooja thali, camphor, fragrant incense wicks, sandalwood paste, betel leaves, areca nut, kumkum, thulasi, and pooja oil',
    defaultUnit: 'set',
    defaultPrice: 2500,
    popular: true,
  },
  {
    id: 'ceremonial-sweekarana-mala',
    department: 'CEREMONIAL',
    departmentLabel: 'Ceremonial & Rituals',
    name: 'Sweekarana Mala / Welcoming Garlands (Pair)',
    description: 'Handcrafted fresh jasmine, madurai malli, and fragrant rose petal garlands for reception and guest welcoming',
    defaultUnit: 'pair',
    defaultPrice: 2000,
    popular: true,
  },
  {
    id: 'ceremonial-bouquets',
    department: 'CEREMONIAL',
    departmentLabel: 'Ceremonial & Rituals',
    name: 'Stage Presentation Flower Bouquets (Bokke)',
    description: 'Fresh floral presentation bouquets with exotic Dutch roses, lilies, and carnations for stage felicitation',
    defaultUnit: 'bouquet',
    defaultPrice: 800,
  },
  {
    id: 'ceremonial-nirapara-nilavilakku',
    department: 'CEREMONIAL',
    departmentLabel: 'Ceremonial & Rituals',
    name: 'Traditional Nirapara & Bronze Nilavilakku Setup',
    description: 'Ceremonial measuring vessel (Nirapara) filled with golden paddy & coconut flowers, paired with tall bronze oil lamp (Nilavilakku)',
    defaultUnit: 'setup',
    defaultPrice: 2500,
    popular: true,
  },
  {
    id: 'ceremonial-manchal-olakkuda-package',
    department: 'CEREMONIAL',
    departmentLabel: 'Ceremonial & Rituals',
    name: 'Traditional Manchal & Olakkuda Entry (Package)',
    description: 'Ceremonial royal palanquin (Manchal) and traditional palm leaf royal umbrella (Olakkuda) with bearers for bride/groom entry',
    defaultUnit: 'setup',
    defaultPrice: 6000,
    popular: true,
  },
  {
    id: 'ceremonial-royal-manchal',
    department: 'CEREMONIAL',
    departmentLabel: 'Ceremonial & Rituals',
    name: 'Ceremonial Royal Manchal (Wedding Palanquin)',
    description: 'Intricately carved traditional royal palanquin with upholstered seating and ceremonial bearers',
    defaultUnit: 'setup',
    defaultPrice: 4500,
  },
  {
    id: 'ceremonial-olakkuda',
    department: 'CEREMONIAL',
    departmentLabel: 'Ceremonial & Rituals',
    name: 'Traditional Olakkuda (Palm Leaf Umbrella)',
    description: 'Authentic Kerala woven palm leaf royal umbrella (Olakkuda) with ceremonial wooden pole for wedding procession',
    defaultUnit: 'piece',
    defaultPrice: 1500,
  },
  /* ── 1. Stage & Decor ── */
  {
    id: 'decor-stage-floral',
    department: 'DECOR',
    departmentLabel: 'Stage & Decor',
    name: 'Stage Floral Decor & Sofa',
    description: 'Fresh floral stage backdrop with couple sofa and carpet',
    defaultUnit: 'setup',
    defaultPrice: 35000,
    popular: true,
  },
  {
    id: 'decor-suite-bundle',
    department: 'DECOR',
    departmentLabel: 'Stage & Decor',
    name: 'Stage, Pathway, Entrance Arch & Photo Frame (Package)',
    description: 'Complete hall decor with stage, walkway, entrance arch, and 2 photo frames',
    defaultUnit: 'package',
    defaultPrice: 50000,
    popular: true,
  },
  {
    id: 'decor-pathway-pillars',
    department: 'DECOR',
    departmentLabel: 'Stage & Decor',
    name: 'Pathway Floral Pillars & Walkway',
    description: 'Walkway pillars with fresh flowers, lighting, and carpet',
    defaultUnit: 'setup',
    defaultPrice: 10000,
    popular: true,
  },
  {
    id: 'decor-entrance-arch',
    department: 'DECOR',
    departmentLabel: 'Stage & Decor',
    name: 'Entrance Floral Arch',
    description: 'Welcome entrance arch with fresh flowers and name plaque',
    defaultUnit: 'setup',
    defaultPrice: 10000,
    popular: true,
  },
  {
    id: 'decor-photo-op',
    department: 'DECOR',
    departmentLabel: 'Stage & Decor',
    name: 'Photo Booth Frames (2 Sets)',
    description: '2 decorative photo frames for guest pictures',
    defaultUnit: 'set',
    defaultPrice: 5000,
    popular: true,
  },
  {
    id: 'decor-varmala-garlands',
    department: 'DECOR',
    departmentLabel: 'Stage & Decor',
    name: 'Wedding Garlands / Varmala (Pair)',
    description: 'Handcrafted rose petal and orchid garlands for bride & groom',
    defaultUnit: 'pair',
    defaultPrice: 3500,
  },
  {
    id: 'decor-hall-draping',
    department: 'DECOR',
    departmentLabel: 'Stage & Decor',
    name: 'Ceiling Draping & Fairy Lights',
    description: 'Hall ceiling fabric draping with warm fairy lights',
    defaultUnit: 'setup',
    defaultPrice: 18000,
  },
  {
    id: 'decor-car-floral',
    department: 'DECOR',
    departmentLabel: 'Stage & Decor',
    name: 'Wedding Car Floral Decor',
    description: 'Fresh flower decoration on bride/groom car',
    defaultUnit: 'vehicle',
    defaultPrice: 4000,
  },

  /* ── 2. Lights & Generator ── */
  {
    id: 'light-edison-canopy',
    department: 'LIGHTING',
    departmentLabel: 'Lights & Generator',
    name: 'Edison Bulb Hanging Canopy',
    description: 'Ceiling canopy of warm Edison filament bulbs',
    defaultUnit: 'setup',
    defaultPrice: 15000,
    popular: true,
  },
  {
    id: 'light-edison-generator-suite',
    department: 'LIGHTING',
    departmentLabel: 'Lights & Generator',
    name: 'Edison Lights & Generator Backup (Package)',
    description: 'Edison bulb canopy, stage focus lights, and silent generator with diesel',
    defaultUnit: 'package',
    defaultPrice: 30000,
    popular: true,
  },
  {
    id: 'light-stage-ambient',
    department: 'LIGHTING',
    departmentLabel: 'Lights & Generator',
    name: 'Stage Focus & Wash Lights',
    description: 'Stage LED par lights for photo and video clarity',
    defaultUnit: 'setup',
    defaultPrice: 12000,
  },
  {
    id: 'power-genset-62',
    department: 'LIGHTING',
    departmentLabel: 'Lights & Generator',
    name: 'Silent Generator (62.5 kVA) with Diesel',
    description: 'Heavy silent generator with diesel fuel and operator',
    defaultUnit: 'day',
    defaultPrice: 15000,
    popular: true,
  },
  {
    id: 'power-genset-125',
    department: 'LIGHTING',
    departmentLabel: 'Lights & Generator',
    name: 'Silent Generator (125 kVA) with Diesel',
    description: 'High capacity generator for large halls and full AC loads',
    defaultUnit: 'day',
    defaultPrice: 22000,
  },

  /* ── 3. Buffet & Furniture ── */
  {
    id: 'rentals-vip-buffet',
    department: 'RENTALS',
    departmentLabel: 'Buffet & Furniture',
    name: 'VIP Buffet Counter Setup',
    description: 'Premium buffet counter with chafing dishes and food warmers',
    defaultUnit: 'counter',
    defaultPrice: 7000,
    popular: true,
  },
  {
    id: 'rentals-standard-buffet',
    department: 'RENTALS',
    departmentLabel: 'Buffet & Furniture',
    name: 'Buffet Counter, Plates & Tissues',
    description: 'Buffet counter with food warmers, ceramic plates, spoons & tissues',
    defaultUnit: 'setup',
    defaultPrice: 3500,
  },
  {
    id: 'rentals-table-chair-package',
    department: 'RENTALS',
    departmentLabel: 'Buffet & Furniture',
    name: 'Tables, Chairs & Chair Covers (Package)',
    description: 'Hall table setting with frills, banquet chairs, and white covers',
    defaultUnit: 'package',
    defaultPrice: 6800,
    popular: true,
  },
  {
    id: 'rentals-chairs-per-piece',
    department: 'RENTALS',
    departmentLabel: 'Buffet & Furniture',
    name: 'Chairs with Covers & Bows',
    description: 'Banquet chair with white cover and satin ribbon bow',
    defaultUnit: 'chair',
    defaultPrice: 17,
  },
  {
    id: 'rentals-round-vip-tables',
    department: 'RENTALS',
    departmentLabel: 'Buffet & Furniture',
    name: 'Round VIP Tables with Linen',
    description: 'Round dining table with clean linen and flower vase',
    defaultUnit: 'table',
    defaultPrice: 650,
  },
  {
    id: 'rentals-crockery-cutlery',
    department: 'RENTALS',
    departmentLabel: 'Buffet & Furniture',
    name: 'Ceramic Plates, Spoons & Tissues (Per Person)',
    description: 'Ceramic plates, steel spoons, water glasses, and paper napkins',
    defaultUnit: 'person',
    defaultPrice: 15,
  },

  /* ── 4. Service Staff ── */
  {
    id: 'staff-service-boys',
    department: 'STAFF',
    departmentLabel: 'Service Staff',
    name: 'Serving Boys (Per Person / Day)',
    description: 'Uniformed catering serving boys for table and buffet service',
    defaultUnit: 'person',
    defaultPrice: 850,
    popular: true,
  },
  {
    id: 'staff-captain-supervisor',
    department: 'STAFF',
    departmentLabel: 'Service Staff',
    name: 'Floor Captain / Supervisor',
    description: 'Supervisor to manage buffet timing and guest hospitality',
    defaultUnit: 'person',
    defaultPrice: 1800,
    popular: true,
  },
  {
    id: 'staff-live-counter-chef',
    department: 'STAFF',
    departmentLabel: 'Service Staff',
    name: 'Live Counter Chef',
    description: 'Chef for live appam, live dosa, or live grill counter',
    defaultUnit: 'chef',
    defaultPrice: 1200,
  },
  {
    id: 'staff-kitchen-cleaning-team',
    department: 'STAFF',
    departmentLabel: 'Service Staff',
    name: 'Dishwashing & Cleaning Crew',
    description: 'Crew for plate washing and hall cleanup after feast',
    defaultUnit: 'team',
    defaultPrice: 4000,
  },
  {
    id: 'staff-event-coordinator',
    department: 'STAFF',
    departmentLabel: 'Service Staff',
    name: 'Event Coordinator & Floor Manager (Codinettar)',
    description: 'Dedicated on-ground wedding coordinator to supervise ceremony timing, bride/groom entries, stage flow, and hospitality',
    defaultUnit: 'coordinator',
    defaultPrice: 5000,
    popular: true,
  },

  /* ── 5. Sound & Special FX ── */
  {
    id: 'prod-cold-pyros-fog',
    department: 'PRODUCTION',
    departmentLabel: 'Sound & Special FX',
    name: 'Entry Dry Ice Fog & Cold Pyros',
    description: 'Dry ice cloud fog and smokeless cold sparklers for couple entry',
    defaultUnit: 'event',
    defaultPrice: 7500,
    popular: true,
  },
  {
    id: 'prod-sound-system',
    department: 'PRODUCTION',
    departmentLabel: 'Sound & Special FX',
    name: 'PA Sound System & Wireless Mics',
    description: 'Sound system with cordless mics for announcements and background music',
    defaultUnit: 'setup',
    defaultPrice: 12000,
  },
  {
    id: 'prod-chenda-melam',
    department: 'PRODUCTION',
    departmentLabel: 'Sound & Special FX',
    name: 'Chenda Melam Troupe (7 Artists)',
    description: 'Traditional Kerala ceremonial welcome percussion troupe',
    defaultUnit: 'troupe',
    defaultPrice: 15000,
  },
  {
    id: 'prod-nadhaswaram-troupe-2',
    department: 'PRODUCTION',
    departmentLabel: 'Sound & Special FX',
    name: 'Nadaswaram Troupe (2 Nadaswarams & Thavil Artists)',
    description: 'Live traditional South Indian wedding classical music by 2 Nadaswaram vidwans and Thavil percussionists',
    defaultUnit: 'troupe',
    defaultPrice: 7000,
    popular: true,
  },
  {
    id: 'prod-nadhaswaram',
    department: 'PRODUCTION',
    departmentLabel: 'Sound & Special FX',
    name: 'Nadaswaram & Thavil Ensemble',
    description: 'Live traditional wedding music for ceremonial rituals',
    defaultUnit: 'troupe',
    defaultPrice: 12000,
  },
];

export function searchEventServices(
  query: string,
  department?: ServiceDepartment | 'ALL',
): AtomicEventService[] {
  const q = query.toLowerCase().trim();
  return ATOMIC_EVENT_SERVICES.filter((item) => {
    const matchDept = !department || department === 'ALL' || item.department === department;
    if (!matchDept) return false;
    if (!q) return true;
    return (
      item.name.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.departmentLabel.toLowerCase().includes(q) ||
      item.defaultUnit.toLowerCase().includes(q)
    );
  });
}

/**
 * Checks if a quotation item is an Event Service / Rental rather than a Food menu dish
 */
export function isEventServiceItem(item: {
  name?: string;
  categoryName?: string;
  unit?: string | null;
  unitPrice?: number | string | null;
}): boolean {
  const n = (item.name || '').toLowerCase();
  const c = (item.categoryName || '').toLowerCase();
  const u = (item.unit || '').toLowerCase();

  // Known service keywords
  const serviceKeywords = [
    'decor',
    'stage',
    'pathway',
    'entrance',
    'arch',
    'photo',
    'bulb',
    'light',
    'generator',
    'genset',
    'diesel',
    'buffet',
    'counter',
    'serving',
    'boys',
    'staff',
    'captain',
    'chair',
    'table',
    'crockery',
    'plate',
    'tissue',
    'sound',
    'audio',
    'pyro',
    'fog',
    'dry ice',
    'melam',
    'troupe',
    'garland',
    'varmala',
    'service',
    'rental',
    'transport',
    'cleaning',
  ];

  if (serviceKeywords.some((k) => n.includes(k) || c.includes(k))) {
    return true;
  }

  // Non-food units
  const serviceUnits = ['setup', 'shift', 'staff', 'captain', 'team', 'troupe', 'package', 'suite', 'entry moment', 'counter', 'chair', 'table'];
  if (serviceUnits.includes(u)) {
    return true;
  }

  return false;
}

/**
 * Returns a standardized group label and badge icon for any event service line item
 */
export function getServiceDepartmentGroup(name?: string, category?: string): {
  group:
    | 'Live Stalls & Counters'
    | 'Ceremonial & Rituals'
    | 'Decor & Styling'
    | 'Production & Lighting'
    | 'Event Rentals & Infrastructure'
    | 'Hospitality & Service Crew'
    | 'Event Services';
  icon: string;
  badgeClass: string;
} {
  const n = (name || '').toLowerCase();
  const c = (category || '').toLowerCase();
  const combined = `${n} ${c}`;

  if (
    combined.includes('stall') ||
    combined.includes('juice') ||
    combined.includes('tea') ||
    combined.includes('coffee') ||
    combined.includes('snack') ||
    combined.includes('sulaimani') ||
    combined.includes('horlicks') ||
    combined.includes('boost') ||
    combined.includes('mojito') ||
    combined.includes('pazham pori') ||
    combined.includes('bajji') ||
    combined.includes('thattukada') ||
    combined.includes('counter live') ||
    combined.includes('live counter')
  ) {
    return {
      group: 'Live Stalls & Counters',
      icon: '🍹',
      badgeClass: 'bg-teal-50 text-teal-700 border-teal-200',
    };
  }

  if (
    combined.includes('pooja') ||
    combined.includes('sweekarana') ||
    combined.includes('sweekaram') ||
    combined.includes('nilavilakku') ||
    combined.includes('nirapara') ||
    combined.includes('manchal') ||
    combined.includes('olakkuda') ||
    combined.includes('bokke') ||
    combined.includes('bouquet') ||
    combined.includes('garland') ||
    combined.includes('varmala') ||
    combined.includes('ritual')
  ) {
    return {
      group: 'Ceremonial & Rituals',
      icon: '🪔',
      badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
    };
  }

  if (
    combined.includes('decor') ||
    combined.includes('stage') ||
    combined.includes('floral') ||
    combined.includes('arch') ||
    combined.includes('pathway') ||
    combined.includes('photo') ||
    combined.includes('flower') ||
    combined.includes('backdrop') ||
    combined.includes('sofa') ||
    combined.includes('walkway')
  ) {
    return {
      group: 'Decor & Styling',
      icon: '🌸',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    };
  }

  if (
    combined.includes('sound') ||
    combined.includes('audio') ||
    combined.includes('light') ||
    combined.includes('bulb') ||
    combined.includes('generator') ||
    combined.includes('genset') ||
    combined.includes('pyro') ||
    combined.includes('fog') ||
    combined.includes('dry ice') ||
    combined.includes('melam') ||
    combined.includes('band') ||
    combined.includes('spark') ||
    combined.includes('smoke') ||
    combined.includes('fx') ||
    combined.includes('nadhaswaram') ||
    combined.includes('nadaswaram')
  ) {
    return {
      group: 'Production & Lighting',
      icon: '✨',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    };
  }

  if (
    combined.includes('rental') ||
    combined.includes('chair') ||
    combined.includes('table') ||
    combined.includes('crockery') ||
    combined.includes('buffet') ||
    combined.includes('gazebo') ||
    combined.includes('counter') ||
    combined.includes('linen') ||
    combined.includes('cutlery') ||
    combined.includes('glassware') ||
    combined.includes('shamiana') ||
    combined.includes('tent')
  ) {
    return {
      group: 'Event Rentals & Infrastructure',
      icon: '🪑',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    };
  }

  if (
    combined.includes('staff') ||
    combined.includes('boy') ||
    combined.includes('captain') ||
    combined.includes('chef') ||
    combined.includes('crew') ||
    combined.includes('clean') ||
    combined.includes('waiter') ||
    combined.includes('coordinator') ||
    combined.includes('codinettar') ||
    combined.includes('hospitality')
  ) {
    return {
      group: 'Hospitality & Service Crew',
      icon: '🤵',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
  }

  return {
    group: 'Event Services',
    icon: '⚡',
    badgeClass: 'bg-slate-50 text-slate-700 border-slate-200',
  };
}

/**
 * Splits raw line item strings like "Juice Counter live --- pineapple, watermelon, mojitto"
 * or "Tea shop Live -- tea, cofy, sulaimani" into a clean title and description.
 */
export function formatServiceLineTitle(rawName: string): { title: string; subtitle?: string } {
  if (!rawName) return { title: '' };
  const separatorRegex = /\s*(?:---|--|—|–)\s*/;
  if (separatorRegex.test(rawName)) {
    const parts = rawName.split(separatorRegex);
    const title = parts[0].trim();
    const subtitle = parts.slice(1).join(' • ').trim();
    return { title, subtitle: subtitle || undefined };
  }
  return { title: rawName.trim() };
}
