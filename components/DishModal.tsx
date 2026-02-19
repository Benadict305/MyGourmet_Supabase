import React, { useState, useEffect, useRef } from 'react';
import { Dish, Ingredient } from '../types';
import { Icons } from './ui/Icon';
import { generateId, dataService } from '../services/dataService';

interface DishModalProps {
  dish: Dish | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (dish: Dish, closeModal?: boolean) => void;
  onDelete?: (dishId: string) => void;
  isNew?: boolean;
  categories?: string[];
}

const DishModal: React.FC<DishModalProps> = ({ dish, isOpen, onClose, onSave, onDelete, isNew = false, categories = [] }) => {
  const [isEditing, setIsEditing] = useState(isNew);
  const [editedDish, setEditedDish] = useState<Partial<Dish>>({});
  const [isFetchingRecipe, setIsFetchingRecipe] = useState(false);
  
  useEffect(() => {
    if (isOpen && dish) {
      setEditedDish(JSON.parse(JSON.stringify(dish)));
      setIsEditing(isNew);
    } else if (isOpen && isNew) {
      setEditedDish({
        name: '',
        rating: 0,
        ingredients: [],
        timesCooked: 0,
        notes: '',
        recipeLink: '',
        tags: ['Hauptgerichte'],
      });
      setIsEditing(true);
    }
  }, [isOpen, dish, isNew]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!editedDish.name) return;
    onSave(editedDish as Dish, true);
  };

  const handleDelete = () => {
    if (onDelete && dish?.id) {
      if (window.confirm('Möchtest du dieses Gericht wirklich unwiderruflich löschen?')) {
        onDelete(dish.id);
        onClose();
      }
    }
  };

  const updateField = (field: keyof Dish, value: any) => {
    setEditedDish(prev => ({ ...prev, [field]: value }));
  };

  const handleRatingChange = (rating: number) => {
    updateField('rating', rating);
    
    if (!isEditing) {
      const updatedDish = { ...editedDish, rating } as Dish;
      if (updatedDish.id && updatedDish.name) {
        onSave(updatedDish, false);
      }
    }
  };

  const toggleTag = (tag: string) => {
    const currentTags = editedDish.tags || [];
    if (currentTags.includes(tag)) {
      updateField('tags', currentTags.filter(t => t !== tag));
    } else {
      updateField('tags', [...currentTags, tag]);
    }
  };

  const handleIngredientChange = (id: string, field: keyof Ingredient, value: string) => {
    const updatedIngredients = editedDish.ingredients?.map(ing => 
      ing.id === id ? { ...ing, [field]: value } : ing
    ) || [];
    updateField('ingredients', updatedIngredients);
  };

  const addIngredient = () => {
    const newIng: Ingredient = {
      id: generateId(),
      name: '',
      amount: '',
      unit: ''
    };
    updateField('ingredients', [...(editedDish.ingredients || []), newIng]);
  };

  const removeIngredient = (id: string) => {
    updateField('ingredients', editedDish.ingredients?.filter(i => i.id !== id) || []);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          const maxWidth = 800;
          const maxHeight = 600;

          let { width, height } = img;

          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          ctx?.drawImage(img, 0, 0, width, height);
          const resizedBase64 = canvas.toDataURL('image/jpeg', 0.8);
          updateField('image', resizedBase64);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

 const handleFetchRecipe = async () => {
    const url = editedDish.recipeLink;
    if (!url) return;

    setIsFetchingRecipe(true);
    try {
      const recipeData = await dataService.fetchRecipeData(url);

      if (recipeData && recipeData.success) {
        // Use a functional update to ensure we're working with the latest state
        setEditedDish(prevDish => {
          const newTags = recipeData.tags || [];
          const existingTags = prevDish.tags || [];
          const mergedTags = [...new Set([...existingTags, ...newTags])];

          return {
            ...prevDish,
            name: prevDish.name || recipeData.name || '',
            ingredients: (prevDish.ingredients && prevDish.ingredients.length > 0) ? prevDish.ingredients : recipeData.ingredients || [],
            notes: prevDish.notes || recipeData.notes || '',
            image: prevDish.image || recipeData.image || '',
            tags: mergedTags,
          };
        });

        alert('Rezeptdaten erfolgreich geladen!');

      } else {
        throw new Error(recipeData.error || 'Unbekannter Fehler beim Verarbeiten des Rezepts');
      }
    } catch (error) {
      console.error('Failed to fetch recipe:', error);
      alert(`Fehler beim Laden des Rezepts: ${(error as Error).message}`);
    } finally {
      setIsFetchingRecipe(false);
    }
  };

  const renderStars = (currentRating: number, interactive: boolean) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            onClick={() => handleRatingChange(star)}
            className={`${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}
            title={interactive ? `Mit ${star} Sternen bewerten` : undefined}
          >
            <Icons.Star
              size={interactive ? 24 : 20}
              className={`${
                star <= currentRating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
        
        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-white sticky top-0 z-10">
          <h2 className="text-xl font-bold text-slate-800">
            {isNew ? 'Neues Gericht' : (isEditing ? 'Gericht bearbeiten' : editedDish.name)}
          </h2>
          <div className="flex gap-2">
            {!isEditing && (
              <button 
                onClick={() => setIsEditing(true)}
                className="p-2 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded-full transition-colors"
              >
                <Icons.Edit2 size={20} />
              </button>
            )}
            <button 
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
            >
              <Icons.X size={24} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-6 flex-1">
          
          <div className="mb-6 relative h-48 sm:h-64 bg-slate-100 rounded-xl overflow-hidden group">
            {editedDish.image ? (
              <img src={editedDish.image} alt="Dish" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                <Icons.Image size={48} className="mb-2 opacity-50"/>
                <span className="text-sm">Kein Bild vorhanden</span>
              </div>
            )}
            
            {isEditing && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                 <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleImageUpload}
                />
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white text-slate-900 px-4 py-2 rounded-full font-medium shadow-lg hover:bg-slate-50"
                >
                  Foto ändern
                </button>
              </div>
            )}
          </div>

          <div className="space-y-6">
            
            <div className="grid gap-4">
              {isEditing ? (
                 <div className="space-y-2">
                   <label className="text-sm font-medium text-slate-700">Bezeichnung</label>
                   <input
                    type="text"
                    value={editedDish.name || ''}
                    onChange={(e) => updateField('name', e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                    placeholder="Name des Gerichts"
                   />
                 </div>
              ) : null}

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 block">Bewertung</label>
                  {renderStars(editedDish.rating || 0, true)}
                </div>
                {!isEditing && (
                   <div className="text-sm text-slate-500 text-right">
                     <div className="font-medium">{editedDish.timesCooked}x gekocht</div>
                     {editedDish.lastCooked && (
                       <div className="text-xs">Zuletzt: {new Date(editedDish.lastCooked).toLocaleDateString()}</div>
                     )}
                   </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Icons.Tag size={16} /> Kategorien
              </label>
              {isEditing ? (
                <div className="flex flex-wrap gap-2">
                  {categories.map(category => (
                    <button
                      key={category}
                      onClick={() => toggleTag(category)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        editedDish.tags?.includes(category)
                          ? 'bg-primary-100 text-primary-700 border-primary-200'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {editedDish.tags && editedDish.tags.length > 0 ? (
                    editedDish.tags.map(tag => (
                      <span key={tag} className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200">
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-400 text-sm italic">Keine Kategorien</span>
                  )}
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
               <div className="space-y-2">
                 <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <Icons.ExternalLink size={16} /> Rezept Link
                 </label>
                 {isEditing ? (
                   <div className="flex gap-2">
                     <input
                      type="url"
                      value={editedDish.recipeLink || ''}
                      onChange={(e) => updateField('recipeLink', e.target.value)}
                      className="flex-1 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                      placeholder="https://..."
                     />
                     <button
                       onClick={handleFetchRecipe}
                       disabled={isFetchingRecipe || !editedDish.recipeLink?.includes('cookidoo.de')}
                       className="px-3 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                     >
                       {isFetchingRecipe ? (
                         <Icons.Clock size={14} className="animate-spin" />
                       ) : (
                         <Icons.Plus size={14} />
                       )}
                       {isFetchingRecipe ? 'Lade...' : 'Laden'}
                     </button>
                   </div>
                 ) : (
                   editedDish.recipeLink ? (
                     <a href={editedDish.recipeLink} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline break-words block text-sm max-w-full" title={editedDish.recipeLink}>
                       {editedDish.recipeLink}
                     </a>
                   ) : <span className="text-slate-400 italic text-sm">Kein Link</span>
                 )}
               </div>

               <div className="space-y-2">
                 <label className="text-sm font-medium text-slate-700">Notizen</label>
                 {isEditing ? (
                   <textarea
                    value={editedDish.notes || ''}
                    onChange={(e) => updateField('notes', e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm h-20 resize-none"
                    placeholder="Tipps & Tricks..."
                   />
                 ) : (
                   <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 min-h-[3rem]">
                     {editedDish.notes || <span className="italic text-slate-400">Keine Notizen</span>}
                   </p>
                 )}
               </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-slate-800">Zutaten</h3>
                {isEditing && (
                  <button 
                    onClick={addIngredient}
                    className="text-xs bg-primary-50 text-primary-700 px-2 py-1 rounded-md hover:bg-primary-100 font-medium flex items-center gap-1"
                  >
                    <Icons.Plus size={14}/> Zutat
                  </button>
                )}
              </div>
              
              <div className="space-y-2">
                {editedDish.ingredients && editedDish.ingredients.length > 0 ? (
                  editedDish.ingredients.map((ing) => (
                    <div key={ing.id} className="flex items-center gap-2 text-sm">
                      {isEditing ? (
                        <>
                          <input
                            type="text"
                            placeholder="Menge"
                            value={ing.amount}
                            onChange={(e) => handleIngredientChange(ing.id, 'amount', e.target.value)}
                            className="w-20 p-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-primary-500 outline-none"
                          />
                           <input
                            type="text"
                            placeholder="Einheit"
                            value={ing.unit}
                            onChange={(e) => handleIngredientChange(ing.id, 'unit', e.target.value)}
                            className="w-16 p-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-primary-500 outline-none"
                          />
                          <input
                            type="text"
                            placeholder="Zutat"
                            value={ing.name}
                            onChange={(e) => handleIngredientChange(ing.id, 'name', e.target.value)}
                            className="flex-1 p-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-primary-500 outline-none"
                          />
                          <button 
                            onClick={() => removeIngredient(ing.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
                          >
                            <Icons.Trash2 size={16} />
                          </button>
                        </>
                      ) : (
                        <div className="flex items-center justify-between w-full p-2 bg-slate-50 rounded-lg border border-slate-100">
                          <span className="font-medium text-slate-700">{ing.amount} {ing.unit}</span>
                          <span className="text-slate-600">{ing.name}</span>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  !isEditing && <p className="text-slate-400 italic text-sm">Keine Zutaten hinterlegt.</p>
                )}
              </div>
            </div>

          </div>
        </div>

        {isEditing && (
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between gap-3">
             {!isNew ? (
               <button
                 onClick={handleDelete}
                 className="px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg font-medium transition-colors flex items-center gap-2"
               >
                 <Icons.Trash2 size={16} /> <span className="hidden sm:inline">Löschen</span>
               </button>
             ) : <div />} 

             <div className="flex gap-3">
               <button
                 onClick={() => isNew ? onClose() : setIsEditing(false)}
                 className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors"
               >
                 Abbrechen
               </button>
               <button
                 onClick={handleSave}
                 disabled={!editedDish.name}
                 className="px-6 py-2 bg-primary-600 text-white font-medium rounded-lg shadow-sm hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
               >
                 Speichern
               </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DishModal;
