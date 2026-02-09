import React from 'react';
import { Ingredient } from '../types';
import { Icons } from './ui/Icon';

interface Props {
  ingredients: Ingredient[];
  isOpen: boolean;
  onClose: () => void;
  title: string;
}

const ShoppingListModal: React.FC<Props> = ({ ingredients, isOpen, onClose, title }) => {
  if (!isOpen) return null;

  const handleShare = async () => {
    // Format list as text
    const textList = ingredients
      .map(ing => `- ${ing.amount} ${ing.unit} ${ing.name}`)
      .join('\n');
    
    const shareData = {
      title: `Einkaufsliste ${title}`,
      text: `Einkaufsliste für ${title}:\n\n${textList}`,
    };

    try {
      if (navigator.share) {
        // Native Mobile Share Sheet
        await navigator.share(shareData);
      } else {
        // Fallback for Desktop: Copy to clipboard
        await navigator.clipboard.writeText(shareData.text);
        alert('Einkaufsliste wurde in die Zwischenablage kopiert!');
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl animate-in zoom-in-95">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <Icons.ShoppingCart className="text-primary-600" size={20}/>
            Einkaufsliste ({title})
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <Icons.X size={20} />
          </button>
        </div>
        
        <div className="overflow-y-auto p-4 flex-1">
          {ingredients.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <p>Nichts zu kaufen.</p>
              <p className="text-sm">Füge Gerichte zum Menüplan hinzu.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {ingredients.map((ing, idx) => (
                <li key={`${ing.id}-${idx}`} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-100 transition-colors">
                  <div className="h-5 w-5 rounded border border-slate-300 flex items-center justify-center">
                    {/* Fake checkbox appearance */}
                  </div>
                  <div className="flex-1 flex justify-between">
                     <span className="text-slate-800">{ing.name}</span>
                     <span className="text-slate-500 font-medium">{ing.amount} {ing.unit}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="p-4 border-t bg-slate-50 rounded-b-xl flex justify-between gap-3">
           {ingredients.length > 0 && (
             <button
               onClick={handleShare}
               className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 active:bg-slate-100 transition-colors"
             >
               {navigator.share ? <Icons.Share size={16} /> : <Icons.Copy size={16} />}
               {navigator.share ? 'Teilen / Google Notizen' : 'Kopieren'}
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