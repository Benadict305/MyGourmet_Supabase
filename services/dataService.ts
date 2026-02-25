import { Dish, WeeklyPlan, Ingredient, Category } from '../types';
import { MOCK_DISHES } from '../mockData';
import { supabase } from '../lib/supabase';

console.log("Initializing dataService (Supabase)...");

const LS_KEYS = {
  DISHES: 'mygourmet_dishes',
  PLANS: 'mygourmet_plans',
  CATEGORIES: 'mygourmet_categories'
};

const memoryStore: Record<string, any> = {};

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

let useLocalStorage = false;

const initLocalStorage = () => {
  try {
    if (!safeStorage.getItem(LS_KEYS.DISHES)) {
      safeStorage.setItem(LS_KEYS.DISHES, JSON.stringify(MOCK_DISHES));
    }
    if (!safeStorage.getItem(LS_KEYS.PLANS)) {
      safeStorage.setItem(LS_KEYS.PLANS, JSON.stringify([]));
    }
    if (!safeStorage.getItem(LS_KEYS.CATEGORIES)) {
      safeStorage.setItem(LS_KEYS.CATEGORIES, JSON.stringify([
        { id: generateId(), name: 'Hauptgerichte', sortOrder: 0 },
        { id: generateId(), name: 'Suppen', sortOrder: 1 },
        { id: generateId(), name: 'Salate', sortOrder: 2 },
        { id: generateId(), name: 'Nachtisch', sortOrder: 3 },
        { id: generateId(), name: 'Frühstück', sortOrder: 4 },
        { id: generateId(), name: 'Snacks', sortOrder: 5 },
        { id: generateId(), name: 'Beilagen', sortOrder: 6 },
        { id: generateId(), name: 'Backen', sortOrder: 7 },
        { id: generateId(), name: 'Getränke', sortOrder: 8 },
        { id: generateId(), name: 'Nicht allergenfrei', sortOrder: 9 },
        { id: generateId(), name: 'Arbeit Aufläufe', sortOrder: 10 },
        { id: generateId(), name: 'Eintop', sortOrder: 11 },
        { id: generateId(), name: 'Baby', sortOrder: 12 },
        { id: generateId(), name: 'Kalorienreduziert', sortOrder: 13 },
        { id: generateId(), name: 'Pasten & Co', sortOrder: 14 },
        { id: generateId(), name: 'Fisch', sortOrder: 15 },
        { id: generateId(), name: 'Aufstriche', sortOrder: 16 },
        { id: generateId(), name: 'Besondere Fleischgerichte', sortOrder: 17 },
        { id: generateId(), name: 'Qinoa', sortOrder: 18 },
        { id: generateId(), name: 'Reis', sortOrder: 19 },
        { id: generateId(), name: 'Nudeln', sortOrder: 20 },
        { id: generateId(), name: 'Currys', sortOrder: 21 },
      ]));
    }
  } catch (e) {
    console.error("Failed to init storage", e);
  }
};

initLocalStorage();

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

const mapDishFromDb = (d: any): Dish => ({
  id: d.id,
  name: d.name,
  image: d.image,
  rating: d.rating,
  recipeLink: d.recipelink,
  notes: d.notes,
  timesCooked: d.timescooked,
  lastCooked: d.lastcooked,
  ingredients: d.ingredients || [],
  tags: d.dish_tags ? d.dish_tags.map((t: any) => t.tagname) : []
});

