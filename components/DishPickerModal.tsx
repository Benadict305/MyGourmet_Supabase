import React, { useState } from 'react';
import { Dish } from '../types';
import { Icons } from './ui/Icon';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  dishes: Dish[];
  onSelect: (dishId: string) => void;
}

const DishPickerModal: React.FC<Props> = ({ isOpen, onClose, dishes, onSelect }) => {
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const filtered = dishes.filter(d => d.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl w-full max-w-lg h-[60vh] flex flex-col shadow-2xl animate-in zoom-in-95">
        <div className="p-4 border-b flex items-center gap-3">
           <Icons.Search className="text-slate-400" />
           <input 
             autoFocus
             className="flex-1 outline-none text-slate-800 placeholder:text-slate-400"
             placeholder="Gericht suchen..."
             value={search}
             onChange={e => setSearch(e.target.value)}
           />
           <button onClick={onClose}><Icons.X className="text-slate-400 hover:text-slate-700" /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-2">
           {filtered.map(dish => (
             <button
               key={dish.id}
               onClick={() => { onSelect(dish.id); onClose(); }}
               className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg text-left transition-colors"
             >
                <div className="h-10 w-10 rounded bg-slate-200 overflow-hidden flex-shrink-0">
                  {dish.image && <img src={dish.image} className="w-full h-full object-cover" />}
                </div>
                <span className="font-medium text-slate-700">{dish.name}</span>
             </button>
           ))}
           {filtered.length === 0 && (
             <p className="text-center text-slate-400 mt-4">Kein Gericht gefunden.</p>
           )}
        </div>
      </div>
    </div>
  );
};

export default DishPickerModal;