
import { Dish, WeeklyPlan, Ingredient } from '../types';
import { DISH_CATEGORIES, MOCK_DISHES } from '../constants';
import { supabase } from '../lib/supabase';

console.log("Initializing dataService (Supabase)...");

const LS_KEYS = {
  DISHES: 'mygourmet_dishes',
  PLANS: 'mygourmet_plans',
  CATEGORIES: 'mygourmet_categories'
};

// In-Memory Fallback store in case LocalStorage is disabled/throws
const memoryStore: Record<string, any> = {};

// Safe LocalStorage Wrapper
const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn("LocalStorage access denied, using memory store");
      return memoryStore[key] || null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      memoryStore[key] = value;
    }
  }
};

// Polyfill for randomUUID
export const generateId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch (e) { }
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// State to track if we are forcing local storage due to API failure
let useLocalStorage = false;

// Helper to initialize LocalStorage with Mock data if empty
const initLocalStorage = () => {
  try {
    if (!safeStorage.getItem(LS_KEYS.DISHES)) {
      safeStorage.setItem(LS_KEYS.DISHES, JSON.stringify(MOCK_DISHES));
    }
    if (!safeStorage.getItem(LS_KEYS.PLANS)) {
      safeStorage.setItem(LS_KEYS.PLANS, JSON.stringify([]));
    }
    if (!safeStorage.getItem(LS_KEYS.CATEGORIES)) {
      safeStorage.setItem(LS_KEYS.CATEGORIES, JSON.stringify(DISH_CATEGORIES));
    }
  } catch (e) {
    console.error("Failed to init storage", e);
  }
};

// Initialize once
initLocalStorage();

// Helper for Local Storage Operations
const localStore = {
  get: <T>(key: string): T => {
    try {
      const item = safeStorage.getItem(key);
      return item ? JSON.parse(item) : [];
    } catch (e) {
      console.error("Error parsing local data", e);
      return [] as unknown as T;
    }
  },
  set: (key: string, data: any) => {
    try {
      safeStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error("Error saving local data", e);
    }
  }
};

