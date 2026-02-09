import React from 'react';
import { Dish } from '../types';
import { Icons } from './ui/Icon';

interface DishCardProps {
  dish: Dish;
  onClick: () => void;
  onAddToMenu: (e: React.MouseEvent) => void;
}

const DishCard: React.FC<DishCardProps> = ({ dish, onClick, onAddToMenu }) => {
  return (
    <div 
      onClick={onClick}
      className="group relative bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer flex flex-col h-full"
    >
      <div className="relative h-40 w-full overflow-hidden bg-slate-100">
        {dish.image ? (
          <img 
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
          <span>{dish.timesCooked}x gekocht</span>
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