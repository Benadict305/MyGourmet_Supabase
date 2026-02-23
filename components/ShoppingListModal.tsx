import React, { useState, useMemo } from 'react';
import { Ingredient } from '../types';
import { Icons } from './ui/Icon';

interface Props {
  ingredients: Ingredient[];
  isOpen: boolean;
  onClose: () => void;
  title: string;
  dishesWithoutIngredients?: string[];
}

const STAPLE_INGREDIENTS = [
  'salz',
  'pfeffer',
  'öl',
  'zucker',
  'mehl',
  'essig',
  'brühe',
  'senf',
  'honig',
  'butter',
  'zwiebel',
  'knoblauch',
];

const ShoppingListModal: React.FC<Props> = ({ ingredients, isOpen, onClose, title, dishesWithoutIngredients = [] }) => {
  const [checkedItems, setCheckedItems] = useState<string[]>([]);

  const { shoppingList, pantryList } = useMemo(() => {
    const ingredientsMap = new Map<string, Ingredient>();

    ingredients.forEach(ing => {
      const lowerCaseName = ing.name.toLowerCase().trim();
      if (lowerCaseName === 'wasser') return;

      const normalizedName = lowerCaseName.replace(/s$/, '').replace(/n$/, '');
      const unit = ing.unit?.toLowerCase().trim() || '';
      const key = `${normalizedName}-${unit}`;

      const existingIng = ingredientsMap.get(key);
      if (existingIng) {
        const currentAmount = parseFloat(existingIng.amount);
        const newAmount = parseFloat(ing.amount);
        if (!isNaN(currentAmount) && !isNaN(newAmount)) {
          existingIng.amount = (currentAmount + newAmount).toString();
        } else {
          ingredientsMap.set(`${key}-${Math.random()}`, { ...ing, name: ing.name.trim() });
        }
      } else {
        ingredientsMap.set(key, { ...ing, name: ing.name.trim() });
      }
    });

    const allIngredients = Array.from(ingredientsMap.values());
    const shoppingList: Ingredient[] = [];
    const pantryList: Ingredient[] = [];

    allIngredients.forEach(ing => {
      const normalizedName = ing.name.toLowerCase().trim().replace(/s$/, '').replace(/n$/, '');
      if (STAPLE_INGREDIENTS.includes(normalizedName)) {
        pantryList.push(ing);
      } else {
        shoppingList.push(ing);
      }
    });

    return {
      shoppingList: shoppingList.sort((a, b) => a.name.localeCompare(b.name)),
      pantryList: pantryList.sort((a, b) => a.name.localeCompare(b.name)),
    };
  }, [ingredients]);

  if (!isOpen) return null;

  const handleToggleChecked = (id: string) => {
    setCheckedItems(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleShare = async () => {
    let textList = ''
    if (dishesWithoutIngredients.length > 0) {
        textList += `ACHTUNG: Für folgende Gerichte fehlen die Zutaten:\n- ${dishesWithoutIngredients.join('\n- ')}\n\n`;
    }
    const mainList = shoppingList.map(ing => `- ${ing.amount} ${ing.unit || ''} ${ing.name}`).join('\n');
    const pantryListText = pantryList.map(ing => `- ${ing.amount} ${ing.unit || ''} ${ing.name} (ggf. im Vorrat)`).join('\n');
    textList += `${mainList}\n\nVorräte:\n${pantryListText}`;

    const shareData = {
      title: `Einkaufsliste ${title}`,
      text: `Einkaufsliste für ${title}:\n\n${textList}`,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.text);
        alert('Einkaufsliste wurde in die Zwischenablage kopiert!');
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  const renderListItem = (ing: Ingredient, idx: number, isPantry = false) => {
    const id = `${ing.id}-${idx}`;
    const isChecked = checkedItems.includes(id);
    return (
      <li 
        key={id} 
        onClick={() => handleToggleChecked(id)}
        className={`flex items-center gap-3 p-2 rounded-lg border border-transparent transition-colors cursor-pointer 
                    ${isChecked ? (isPantry ? 'bg-slate-50' : 'bg-slate-100') : 'hover:bg-slate-50 hover:border-slate-100'}`}
      >
        <div className={`h-5 w-5 rounded border flex items-center justify-center transition-colors 
                        ${isChecked ? 'bg-primary-600 border-primary-600' : 'border-slate-300'}`}>
          {isChecked && <Icons.Check size={14} className="text-white" />}
        </div>
        <div className="flex-1 flex justify-between">
           <span className={`text-slate-800 ${isChecked ? 'line-through text-slate-400' : ''} ${isPantry ? 'text-slate-500' : ''}`}>
             {ing.name} {isPantry && <span className="text-slate-400 text-xs">(ggf. im Vorrat)</span>}
           </span>
           <span className={`font-medium ${isChecked ? 'line-through text-slate-400' : isPantry ? 'text-slate-400' : 'text-slate-500'}`}>{ing.amount} {ing.unit}</span>
        </div>
      </li>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl animate-in zoom-in-95">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <Icons.ShoppingCart className="text-primary-600" size={20}/>
            Einkaufsliste ({title})
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><Icons.X size={20} /></button>
        </div>
        
        <div className="overflow-y-auto p-4 flex-1">
            {dishesWithoutIngredients.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-3 mb-4">
                    <div className="flex items-center gap-2 font-medium text-sm">
                        <Icons.AlertTriangle size={16} />
                        <span>Zutaten fehlen</span>
                    </div>
                    <p className="text-xs mt-1">
                        Für folgende Gerichte sind keine Zutaten hinterlegt und müssen manuell ergänzt werden:
                    </p>
                    <ul className="text-xs list-disc list-inside mt-1">
                        {dishesWithoutIngredients.map(name => <li key={name}>{name}</li>)}
                    </ul>
                </div>
            )}

          {shoppingList.length === 0 && pantryList.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <p>Nichts zu kaufen.</p>
              <p className="text-sm">Füge Gerichte zum Menüplan hinzu.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {shoppingList.map((ing, idx) => renderListItem(ing, idx))}
              {pantryList.length > 0 && shoppingList.length > 0 && (
                <div className="py-2">
                  <div className="h-px bg-slate-200"></div>
                </div>
              )}
              {pantryList.map((ing, idx) => renderListItem(ing, idx, true))}
            </ul>
          )}
        </div>

        <div className="p-4 border-t bg-slate-50 rounded-b-xl flex justify-between gap-3">
           {(shoppingList.length > 0 || pantryList.length > 0) && (
             <button
               onClick={handleShare}
               className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 active:bg-slate-100 transition-colors"
             >
               {navigator.share ? <Icons.Share size={16} /> : <Icons.Copy size={16} />}
               {navigator.share ? 'Teilen' : 'Kopieren'}
             </button>
           )}
           <button 
             onClick={onClose}
             className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 ml-auto"
           >
             Schließen
           </button>
        </div>
      </div>
    </div>
  );
};

export default ShoppingListModal;