export const dataService = {
  checkBackendConnection: async (): Promise<boolean> => {
    try {
      useLocalStorage = false;
      const { error } = await supabase.from('mygourmet_categories').select('count', { count: 'exact', head: true });
      if (error) throw error;
      return true;
    } catch (e) {
      console.warn("Supabase connection check failed, switching to local storage", e);
      useLocalStorage = true;
      return false;
    }
  },

  getDishes: async (): Promise<Dish[]> => {
    if (useLocalStorage) return localStore.get<Dish[]>(LS_KEYS.DISHES);

    try {
      const { data, error } = await supabase
        .from('mygourmet_dishes')
        .select(`
          *,
          ingredients:mygourmet_ingredients (*),
          dish_tags:mygourmet_dish_tags (tag_name)
        `);

      if (error) throw error;

      return (data || []).map((d: any) => ({
        ...d,
        ingredients: d.ingredients || [],
        tags: d.dish_tags ? d.dish_tags.map((t: any) => t.tag_name) : []
      }));
    } catch (e) {
      console.error("Failed to fetch dishes from Supabase", e);
      return localStore.get<Dish[]>(LS_KEYS.DISHES);
    }
  },

  addDish: async (dish: Omit<Dish, 'id'>): Promise<Dish> => {
    const newDish = { ...dish, id: generateId() };

    if (useLocalStorage) {
      const dishes = localStore.get<Dish[]>(LS_KEYS.DISHES);
      dishes.unshift(newDish as Dish);
      localStore.set(LS_KEYS.DISHES, dishes);
      return newDish as Dish;
    }

    try {
      // Insert dish
      const { error: dishError } = await supabase
        .from('mygourmet_dishes')
        .insert([{
          id: newDish.id,
          name: newDish.name,
          image: newDish.image,
          rating: newDish.rating,
          recipe_link: newDish.recipeLink,
          notes: newDish.notes,
          times_cooked: newDish.timesCooked,
          last_cooked: newDish.lastCooked
        }]);

      if (dishError) throw dishError;

      // Insert ingredients
      if (newDish.ingredients.length > 0) {
        const ingredientsToInsert = newDish.ingredients.map(ing => ({
          id: generateId(),
          dish_id: newDish.id,
          name: ing.name,
          amount: ing.amount,
          unit: ing.unit
        }));
        const { error: ingError } = await supabase.from('mygourmet_ingredients').insert(ingredientsToInsert);
        if (ingError) throw ingError;
      }

      // Insert tags
      if (newDish.tags && newDish.tags.length > 0) {
        const tagsToInsert = newDish.tags.map(tag => ({
          dish_id: newDish.id,
          tag_name: tag
        }));
        const { error: tagError } = await supabase.from('mygourmet_dish_tags').insert(tagsToInsert);
        if (tagError) throw tagError;
      }

      return newDish as Dish;
    } catch (e) {
      console.error("Failed to add dish to Supabase", e);
      // Fallback to local storage
      const dishes = localStore.get<Dish[]>(LS_KEYS.DISHES);
      dishes.unshift(newDish as Dish);
      localStore.set(LS_KEYS.DISHES, dishes);
      return newDish as Dish;
    }
  },

  updateDish: async (dish: Dish): Promise<Dish> => {
    if (useLocalStorage) {
      const dishes = localStore.get<Dish[]>(LS_KEYS.DISHES);
      const index = dishes.findIndex(d => d.id === dish.id);
      if (index !== -1) {
        dishes[index] = dish;
        localStore.set(LS_KEYS.DISHES, dishes);
      }
      return dish;
    }

    try {
      // Update dish
      const { error: dishError } = await supabase
        .from('mygourmet_dishes')
        .update({
          name: dish.name,
          image: dish.image,
          rating: dish.rating,
          recipe_link: dish.recipeLink,
          notes: dish.notes,
          times_cooked: dish.timesCooked,
          last_cooked: dish.lastCooked
        })
        .eq('id', dish.id);

      if (dishError) throw dishError;

      // Update ingredients (delete and re-insert is simplest, though not most efficient)
      await supabase.from('mygourmet_ingredients').delete().eq('dish_id', dish.id);
      if (dish.ingredients.length > 0) {
        const ingredientsToInsert = dish.ingredients.map(ing => ({
          id: generateId(), // Creating new IDs as we replaced them
          dish_id: dish.id,
          name: ing.name,
          amount: ing.amount,
          unit: ing.unit
        }));
        await supabase.from('mygourmet_ingredients').insert(ingredientsToInsert);
      }

      // Update tags
      await supabase.from('mygourmet_dish_tags').delete().eq('dish_id', dish.id);
      if (dish.tags && dish.tags.length > 0) {
        const tagsToInsert = dish.tags.map(tag => ({
          dish_id: dish.id,
          tag_name: tag
        }));
        await supabase.from('mygourmet_dish_tags').insert(tagsToInsert);
      }

      return dish;
    } catch (e) {
      console.error("Failed to update dish in Supabase", e);
      // Fallback
      const dishes = localStore.get<Dish[]>(LS_KEYS.DISHES);
      const index = dishes.findIndex(d => d.id === dish.id);
      if (index !== -1) {
        dishes[index] = dish;
        localStore.set(LS_KEYS.DISHES, dishes);
      }
      return dish;
    }
  },

  updateDishCookingStats: async (dishId: string, increment: boolean): Promise<void> => {
    // This calls getDishes -> updateDish internally in previous logic. 
    // We can optimize with SQL or keep logic.
    // Keeping logic is safer for now.
    try {
      const dishes = await dataService.getDishes();
      const dish = dishes.find(d => d.id === dishId);
      if (!dish) return;

      const updatedDish = {
        ...dish,
        times_cooked: Math.max(0, dish.timesCooked + (increment ? 1 : -1)),
        last_cooked: increment ? new Date().toISOString() : dish.lastCooked
      };

      await dataService.updateDish(updatedDish);
    } catch (error) {
      console.error('Failed to update dish cooking stats:', error);
    }
  },

  deleteDish: async (id: string): Promise<void> => {
    if (useLocalStorage) {
      const dishes = localStore.get<Dish[]>(LS_KEYS.DISHES);
      const filtered = dishes.filter(d => d.id !== id);
      localStore.set(LS_KEYS.DISHES, filtered);
      return;
    }

    try {
      const { error } = await supabase.from('mygourmet_dishes').delete().eq('id', id);
      if (error) throw error;
    } catch (e) {
      console.error("Failed to delete dish", e);
      const dishes = localStore.get<Dish[]>(LS_KEYS.DISHES);
      const filtered = dishes.filter(d => d.id !== id);
      localStore.set(LS_KEYS.DISHES, filtered);
    }
  },

  getPlans: async (): Promise<WeeklyPlan[]> => {
    if (useLocalStorage) return localStore.get<WeeklyPlan[]>(LS_KEYS.PLANS);

    try {
      const { data, error } = await supabase.from('mygourmet_menu_plans').select('*');
      if (error) throw error;

      // Transform flat DB rows into WeeklyPlan objects
      const plansMap = new Map<string, WeeklyPlan>();

      data.forEach((row: any) => {
        const id = `${row.year}-${row.week}`;
        if (!plansMap.has(id)) {
          plansMap.set(id, {
            id,
            year: row.year,
            week: row.week,
            dishIds: []
          });
        }
        if (row.dishId) {
          plansMap.get(id)!.dishIds.push(row.dishId);
        }
      });

      return Array.from(plansMap.values());
    } catch (e) {
      console.error("Failed to get plans", e);
      return localStore.get<WeeklyPlan[]>(LS_KEYS.PLANS);
    }
  },

  addDishToPlan: async (year: number, week: number, dishId: string): Promise<void> => {
    if (useLocalStorage) {
      const plans = localStore.get<WeeklyPlan[]>(LS_KEYS.PLANS);
      const id = `${year}-${week}`;
      let plan = plans.find(p => p.id === id || (p.year === year && p.week === week));
      if (!plan) {
        plan = { id, year, week, dishIds: [] };
        plans.push(plan);
      }
      if (!plan.dishIds.includes(dishId)) {
        plan.dishIds.push(dishId);
        await dataService.updateDishCookingStats(dishId, true);
      }
      localStore.set(LS_KEYS.PLANS, plans);
      return;
    }

    try {
      const { error } = await supabase.from('mygourmet_menu_plans').insert([{ year, week, dishId }]);
      if (error) throw error;
      await dataService.updateDishCookingStats(dishId, true);
    } catch (e) {
      console.error("Failed to add to plan", e);
      // Fallback logic could be complex here, just log for now or switch to LS?
    }
  },

  removeDishFromPlan: async (year: number, week: number, dishId: string): Promise<void> => {
    if (useLocalStorage) {
      const plans = localStore.get<WeeklyPlan[]>(LS_KEYS.PLANS);
      const plan = plans.find(p => p.year === year && p.week === week);
      if (plan) {
        const idx = plan.dishIds.indexOf(dishId);
        if (idx > -1) {
          plan.dishIds.splice(idx, 1);
          await dataService.updateDishCookingStats(dishId, false);
        }
        localStore.set(LS_KEYS.PLANS, plans);
      }
      return;
    }

    try {
      const { error } = await supabase
        .from('mygourmet_menu_plans')
        .delete()
        .match({ year, week, dishId });

      if (error) throw error;
      await dataService.updateDishCookingStats(dishId, false);
    } catch (e) {
      console.error("Failed to remove from plan", e);
    }
  },

  getCategories: async (): Promise<string[]> => {
    if (useLocalStorage) {
      const stored = localStore.get<string[]>(LS_KEYS.CATEGORIES);
      return (stored && stored.length > 0) ? stored : DISH_CATEGORIES;
    }

    try {
      const { data, error } = await supabase
        .from('mygourmet_categories')
        .select('name')
        .order('sortOrder', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) return DISH_CATEGORIES;
      return data.map((c: any) => c.name);
    } catch (e) {
      const stored = localStore.get<string[]>(LS_KEYS.CATEGORIES);
      return (stored && stored.length > 0) ? stored : DISH_CATEGORIES;
    }
  },

  saveCategories: async (categories: string[]): Promise<void> => {
    if (useLocalStorage) {
      localStore.set(LS_KEYS.CATEGORIES, categories);
      return;
    }

    try {
      // Replace all categories
      // Note: This is destructive. Best to upsert.
      // But since we want to respect order, we might need to clear and insert.
      // Or upsert with order.

      // First, maybe delete all? Or upsert.
      // Let's try upserting logic.
      const rows = categories.map((name, index) => ({
        name,
        sortOrder: index
      }));

      const { error } = await supabase.from('mygourmet_categories').upsert(rows);
      if (error) throw error;
    } catch (e) {
      localStore.set(LS_KEYS.CATEGORIES, categories);
    }
  },

  getShoppingList: async (year: number, week: number): Promise<Ingredient[]> => {
    // Re-use getData/getPlans which handle fallback
    try {
      let plans = await dataService.getPlans();
      let dishes = await dataService.getDishes();

      const safePlans = Array.isArray(plans) ? plans : [];
      const safeDishes = Array.isArray(dishes) ? dishes : [];

      const id = `${year}-${week}`;
      const plan = safePlans.find((p) => p.id === id || (p.year === year && p.week === week));

      if (!plan) return [];

      const allIngredients: Ingredient[] = [];

      plan.dishIds.forEach(dishId => {
        const dish = safeDishes.find(d => d.id === dishId);
        if (dish && dish.ingredients) {
          allIngredients.push(...dish.ingredients);
        }
      });

      return allIngredients;
    } catch (e) {
      console.error("Shopping list generation failed", e);
      return [];
    }
  },

  fetchRecipeData: async (url: string): Promise<any> => {
    // Placeholder. Needs Edge Function or Backend Proxy.
    console.warn("Recipe scraping not implemented for Supabase yet");
    return null;
  }
};
