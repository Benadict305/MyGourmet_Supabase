
import React, { useState } from 'react';
import { Icons } from './ui/Icon';
import { dataService } from '../services/dataService';
import { Dish } from '../types';

interface BatchImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (dishes: Dish[]) => void;
}

const BatchImportModal: React.FC<BatchImportModalProps> = ({ isOpen, onClose, onImport }) => {
  const [urls, setUrls] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importLog, setImportLog] = useState<string[]>([]);

  if (!isOpen) return null;

  const handleImport = async () => {
    const urlList = urls.split('\n').filter(url => url.trim().startsWith('https://www.cookidoo.de'));
    if (urlList.length === 0) {
      alert('Bitte füge gültige Cookidoo URLs ein.');
      return;
    }

    setIsImporting(true);
    setImportLog([]);

    const importedDishes: Dish[] = [];
    for (const url of urlList) {
      try {
        setImportLog(prev => [...prev, `Importiere: ${url}`]);
        const recipeData = await dataService.fetchRecipeData(url);
        if (recipeData && recipeData.success) {
          const newDish: Partial<Dish> = {
            name: recipeData.name || 'Unbenanntes Gericht',
            ingredients: recipeData.ingredients || [],
            notes: recipeData.notes || '',
            image: recipeData.image || '',
            tags: recipeData.tags || ['Hauptgerichte'],
            recipeLink: url,
            rating: 0,
            timesCooked: 0,
          };
          const addedDish = await dataService.addDish(newDish as Dish);
          importedDishes.push(addedDish);
          setImportLog(prev => [...prev, `- Erfolgreich importiert: ${newDish.name}`]);
        } else {
          throw new Error(recipeData.error || 'Unbekannter Fehler');
        }
      } catch (error) {
        setImportLog(prev => [...prev, `- Fehler beim Import von ${url}: ${(error as Error).message}`]);
      }
    }

    onImport(importedDishes);
    setIsImporting(false);
    setImportLog(prev => [...prev, '--- Import abgeschlossen ---']);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold">Cookidoo Batch Import</h2>
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-red-500">
            <Icons.X size={24} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600">
            Füge eine oder mehrere Cookidoo Rezept-URLs ein (eine pro Zeile). Es werden nur URLs importiert, die mit "https://www.cookidoo.de" beginnen.
          </p>
          <textarea
            value={urls}
            onChange={(e) => setUrls(e.target.value)}
            className="w-full h-40 p-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            placeholder="https://www.cookidoo.de/..."
            disabled={isImporting}
          />
          {importLog.length > 0 && (
            <div className="w-full h-32 p-2 border rounded-lg bg-slate-50 text-xs overflow-y-auto">
              {importLog.map((line, index) => (
                <div key={index}>{line}</div>
              ))}
            </div>
          )}
        </div>
        <div className="p-4 bg-slate-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isImporting}
            className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg"
          >
            Schließen
          </button>
          <button
            onClick={handleImport}
            disabled={isImporting}
            className="px-6 py-2 bg-primary-600 text-white font-medium rounded-lg shadow-sm hover:bg-primary-700 disabled:opacity-50"
          >
            {isImporting ? 'Importiere...' : 'Import starten'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BatchImportModal;
