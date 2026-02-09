export interface Ingredient {
  id: string;
  name: string;
  amount: string;
  unit: string;
}

export interface Dish {
  id: string;
  name: string;
  image?: string;
  rating: number; // 0 to 5
  recipeLink?: string;
  notes?: string;
  ingredients: Ingredient[];
  lastCooked?: string; // ISO Date string
  timesCooked: number;
  tags?: string[];
}

export interface WeeklyPlan {
  id: string; // composed of "year-week" e.g., "2023-42"
  year: number;
  week: number;
  dishIds: string[]; // Max 5 dishes
}

export type ViewTab = 'dishes' | 'menu';

export interface CalendarWeek {
  week: number;
  year: number;
  label: string;
  isPast: boolean;
  isCurrent: boolean;
  isNext: boolean;
}