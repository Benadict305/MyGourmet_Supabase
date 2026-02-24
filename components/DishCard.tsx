import React from 'react';
import { Dish } from '../types';
import { Icons } from './ui/Icon';
import LazyImage from './LazyImage';

interface DishCardProps {
  dish: Dish;
  onClick: () => void;
  onAddToMenu: (e: React.MouseEvent) => void;
}

// Helper function to get ISO week number and year
const getWeekAndYear = (date: Date): { week: number; year: number } => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNumber = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return { week: weekNumber, year: d.getUTCFullYear() };
};

const DishCard: React.FC<DishCardProps> = ({ dish, onClick, onAddToMenu }) => {
  
  const renderLastCooked = () => {
    if (!dish.lastCooked) return null;
    
    const { week, year } = getWeekAndYear(new Date(dish.lastCooked));
    const yearShort = String(year).slice(-2);
    const weekPadded = String(week).padStart(2, '0');
    
    return `, zuletzt KW${weekPadded}/${yearShort}`;
  }

  return (
    <div 
      onClick={onClick}
      className="group relative bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer flex flex-col h-full"
    >
      <div className="relative h-40 w-full overflow-hidden bg-slate-100">
        {dish.image ? (
          <LazyImage 
            src={dish.image} 
            alt={dish.name} 
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-slate-300">
            <Icons.Utensils size={48} />
          </div>
        )}
        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-medium text-slate-700 flex items-center gap-1 shadow-sm">
           <Icons.Star size={12} className="text-yellow-400 fill-yellow-400" />
           {dish.rating}
        </div>
      </div>
      
      <div className="p-4 flex flex-col flex-grow">
        <h3 className="font-semibold text-slate-900 line-clamp-1 mb-1">{dish.name}</h3>
        <div className="flex items-center gap-2 text-slate-500 text-xs mt-auto">
          <Icons.Clock size={12} />
          <span>
            {dish.timesCooked}x gekocht
            {dish.timesCooked > 0 && renderLastCooked()}
          </span>
        </div>
      </div>

      <button
        onClick={onAddToMenu}
        className="absolute bottom-3 right-3 p-2 bg-primary-100 text-primary-600 rounded-full hover:bg-primary-600 hover:text-white transition-colors"
        title="Zum nächsten Menüplan hinzufügen"
      >
        <Icons.Calendar size={18} />
      </button>
    </div>
  );
};

export default DishCard;