const imageUrlToBase64 = async (url: string): Promise<string> => {
  if (!url || typeof url !== 'string') {
    console.warn("imageUrlToBase64 received an invalid URL:", url);
    return '';
  }
  try {
    console.log(`Attempting to fetch and convert image to Base64 from URL: ${url}`);
    const targetUrl = url.replace(/^(https?:\/\/)/, '');
    const proxyUrl = `https://cors.bivort.de/${targetUrl}`;
    console.log(`Using proxy URL: ${proxyUrl}`);
    
    const response = await fetch(proxyUrl, {
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Origin': 'https://mygourmet.bivort.de'
      }
    });

    if (!response.ok) {
      console.error(`Failed to fetch image. Status: ${response.status} ${response.statusText}`);
      const responseBody = await response.text();
      console.error(`Response body from failed image fetch: ${responseBody}`);
      return '';
    }

    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        console.log("Image successfully converted to Base64.");
        resolve(reader.result as string);
      };
      reader.onerror = (error) => {
        console.error("FileReader error while converting image to Base64:", error);
        reject(error);
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Exception in imageUrlToBase64:', error);
    return '';
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
          dish_tags:mygourmet_dish_tags (tagname)
        `);

      if (error) throw error;
      return (data || []).map(mapDishFromDb);
    } catch (e) {
      console.error("Failed to fetch dishes from Supabase", e);
      useLocalStorage = true;
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
      const { error: dishError } = await supabase
        .from('mygourmet_dishes')
        .insert([{
          id: newDish.id,
          name: newDish.name,
          image: newDish.image,
          rating: newDish.rating,
          recipelink: newDish.recipeLink,
          notes: newDish.notes,
          timescooked: newDish.timesCooked,
          lastcooked: newDish.lastCooked
        }]);

      if (dishError) throw dishError;

      if (newDish.ingredients.length > 0) {
        const ingredientsToInsert = newDish.ingredients.map(ing => ({
          dishid: newDish.id,
          name: ing.name,
          amount: ing.amount,
          unit: ing.unit
        }));
        const { error: ingError } = await supabase.from('mygourmet_ingredients').insert(ingredientsToInsert);
        if (ingError) throw ingError;
      }

      if (newDish.tags && newDish.tags.length > 0) {
        const tagsToInsert = newDish.tags.map(tag => ({
          dishid: newDish.id,
          tagname: tag
        }));
        const { error: tagError } = await supabase.from('mygourmet_dish_tags').insert(tagsToInsert);
        if (tagError) throw tagError;
      }

      return newDish as Dish;
    } catch (e) {
      console.error("Failed to add dish to Supabase", e);
      useLocalStorage = true;
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
      const { error: dishError } = await supabase
        .from('mygourmet_dishes')
        .update({
          name: dish.name,
          image: dish.image,
          rating: dish.rating,
          recipelink: dish.recipeLink,
          notes: dish.notes,
          timescooked: dish.timesCooked,
          lastcooked: dish.lastCooked
        })
        .eq('id', dish.id);

      if (dishError) throw dishError;

      await supabase.from('mygourmet_ingredients').delete().eq('dishid', dish.id);
      if (dish.ingredients.length > 0) {
        const ingredientsToInsert = dish.ingredients.map(ing => ({
          dishid: dish.id,
          name: ing.name,
          amount: ing.amount,
          unit: ing.unit
        }));
        await supabase.from('mygourmet_ingredients').insert(ingredientsToInsert);
      }

      await supabase.from('mygourmet_dish_tags').delete().eq('dishid', dish.id);
      if (dish.tags && dish.tags.length > 0) {
        const tagsToInsert = dish.tags.map(tag => ({
          dishid: dish.id,
          tagname: tag
        }));
        await supabase.from('mygourmet_dish_tags').insert(tagsToInsert);
      }

      return dish;
    } catch (e) {
      console.error("Failed to update dish in Supabase", e);
      useLocalStorage = true;
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
    try {
      const dishes = await dataService.getDishes();
      const dish = dishes.find(d => d.id === dishId);
      if (!dish) return;

      const updatedDish: Dish = {
        ...dish,
        timesCooked: Math.max(0, (dish.timesCooked || 0) + (increment ? 1 : -1)),
        lastCooked: increment ? new Date().toISOString() : dish.lastCooked
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
      useLocalStorage = true;
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

      const plansMap = new Map<string, WeeklyPlan>();
      (data || []).forEach((row: any) => {
        const id = `${row.year}-${row.week}`;
        if (!plansMap.has(id)) {
          plansMap.set(id, { id, year: row.year, week: row.week, dishIds: [] });
        }
        if (row.dishid) {
          plansMap.get(id)!.dishIds.push(row.dishid);
        }
      });
      return Array.from(plansMap.values());
    } catch (e) {
      console.error("Failed to get plans", e);
      useLocalStorage = true;
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
      }
      localStore.set(LS_KEYS.PLANS, plans);
      await dataService.updateDishCookingStats(dishId, true);
      return;
    }

    try {
      const { error } = await supabase.from('mygourmet_menu_plans').insert([{ year, week, dishid: dishId }]);
      if (error) throw error;
      await dataService.updateDishCookingStats(dishId, true);
    } catch (e) {
      console.error("Failed to add to plan", e);
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
        }
        localStore.set(LS_KEYS.PLANS, plans);
      }
      await dataService.updateDishCookingStats(dishId, false);
      return;
    }

    try {
      const { error } = await supabase
        .from('mygourmet_menu_plans')
        .delete()
        .match({ year, week, dishid: dishId });

      if (error) throw error;
      await dataService.updateDishCookingStats(dishId, false);
    } catch (e) {
      console.error("Failed to remove from plan", e);
    }
  },

  getCategories: async (): Promise<Category[]> => {
    if (useLocalStorage) {
      const stored = localStore.get<Category[]>(LS_KEYS.CATEGORIES);
      return (stored && stored.length > 0) ? stored : [];
    }

    try {
      const { data, error } = await supabase
        .from('mygourmet_categories')
        .select('id, name, sortOrder:sortorder')
        .order('sortorder', { ascending: true });

      if (error) {
        console.error("Error fetching categories:", error);
        throw error;
      }

      if (!data || data.length === 0) return [];
      return data;
    } catch (e) {
      console.error("Failed to get categories", e);
      useLocalStorage = true;
      const stored = localStore.get<Category[]>(LS_KEYS.CATEGORIES);
      return (stored && stored.length > 0) ? stored : [];
    }
  },

  saveCategories: async (categories: Category[]): Promise<void> => {
    if (useLocalStorage) {
      localStore.set(LS_KEYS.CATEGORIES, categories);
      return;
    }

    try {
      // Fetch existing categories from DB
      const { data: existingCategories, error: fetchError } = await supabase.from('mygourmet_categories').select('id, name, sortorder');
      if (fetchError) throw fetchError;

      const existingIds = existingCategories.map(c => c.id);
      const incomingIds = categories.map(c => c.id);

      // 1. Delete categories that are no longer in the list
      const toDelete = existingIds.filter(id => !incomingIds.includes(id));
      if (toDelete.length > 0) {
        const { error: deleteError } = await supabase.from('mygourmet_categories').delete().in('id', toDelete);
        if (deleteError) throw deleteError;
      }

      // 2. Insert new categories
      const toInsert = categories
        .filter(c => !existingIds.includes(c.id))
        .map(c => ({ id: c.id, name: c.name, sortorder: c.sortOrder }));
      if (toInsert.length > 0) {
        const { error: insertError } = await supabase.from('mygourmet_categories').insert(toInsert);
        if (insertError) throw insertError;
      }

      // 3. Update existing categories
      const toUpdate = categories
        .filter(c => existingIds.includes(c.id))
        .map(c => {
          const existing = existingCategories.find(ec => ec.id === c.id);
          // Only update if name or sort order has actually changed
          if (existing && (existing.name !== c.name || existing.sortorder !== c.sortOrder)) {
            return { id: c.id, name: c.name, sortorder: c.sortOrder };
          }
          return null;
        })
        .filter(Boolean) as { id: string; name: string; sortorder: number }[];

      if (toUpdate.length > 0) {
        for (const cat of toUpdate) {
            const { error: updateError } = await supabase
                .from('mygourmet_categories')
                .update({ name: cat.name, sortorder: cat.sortorder })
                .eq('id', cat.id);
            if (updateError) {
                console.error(`Error updating category ${cat.id}:`, updateError);
                throw updateError; // stop on first error
            }
        }
      }

    } catch (e) {
      console.error("Failed to save categories", e);
      // Revert to local storage on failure
      useLocalStorage = true;
      localStore.set(LS_KEYS.CATEGORIES, categories);
    }
  },

  getShoppingList: async (year: number, week: number): Promise<Ingredient[]> => {
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
    if (!url) {
      return { success: false, error: "URL is required." };
    }

    const targetUrl = url.replace(/^(https?:\/\/)/, '');
    const proxyUrl = `https://cors.bivort.de/${targetUrl}`;

    try {
      const response = await fetch(proxyUrl, {
         headers: {
           'X-Requested-With': 'XMLHttpRequest',
           'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
           'Origin': 'https://mygourmet.bivort.de'
         }
      });

      if (response.status === 403) {
        return { success: false, error: "Zugriff verweigert (403). Die Ziel-Webseite (z.B. Chefkoch.de) blockiert möglicherweise die Anfrage des Proxy-Servers. Versuche es später erneut oder trage die Daten manuell ein." };
      }
      if (!response.ok) {
        throw new Error(`Proxy-Anfrage fehlgeschlagen mit Status: ${response.status}`);
      }

      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      let name = '';
      let ingredients: Ingredient[] = [];
      let notes = '';
      let image = '';
      let tags: string[] = [];

      if (url.includes('cookidoo.de')) {
        console.log("Cookidoo URL detected, adding 'Thermomix' tag.");
        tags.push('Thermomix');
      }

      const jsonLdScript = doc.querySelector('script[type="application/ld+json"]');
      if (jsonLdScript) {
        console.log("Found JSON-LD script, parsing data...");
        try {
          const jsonLd = JSON.parse(jsonLdScript.textContent || '{}');
          name = jsonLd.name || '';

          let imageUrl = jsonLd.image;
          if (Array.isArray(imageUrl)) {
            imageUrl = imageUrl[0];
          }
          if (typeof imageUrl === 'object' && imageUrl !== null) {
            imageUrl = imageUrl.url;
          }

          if (imageUrl && typeof imageUrl === 'string') {
            image = await imageUrlToBase64(imageUrl);
          }

          if (jsonLd.recipeIngredient && Array.isArray(jsonLd.recipeIngredient)) {
            ingredients = jsonLd.recipeIngredient.map((ingString: string) => {
              const cleanedString = ingString.replace(/&frac12;/g, '1/2').replace(/&frac14;/g, '1/4').replace(/&frac34;/g, '3/4');
              const parts = cleanedString.split(' ').filter(p => p); // filter out empty strings
              let amount = '';
              let unit = '';
              let ingredientName = '';

              if (parts.length > 1 && (String(parts[0]).match(/^[\d.,\/]+$/) || String(parts[1]).match(/^[\d.,\/]+$/))) {
                  amount = parts[0];
                  unit = parts.length > 2 && !String(parts[1]).match(/^[\d.,\/]+$/) ? parts[1] : '';
                  ingredientName = unit ? parts.slice(2).join(' ') : parts.slice(1).join(' ');
              } else {
                  ingredientName = cleanedString;
              }
              
              return {
                id: generateId(),
                amount: amount.trim(),
                unit: unit.trim(),
                name: ingredientName.trim()
              };
            });
          }
          
          if (jsonLd.recipeInstructions) {
            if (Array.isArray(jsonLd.recipeInstructions)) {
              notes = jsonLd.recipeInstructions.map((step: any) => step.text || step).join('\n');
            } else if (typeof jsonLd.recipeInstructions === 'object' && jsonLd.recipeInstructions.text) {
              notes = jsonLd.recipeInstructions.text;
            } else {
              notes = jsonLd.recipeInstructions;
            }
          }
        } catch(e) {
            console.error("Error parsing JSON-LD:", e);
        }
      }

      // Fallback strategies if JSON-LD is missing or incomplete
      if (!name) {
        console.log("No recipe name in JSON-LD, trying other selectors...");
        name = doc.querySelector('h1.page-title, .page-title, [property="og:title"]')?.getAttribute('content') || doc.querySelector('h1')?.textContent?.trim() || '';
        if (name) {
          name = name.split(' - ')[0];
        }
      }
      
      if (ingredients.length === 0) {
        console.log("No ingredients in JSON-LD, trying to scrape table...");
        const ingredientRows = doc.querySelectorAll('.ingredients tr, table[class*="ingredients"] tr');
        ingredientRows.forEach(row => {
            const amountCell = row.querySelector('td:first-child');
            const nameCell = row.querySelector('td:nth-child(2)');
            
            if (amountCell && nameCell) {
                const amountText = amountCell.textContent?.trim().replace(/\s*\n\s*/g, ' ').trim() || '';
                const nameText = nameCell.textContent?.trim() || '';

                if (nameText) {
                    const match = amountText.match(/^([\d.,\/\s-–]+(?:[\d.,\/\s-–]+)*)?\s*(.*)$/);
                    let amount = match?.[1]?.trim() || '';
                    let unit = match?.[2]?.trim() || '';

                    if (!amount && unit) {
                    } else if (amount && !unit) {
                        const parts = amount.split(/\s+/);
                        if (parts.length > 1 && isNaN(parseFloat(parts[parts.length-1]))) {
                            unit = parts.pop() + (unit ? ` ${unit}` : '');
                            amount = parts.join(' ');
                        }
                    }
                    ingredients.push({
                        id: generateId(),
                        amount: amount,
                        unit: unit,
                        name: nameText
                    });
                }
            }
        });
      }

      if (!notes) {
        console.log("No instructions in JSON-LD, trying other selectors...");
        const instructionsDiv = doc.querySelector('#rezept-zubereitung, [class*="instructions"], [class*="preparation"]');
        notes = instructionsDiv?.innerText?.trim() || '';
      }

      if (!image) {
        console.log("No image from JSON-LD, trying meta tags...");
        const metaImage = doc.querySelector('meta[property="og:image"]')?.getAttribute('content');
        if (metaImage) {
            image = await imageUrlToBase64(metaImage);
        }
      }
      
      if (!name && ingredients.length === 0) {
         console.error("Could not parse recipe data from website.");
         return { success: false, error: "Rezept-Daten konnten nicht automatisch von der Webseite gelesen werden. Bitte manuell eingeben." };
      }

      console.log("Final scraped data being returned:", { name, ingredients, notes, image, tags });

      return {
        success: true,
        name: name,
        ingredients: ingredients,
        notes: notes,
        image: image,
        tags: tags
      };

    } catch (e) {
      console.error(`Fehler beim Laden über den Proxy ${proxyUrl}`, e);
      return { success: false, error: `Dein Proxy-Server unter ${proxyUrl} ist nicht erreichbar oder funktioniert nicht wie erwartet. Details: ${(e as Error).message}` };
    }
  }
};
