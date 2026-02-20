import React, { useState, useEffect, useRef } from 'react';
import { Dish, ViewTab } from './types';
import { dataService } from './services/dataService';
import { Icons } from './components/ui/Icon';
import DishCard from './components/DishCard';
import DishModal from './components/DishModal';
import MenuPlanView from './components/MenuPlanView';
import DishPickerModal from './components/DishPickerModal';
import CategoryModal from './components/CategoryModal';
import BatchImportModal from './components/BatchImportModal';

console.log("App.tsx module loaded");

type SortOption = 'name' | 'rating' | 'lastCooked';
const sortOptions: SortOption[] = ['name', 'rating', 'lastCooked'];


const App: React.FC = () => {
  console.log("App component rendering...");
  
  const [activeTab, setActiveTab] = useState<ViewTab>('dishes');
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('name');

  // Category State
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['Hauptgerichte']);
  const [showRarelyCooked, setShowRarelyCooked] = useState(false);
  
  // Drag State
  const [draggedCategory, setDraggedCategory] = useState<string | null>(null);
  
  // Touch Drag Refs
  const touchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartCoord = useRef<{x: number, y: number} | null>(null);

  // Swipe Refs
  const swipeStartX = useRef<number | null>(null);
  const swipeStartY = useRef<number | null>(null);
  
  // Dish Modal State
  const [isDishModalOpen, setDishModalOpen] = useState(false);
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [isCreatingNewDish, setIsCreatingNewDish] = useState(false);
  const [isBatchImportModalOpen, setBatchImportModalOpen] = useState(false);

  // Menu Picker State
  const [isPickerOpen, setPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<{year: number, week: number} | null>(null);

  // Category Modal State
  const [isCategoryModalOpen, setCategoryModalOpen] = useState(false);

  // Load data
  const refreshDishes = async () => {
    try {
      console.log('Refreshing dishes...');
      const data = await dataService.getDishes();
      console.log('Loaded dishes:', data.length, 'dishes');
      setDishes(data);
    } catch (error) {
      console.error("Failed to load dishes", error);
    }
  };

  const loadInitialData = async () => {
    setLoading(true);
    setAppError(null);
    
    try {
      const online = await dataService.checkBackendConnection();
      setIsOffline(!online);

      await Promise.all([
        refreshDishes(),
        dataService.getCategories().then(setCategories)
      ]);
    } catch (e: any) {
      console.error("Critical Init Error", e);
      setAppError("Die App konnte nicht initialisiert werden. Bitte lade die Seite neu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // -- Handlers --

  const handleCreateDish = () => {
    setSelectedDish(null);
    setIsCreatingNewDish(true);
    setDishModalOpen(true);
  };

  const handleOpenDish = (dish: Dish) => {
    setSelectedDish(dish);
    setIsCreatingNewDish(false);
    setDishModalOpen(true);
  };

  const handleSaveDish = async (dishData: Dish, closeModal: boolean = true) => {
    try {
      if (isCreatingNewDish) {
        await dataService.addDish(dishData);
      } else {
        await dataService.updateDish(dishData);
      }
      
      await refreshDishes();
      
      if (closeModal) {
        setDishModalOpen(false);
      } else {
        setSelectedDish(dishData);
      }
    } catch (error) {
      alert("Fehler beim Speichern: " + error);
    }
  };

  const handleDeleteDish = async (dishId: string) => {
    try {
      await dataService.deleteDish(dishId);
      await refreshDishes();
    } catch (error) {
      alert("Fehler beim Löschen: " + error);
    }
  };

  const handleAddToNextWeek = async (e: React.MouseEvent, dishId: string) => {
    e.stopPropagation();
    const today = new Date();
    const d = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const currentWeekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    const currentYear = d.getUTCFullYear();
    
    const day = today.getDay();
    const isLateWeek = day >= 5 || day === 0;
    const targetWeek = isLateWeek ? currentWeekNo + 1 : currentWeekNo;
    
    try {
      await dataService.addDishToPlan(currentYear, targetWeek, dishId);
      alert(`Gericht zur KW ${targetWeek} hinzugefügt!`);
    } catch (error) {
      alert("Fehler beim Hinzufügen: " + error);
    }
  };

  const handleAddDishFromMenu = (week: number, year: number) => {
    setPickerTarget({ week, year });
    setPickerOpen(true);
  };

  const handlePickerSelect = async (dishId: string) => {
    if (pickerTarget) {
      try {
        await dataService.addDishToPlan(pickerTarget.year, pickerTarget.week, dishId);
        await refreshDishes();
      } catch (error) {
        alert("Fehler beim Hinzufügen: " + error);
      }
    }
  };

  const handleSaveCategories = async (newCategories: string[]) => {
    try {
      setCategories(newCategories);
      await dataService.saveCategories(newCategories);
    } catch (error) {
      alert("Fehler beim Speichern der Kategorien: " + error);
    }
  };

  const toggleCategory = (category: string) => {
    if (draggedCategory) return;
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const moveCategory = (sourceCat: string, targetCat: string) => {
    setCategories(prev => {
      const idx1 = prev.indexOf(sourceCat);
      const idx2 = prev.indexOf(targetCat);
      if (idx1 === -1 || idx2 === -1 || idx1 === idx2) return prev;
      
      const newOrder = [...prev];
      newOrder.splice(idx1, 1);
      newOrder.splice(idx2, 0, sourceCat);
      return newOrder;
    });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (categories.length > 0) {
        dataService.saveCategories(categories).catch(console.error);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [categories]);

  const handleDragStart = (e: React.DragEvent, category: string) => {
    setDraggedCategory(category);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, targetCategory: string) => {
    e.preventDefault(); 
    if (!draggedCategory) return;
    moveCategory(draggedCategory, targetCategory);
  };

  const handleDragEnd = () => {
    setDraggedCategory(null);
  };

  const handleTouchStart = (e: React.TouchEvent, category: string) => {
    if (e.touches.length > 1) return;
    touchStartCoord.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    
    touchTimer.current = setTimeout(() => {
      setDraggedCategory(category);
      if (navigator.vibrate) navigator.vibrate(50);
    }, 500); 
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!draggedCategory) {
       if (touchStartCoord.current) {
         const dx = Math.abs(e.touches[0].clientX - touchStartCoord.current.x);
         const dy = Math.abs(e.touches[0].clientY - touchStartCoord.current.y);
         if (dx > 10 || dy > 10) {
           if (touchTimer.current) {
             clearTimeout(touchTimer.current);
             touchTimer.current = null;
           }
         }
       }
       return;
    }

    e.preventDefault();
    const touch = e.touches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    const btn = target?.closest('button[data-category]');
    
    if (btn) {
      const targetCat = btn.getAttribute('data-category');
      if (targetCat && targetCat !== draggedCategory) {
        moveCategory(draggedCategory, targetCat);
      }
    }
  };

  const handleTouchEnd = () => {
    if (touchTimer.current) {
      clearTimeout(touchTimer.current);
      touchTimer.current = null;
    }
    setDraggedCategory(null);
  };

  const handleSwipeTouchStart = (e: React.TouchEvent) => {
    swipeStartX.current = e.touches[0].clientX;
    swipeStartY.current = e.touches[0].clientY;
  };

  const handleSwipeTouchMove = (e: React.TouchEvent) => {
    if (!swipeStartX.current || !swipeStartY.current) return;

    const deltaX = e.touches[0].clientX - swipeStartX.current;
    const deltaY = e.touches[0].clientY - swipeStartY.current;

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      e.preventDefault();

      if (deltaX > 0 && activeTab === 'menu') {
        setActiveTab('dishes');
        swipeStartX.current = null;
        swipeStartY.current = null;
      } else if (deltaX < 0 && activeTab === 'dishes') {
        setActiveTab('menu');
        swipeStartX.current = null;
        swipeStartY.current = null;
      }
    }
  };

  const handleSwipeTouchEnd = (e: React.TouchEvent) => {
    swipeStartX.current = null;
    swipeStartY.current = null;
  };

  const filteredAndSortedDishes = dishes
    .filter(d => {
      const matchesSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategories.length === 0 ||
        (d.tags && selectedCategories.every(tag => d.tags!.includes(tag)));
      const matchesRarely = showRarelyCooked ? (d.timesCooked <= 3) : true;
      return matchesSearch && matchesCategory && matchesRarely;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          if (b.rating !== a.rating) return b.rating - a.rating;
          return a.name.localeCompare(b.name);
        case 'lastCooked':
          const aDate = a.lastCooked ? new Date(a.lastCooked).getTime() : 0;
          const bDate = b.lastCooked ? new Date(b.lastCooked).getTime() : 0;
          if (bDate !== aDate) return bDate - aDate;
          return a.name.localeCompare(b.name);
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });

  const renderCategoryButtons = () => (
    <>
      <button
        onClick={() => setShowRarelyCooked(!showRarelyCooked)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors whitespace-nowrap select-none ${
          showRarelyCooked 
          ? 'bg-indigo-100 text-indigo-700 border-indigo-200' 
          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
        }`}
      >
        <Icons.Filter size={14} />
        Selten
      </button>
      <div className="w-px h-6 bg-slate-300 mx-1 flex-shrink-0" />
      <button
         onClick={() => setSelectedCategories([])}
         className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors whitespace-nowrap select-none ${
           selectedCategories.length === 0
             ? 'bg-slate-800 text-white border-slate-800'
             : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
         }`}
      >
        Alle
      </button>
      {categories.map(cat => (
        <button
          key={cat}
          data-category={cat}
          draggable="true"
          onDragStart={(e) => handleDragStart(e, cat)}
          onDragOver={(e) => handleDragOver(e, cat)}
          onDragEnd={handleDragEnd}
          onTouchStart={(e) => handleTouchStart(e, cat)}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={() => toggleCategory(cat)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all whitespace-nowrap cursor-grab active:cursor-grabbing select-none ${
            selectedCategories.includes(cat)
              ? 'bg-primary-600 text-white border-primary-600'
              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
          } ${draggedCategory === cat ? 'opacity-40 scale-95 border-dashed border-slate-400' : ''}`}
        >
          {cat}
        </button>
      ))}
    </>
  );

  const handleSortChange = () => {
    const currentIndex = sortOptions.indexOf(sortBy);
    const nextIndex = (currentIndex + 1) % sortOptions.length;
    setSortBy(sortOptions[nextIndex]);
  };

  const renderSortButton = () => {
    const sortIcons: {[key in SortOption]: React.ReactElement} = {
        name: <Icons.SortAlpha size={18} />,
        rating: <Icons.Star size={16} />,
        lastCooked: <Icons.Clock size={16} />,
    };

    const sortLabels: {[key in SortOption]: string} = {
        name: 'Sortiert nach Name',
        rating: 'Sortiert nach Bewertung',
        lastCooked: 'Sortiert nach "Zuletzt gekocht"',
    };

    return (
      <button
        onClick={handleSortChange}
        className="fixed md:absolute top-20 right-6 z-40 flex items-center justify-center w-10 h-10 bg-white/80 backdrop-blur-md border border-slate-200 rounded-full shadow-lg text-slate-700 hover:bg-slate-50 transition-all"
        title={sortLabels[sortBy]}
      >
        {sortIcons[sortBy]}
      </button>
    );
  }

  if (appError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 p-6 text-center">
        <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
           <Icons.X size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Etwas ist schiefgelaufen</h2>
        <p className="text-slate-600 max-w-md">{appError}</p>
        <button onClick={() => window.location.reload()} className="mt-6 px-4 py-2 bg-slate-900 text-white rounded-lg">
          Seite neu laden
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      
      {isOffline && (
        <div className="bg-orange-100 border-b border-orange-200 text-orange-800 px-4 py-2 text-sm text-center font-medium sticky top-0 z-50 flex items-center justify-center gap-2">
           <Icons.Clock size={16} />
           <span>Keine Verbindung zum Server. Lokaler Cache aktiv (Änderungen werden nur im Browser gespeichert).</span>
        </div>
      )}

      <header className={`bg-white border-b border-slate-200 sticky ${isOffline ? 'top-[37px]' : 'top-0'} z-30 transition-all`}>
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-tr from-primary-500 to-indigo-600 rounded-lg flex items-center justify-center text-white shadow-md">
              <Icons.Utensils size={18} />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-indigo-700 hidden sm:block">
              MyGourmet
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
             <button
              onClick={() => setBatchImportModalOpen(true)}
              className="flex items-center justify-center w-9 h-9 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              title="Cookidoo Batch Import"
            >
              <Icons.FileDown size={20} />
            </button>
            {activeTab === 'dishes' && (
              <button
                onClick={handleCreateDish}
                className="md:hidden flex items-center justify-center w-9 h-9 bg-primary-50 text-primary-600 rounded-lg active:bg-primary-100"
                title="Neues Gericht"
              >
                <Icons.Plus size={20} />
              </button>
            )}

            <button
              onClick={() => setCategoryModalOpen(true)}
              className="flex items-center justify-center w-9 h-9 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              title="Kategorien bearbeiten"
            >
              <Icons.More size={20} />
            </button>

            <nav className="flex gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('dishes')}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'dishes'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Gerichte
              </button>
              <button
                onClick={() => setActiveTab('menu')}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'menu'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Menüplan
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main
        className={`flex-1 max-w-5xl mx-auto w-full p-4 md:p-6 ${activeTab === 'dishes' ? 'pb-40 md:pb-6' : ''}`}
        onTouchStart={handleSwipeTouchStart}
        onTouchMove={handleSwipeTouchMove}
        onTouchEnd={handleSwipeTouchEnd}
      >
        
        {loading ? (
          <div className="flex justify-center py-20">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <>
            {activeTab === 'dishes' && (
              <div className="relative space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {renderSortButton()}
                {/* Desktop Toolbar */}
                <div className={`hidden md:block sticky ${isOffline ? 'top-[117px]' : 'top-20'} z-20 bg-slate-50/95 backdrop-blur -mx-4 px-4 py-4 md:mx-0 md:px-0 md:pt-2 md:pb-4 space-y-4 transition-all`}>
                  <div className="flex flex-col sm:flex-row gap-4 justify-between">
                    <div className="relative flex-1 max-w-md">
                      <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="text"
                        placeholder="Gerichte durchsuchen..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-10 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-shadow shadow-sm"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <Icons.X size={18} />
                        </button>
                      )}
                    </div>
                    <button 
                      onClick={handleCreateDish}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl font-medium shadow-md hover:bg-primary-700 hover:shadow-lg transition-all active:scale-95 whitespace-nowrap"
                    >
                      <Icons.Plus size={20} />
                      <span>Neues Gericht</span>
                    </button>
                  </div>
                  <div className="flex justify-between items-center gap-4">
                     <div onTouchStart={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()} onTouchEnd={(e) => e.stopPropagation()} className="flex items-center gap-3 overflow-x-auto scrollbar-hide pr-16">
                       {renderCategoryButtons()}
                     </div>
                  </div>
                </div>

                <div className="md:hidden fixed bottom-4 left-4 right-4 z-40 flex flex-col gap-2 animate-in slide-in-from-bottom-10 duration-500">
                   <div className="bg-white/90 backdrop-blur-md shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)] border border-slate-200 rounded-2xl p-3 space-y-3">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input
                            type="text"
                            placeholder="Suchen..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-base"
                          />
                          {searchQuery && (
                            <button
                              onClick={() => setSearchQuery('')}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                              <Icons.X size={20} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div onTouchStart={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()} onTouchEnd={(e) => e.stopPropagation()} className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
                         {renderCategoryButtons()}
                      </div>
                   </div>
                </div>

                {filteredAndSortedDishes.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-12 md:pt-0">
                    {filteredAndSortedDishes.map(dish => (
                      <DishCard 
                        key={dish.id} 
                        dish={dish} 
                        onClick={() => handleOpenDish(dish)}
                        onAddToMenu={(e) => handleAddToNextWeek(e, dish.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <Icons.Search size={48} className="mb-4 opacity-20" />
                    <p>Keine Gerichte gefunden.</p>
                    {showRarelyCooked && <p className="text-sm mt-2 text-slate-400">(Filter "Selten gekocht" ist aktiv)</p>}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'menu' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <MenuPlanView
                  dishes={dishes}
                  onAddDishRequest={handleAddDishFromMenu}
                  onOpenDish={handleOpenDish}
                  onDishRemoved={() => refreshDishes()}
                />
              </div>
            )}
          </>
        )}

      </main>

      <DishModal
        isOpen={isDishModalOpen}
        onClose={() => setDishModalOpen(false)}
        dish={selectedDish}
        isNew={isCreatingNewDish}
        onSave={handleSaveDish}
        onDelete={handleDeleteDish}
        categories={categories}
      />

      <DishPickerModal
        isOpen={isPickerOpen}
        onClose={() => setPickerOpen(false)}
        dishes={dishes}
        onSelect={handlePickerSelect}
      />

      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        categories={categories}
        onSave={handleSaveCategories}
      />
      
      <BatchImportModal
        isOpen={isBatchImportModalOpen}
        onClose={() => setBatchImportModalOpen(false)}
        onImport={(importedDishes) => {
          setDishes(prev => [...prev, ...importedDishes]);
        }}
    />

    </div>
  );
};

export default App;
