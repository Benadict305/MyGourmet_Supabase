import { Dish, WeeklyPlan } from './types';

export const MOCK_DISHES: Dish[] = [
  {
    id: '1',
    name: 'Spaghetti Carbonara',
    image: 'https://picsum.photos/400/300?random=1',
    rating: 5,
    recipeLink: 'https://example.com/carbonara',
    notes: 'Nur mit Guanciale und Pecorino machen!',
    ingredients: [
      { id: 'i1', name: 'Spaghetti', amount: '500', unit: 'g' },
      { id: 'i2', name: 'Guanciale', amount: '200', unit: 'g' },
      { id: 'i3', name: 'Eigelb', amount: '4', unit: 'Stk' },
      { id: 'i4', name: 'Pecorino', amount: '100', unit: 'g' },
    ],
    lastCooked: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(), // 5 days ago
    timesCooked: 12,
    tags: ['Hauptgerichte', 'Nudeln']
  },
  {
    id: '2',
    name: 'Thai Green Curry',
    image: 'https://picsum.photos/400/300?random=2',
    rating: 4,
    notes: 'Scharf!',
    ingredients: [
      { id: 'i5', name: 'Kokosmilch', amount: '400', unit: 'ml' },
      { id: 'i6', name: 'Grüne Currypaste', amount: '2', unit: 'EL' },
      { id: 'i7', name: 'Hähnchenbrust', amount: '400', unit: 'g' },
      { id: 'i8', name: 'Gemüse', amount: '300', unit: 'g' },
    ],
    timesCooked: 5,
    tags: ['Hauptgerichte', 'Currys']
  },
  {
    id: '3',
    name: 'Linseneintopf',
    image: 'https://picsum.photos/400/300?random=3',
    rating: 3,
    notes: 'Gut für kalte Tage.',
    ingredients: [
      { id: 'i9', name: 'Tellerlinsen', amount: '300', unit: 'g' },
      { id: 'i10', name: 'Suppengrün', amount: '1', unit: 'Bund' },
      { id: 'i11', name: 'Kartoffeln', amount: '4', unit: 'Stk' },
    ],
    timesCooked: 20,
    lastCooked: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20).toISOString(),
    tags: ['Hauptgerichte', 'Eintop', 'Suppen']
  },
    {
    id: '4',
    name: 'Selbstgemachte Pizza',
    image: 'https://picsum.photos/400/300?random=4',
    rating: 5,
    notes: 'Teig 24h gehen lassen.',
    ingredients: [
      { id: 'i12', name: 'Mehl Type 00', amount: '1', unit: 'kg' },
      { id: 'i13', name: 'Hefe', amount: '3', unit: 'g' },
      { id: 'i14', name: 'Tomaten', amount: '2', unit: 'Dosen' },
      { id: 'i15', name: 'Mozzarella', amount: '3', unit: 'Kugeln' },
    ],
    timesCooked: 8,
    tags: ['Hauptgerichte', 'Backen']
  },
];

// Add mock data for weekly plans for better offline/preview usability
const today = new Date();
const year = today.getFullYear();
const week = Math.ceil((((today.getTime() - new Date(year, 0, 1).getTime()) / 86400000) + new Date(year, 0, 1).getDay() + 1) / 7);

export const MOCK_PLANS: WeeklyPlan[] = [
    {
        id: `${year}-${week}`,
        year: year,
        week: week,
        dishIds: ['1', '3'] // Spaghetti Carbonara & Linseneintopf
    },
    {
        id: `${year}-${week + 1}`,
        year: year,
        week: week + 1,
        dishIds: ['2', '4', '1'] // Thai Curry, Pizza, & nochmal Carbonara
    }
];
