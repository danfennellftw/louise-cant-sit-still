export type LocationId =
  | 'home'
  | 'gym_shredz'
  | 'gym_crunch'
  | 'gym_eow'
  | 'grit_cycle'
  | 'grocery'
  | 'tjmaxx'
  | 'marshalls'
  | 'mall'
  | 'skincare'
  | 'massage'
  | 'nike'
  | 'ai_meetup';

export interface Location {
  id: LocationId;
  label: string;
  city: string;
  x: number;
  y: number;
  color: string;
  /** Points + restless refill on visit */
  points: number;
  restlessBoost: number;
  /** Default one-liner; home uses scene instead */
  quip: string;
  isHome?: boolean;
}

export interface CityLabel {
  name: string;
  x: number;
  y: number;
}

export const LOCATIONS: Location[] = [
  {
    id: 'home',
    label: 'Home (condo)',
    city: 'Irvine',
    x: 520,
    y: 380,
    color: '#ff9f7a',
    points: 120,
    restlessBoost: 35,
    quip: '',
    isHome: true,
  },
  {
    id: 'gym_shredz',
    label: 'Shredz',
    city: 'Ladera Ranch',
    x: 920,
    y: 520,
    color: '#6ec8ff',
    points: 80,
    restlessBoost: 28,
    quip: 'Shredz in Ladera Ranch. Louise lifted, stretched, and was already mentally at TJ Maxx.',
  },
  {
    id: 'gym_crunch',
    label: 'Crunch',
    city: 'San Clemente',
    x: 1180,
    y: 1180,
    color: '#6ec8ff',
    points: 80,
    restlessBoost: 28,
    quip: 'Crunch in San Clemente. Beach vibes, core work, zero sitting. Perfect.',
  },
  {
    id: 'gym_eow',
    label: 'Eow',
    city: 'Rancho Santa Margarita',
    x: 780,
    y: 720,
    color: '#6ec8ff',
    points: 80,
    restlessBoost: 28,
    quip: 'Eow in RSM. Another gym, another victory lap. The restless meter applauds.',
  },
  {
    id: 'grit_cycle',
    label: 'Grit Cycle',
    city: 'Dana Point',
    x: 130,
    y: 880,
    color: '#ff7eb8',
    points: 90,
    restlessBoost: 30,
    quip: '',
  },
  {
    id: 'grocery',
    label: 'Grocery',
    city: 'Tustin',
    x: 640,
    y: 560,
    color: '#7dd87d',
    points: 70,
    restlessBoost: 22,
    quip: 'Grocery run: brown-food supplies secured. Chicken count: yes. Adventure count: also yes.',
  },
  {
    id: 'tjmaxx',
    label: 'TJ Maxx',
    city: 'Mission Viejo',
    x: 860,
    y: 880,
    color: '#c9a0ff',
    points: 75,
    restlessBoost: 25,
    quip: 'TJ Maxx finds: skincare, a basket, and the sudden need to reorganize the condo.',
  },
  {
    id: 'marshalls',
    label: 'Marshall’s',
    city: 'Huntington Beach',
    x: 380,
    y: 720,
    color: '#c9a0ff',
    points: 75,
    restlessBoost: 25,
    quip: 'Marshall’s haul acquired. Mochi approved. Aleo demanded treats. Louise kept moving.',
  },
  {
    id: 'mall',
    label: 'The Mall',
    city: 'Costa Mesa',
    x: 480,
    y: 520,
    color: '#ffb347',
    points: 90,
    restlessBoost: 30,
    quip: 'The mall: steps, samples, and a skincare detour that was definitely “research.”',
  },
  {
    id: 'skincare',
    label: 'Skincare Spa',
    city: 'Newport Beach',
    x: 320,
    y: 420,
    color: '#ff9fd6',
    points: 85,
    restlessBoost: 32,
    quip: 'Vampire facial energy. Glowing skin. Still no interest in sitting down afterward.',
  },
  {
    id: 'massage',
    label: 'Massage',
    city: 'Laguna Beach',
    x: 200,
    y: 620,
    color: '#ff9fd6',
    points: 85,
    restlessBoost: 30,
    quip: 'Massage complete. Relaxed for exactly eleven seconds. Then: errands.',
  },
  {
    id: 'nike',
    label: 'Nike Shoes',
    city: 'Anaheim Hills',
    x: 700,
    y: 280,
    color: '#ffe566',
    points: 80,
    restlessBoost: 26,
    quip: 'Fresh running shoes. Louise doesn’t run from responsibility — she runs to the next stop.',
  },
  {
    id: 'ai_meetup',
    label: 'Coffee Meetup',
    city: 'Irvine',
    x: 600,
    y: 460,
    color: '#9ad4ff',
    points: 70,
    restlessBoost: 20,
    quip: '',
  },
];

export const CITY_LABELS: CityLabel[] = [
  { name: 'Dana Point', x: 100, y: 920 },
  { name: 'Laguna Beach', x: 160, y: 680 },
  { name: 'Newport Beach', x: 280, y: 480 },
  { name: 'Huntington Beach', x: 340, y: 780 },
  { name: 'Costa Mesa', x: 460, y: 580 },
  { name: 'Irvine', x: 540, y: 420 },
  { name: 'Tustin', x: 620, y: 600 },
  { name: 'Anaheim Hills', x: 720, y: 320 },
  { name: 'RSM', x: 800, y: 760 },
  { name: 'Mission Viejo', x: 880, y: 940 },
  { name: 'Ladera Ranch', x: 960, y: 560 },
  { name: 'San Clemente', x: 1220, y: 1240 },
];

export const MAP_WIDTH = 1400;
export const MAP_HEIGHT = 1400;
