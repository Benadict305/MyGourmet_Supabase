import React, { useState, useEffect } from 'react';
import { Dish, WeeklyPlan, CalendarWeek, Ingredient } from '../types';
import { dataService } from '../services/dataService';
import { Icons } from './ui/Icon';
import ShoppingListModal from './ShoppingListModal';

interface Props {
  dishes: Dish[];
  onAddDishRequest: (week: number, year: number) => void;
  onOpenDish: (dish: Dish) => void;
  onDishRemoved: () => void;
}

// Functions to get week numbers and calendar weeks remain unchanged...
const getWeekNumber = (d: Date): [number, number] => {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return [d.getUTCFullYear(), weekNo];
};

const getPlanWeeks = (): CalendarWeek[] => {
  const today = new Date();
  const dayOfWeek = today.getDay(); 
  const weeks: CalendarWeek[] = [];
  const showNextWeek = dayOfWeek >= 5 || dayOfWeek === 0;

  const addDays = (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  const currentWk = getWeekNumber(today);
  const nextWkDate = addDays(today, 7);
  const nextWk = getWeekNumber(nextWkDate);
  const prevWkDate1 = addDays(today, -7);
  const prevWk1 = getWeekNumber(prevWkDate1);
  const prevWkDate2 = addDays(today, -14);
  const prevWk2 = getWeekNumber(prevWkDate2);

  if (showNextWeek) {
    weeks.push({ week: nextWk[1], year: nextWk[0], label: 'Nächste Woche', isNext: true, isCurrent: false, isPast: false });
  }
  
  weeks.push({ week: currentWk[1], year: currentWk[0], label: 'Diese Woche', isNext: false, isCurrent: true, isPast: false });
  weeks.push({ week: prevWk1[1], year: prevWk1[0], label: 'Letzte Woche', isNext: false, isCurrent: false, isPast: true });
  weeks.push({ week: prevWk2[1], year: prevWk2[0], label: `KW ${prevWk2[1]}`, isNext: false, isCurrent: false, isPast: true });

  return weeks;
};

const MenuPlanView: React.FC<Props> = ({ dishes, onAddDishRequest, onOpenDish, onDishRemoved }) => {
  const [weeks, setWeeks] = useState<CalendarWeek[]>([]);
  const [plans, setPlans] = useState<WeeklyPlan[]>([]);
  const [shoppingListOpen, setShoppingListOpen] = useState(false);
  const [activeShoppingWeek, setActiveShoppingWeek] = useState<{year: number, week: number} | null>(null);
  const [shoppingListIngredients, setShoppingListIngredients] = useState<Ingredient[]>([]);
  const [dishesWithoutIngredients, setDishesWithoutIngredients] = useState<string[]>([]);

  const fetchPlans = async () => {
    try {
      const p = await dataService.getPlans();
      setPlans(p);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    setWeeks(getPlanWeeks());
    fetchPlans();
  }, [dishes]);

  const getDishesForWeek = (year: number, week: number): Dish[] => {
    const plan = plans.find(p => p.id === `${year}-${week}` || (p.year === year && p.week === week));
    if (!plan) return [];
    return plan.dishIds.map(id => dishes.find(d => d.id === id)).filter(Boolean) as Dish[];
  };

  const removeDish = async (e: React.MouseEvent, year: number, week: number, dishId: string) => {
    e.stopPropagation();
    try {
      await dataService.removeDishFromPlan(year, week, dishId);
      await fetchPlans();
      onDishRemoved();
    } catch (err) {
      alert("Fehler beim Entfernen");
    }
  };

  const openShoppingList = async (year: number, week: number) => {
    setActiveShoppingWeek({ year, week });
    setShoppingListOpen(true);

    const weekDishes = getDishesForWeek(year, week);
    const dishesMissingIngredients = weekDishes
      .filter(d => !d.ingredients || d.ingredients.length === 0)
      .map(d => d.name);
      
    setDishesWithoutIngredients(dishesMissingIngredients);
    
    try {
      const ingredients = await dataService.getShoppingList(year, week);
      setShoppingListIngredients(ingredients);
    } catch(e) {
      console.error(e);
      setShoppingListIngredients([]);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      {weeks.map((wk) => {
        const weekDishes = getDishesForWeek(wk.year, wk.week);
        const isFull = weekDishes.length >= 5;

        return (
          <div key={`${wk.year}-${wk.week}`} className={`rounded-2xl border ${wk.isCurrent ? 'border-primary-200 bg-primary-50/30' : 'border-slate-200 bg-white'} shadow-sm overflow-hidden`}>
            <div className={`p-4 flex justify-between items-center ${wk.isCurrent ? 'bg-primary-50' : 'bg-slate-50'} border-b border-slate-100`}>
              <div>
                <h3 className={`font-bold text-lg ${wk.isCurrent ? 'text-primary-700' : 'text-slate-700'}`}>
                  {wk.label} <span className="text-sm font-normal text-slate-500 ml-1">(KW {wk.week})</span>
                </h3>
                <p className="text-xs text-slate-500">{weekDishes.length} / 5 Gerichte geplant</p>
              </div>
              <div className="flex gap-2">
                {weekDishes.length > 0 && (
                   <button 
                     onClick={() => openShoppingList(wk.year, wk.week)}
                     className="p-2 bg-white text-slate-600 rounded-lg border border-slate-200 hover:text-primary-600 hover:border-primary-200 transition-colors shadow-sm"
                     title="Einkaufsliste"
                   >
                     <Icons.ShoppingCart size={18} />
                   </button>
                )}
                {!isFull && (
                  <button 
                    onClick={() => onAddDishRequest(wk.week, wk.year)}
                    className="flex items-center gap-1 px-3 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 shadow-sm transition-colors"
                  >
                    <Icons.Plus size={16} /> <span className="hidden sm:inline">Hinzufügen</span>
                  </button>
                )}
              </div>
            </div>
            <div className="p-4">
              {weekDishes.length === 0 ? (
                <div className="text-center py-6 text-slate-400 border-2 border-dashed border-slate-100 rounded-xl">
                  <p className="text-sm">Noch keine Gerichte geplant.</p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {weekDishes.map(dish => (
                    <div
                      key={dish.id}
                      onClick={() => onOpenDish(dish)}
                      className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 shadow-sm group hover:border-primary-200 hover:shadow-md transition-all cursor-pointer relative min-w-0 max-w-full"
                    >
                       <div className="h-16 w-16 rounded-lg overflow-hidden flex-shrink-0 bg-slate-200">
                         {dish.image ? (
                           <img src={dish.image} alt="" className="w-full h-full object-cover" />
                         ) : <div className="w-full h-full flex items-center justify-center"><Icons.Utensils className="text-slate-400" /></div>}
                       </div>
                       <div className="flex-1 min-w-0 overflow-hidden">
                         <h4 className="font-medium text-slate-800 truncate">{dish.name}</h4>
                         <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                           <Icons.Star size={10} className="text-yellow-400 fill-yellow-400" /> {dish.rating}
                         </div>
                       </div>
                       <button
                         onClick={(e) => removeDish(e, wk.year, wk.week, dish.id)}
                         className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100 flex-shrink-0"
                         title="Aus Menü entfernen"
                       >
                         <Icons.X size={18} />
                       </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {activeShoppingWeek && (
        <ShoppingListModal 
          isOpen={shoppingListOpen}
          onClose={() => setShoppingListOpen(false)}
          ingredients={shoppingListIngredients}
          title={`KW ${activeShoppingWeek.week}`}
          dishesWithoutIngredients={dishesWithoutIngredients}
        />
      )}
    </div>
  );
};

export default MenuPlanView;
