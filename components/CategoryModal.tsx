import React, { useState, useEffect } from 'react';
import { Icons } from './ui/Icon';

interface CategoryModalProps {
  categories: string[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (categories: string[]) => void;
}

const CategoryModal: React.FC<CategoryModalProps> = ({ categories, isOpen, onClose, onSave }) => {
  const [editedCategories, setEditedCategories] = useState<string[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setEditedCategories([...categories]);
    }
  }, [isOpen, categories]);

  if (!isOpen) return null;

  const handleAddCategory = () => {
    if (newCategoryName.trim() && !editedCategories.includes(newCategoryName.trim())) {
      setEditedCategories([...editedCategories, newCategoryName.trim()]);
      setNewCategoryName('');
    }
  };

  const handleRemoveCategory = (category: string) => {
    setEditedCategories(editedCategories.filter(c => c !== category));
  };

  const handleRenameCategory = (oldName: string, newName: string) => {
    if (newName.trim()) {
      setEditedCategories(editedCategories.map(c => c === oldName ? newName.trim() : c));
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const newCategories = [...editedCategories];
    const draggedItem = newCategories[draggedIndex];
    newCategories.splice(draggedIndex, 1);
    newCategories.splice(targetIndex, 0, draggedItem);

    setEditedCategories(newCategories);
    setDraggedIndex(targetIndex);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleSave = () => {
    onSave(editedCategories);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-white sticky top-0 z-10">
          <h2 className="text-lg font-bold text-slate-800">Kategorien bearbeiten</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
          >
            <Icons.X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto">

          {/* Add new category */}
          <div className="mb-6">
            <label className="text-sm font-medium text-slate-700 mb-2 block">Neue Kategorie hinzufügen</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                placeholder="Kategoriename..."
                className="flex-1 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              />
              <button
                onClick={handleAddCategory}
                disabled={!newCategoryName.trim()}
                className="px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Icons.Plus size={20} />
              </button>
            </div>
          </div>

          {/* Existing categories */}
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-800">Vorhandene Kategorien</h3>
            {editedCategories.length === 0 ? (
              <p className="text-slate-400 italic text-sm">Keine Kategorien vorhanden</p>
            ) : (
              editedCategories.map((category, index) => (
                <CategoryItem
                  key={index}
                  index={index}
                  category={category}
                  isDragged={draggedIndex === index}
                  onRemove={() => handleRemoveCategory(category)}
                  onRename={(newName) => handleRenameCategory(category, newName)}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                />
              ))
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-primary-600 text-white font-medium rounded-lg shadow-sm hover:bg-primary-700 transition-all"
          >
            Speichern
          </button>
        </div>
      </div>
    </div>
  );
};

// Component for individual category item with inline editing
const CategoryItem: React.FC<{
  index: number;
  category: string;
  isDragged: boolean;
  onRemove: () => void;
  onRename: (newName: string) => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}> = ({ index, category, isDragged, onRemove, onRename, onDragStart, onDragOver, onDragEnd }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(category);

  const handleSaveEdit = () => {
    if (editValue.trim() && editValue.trim() !== category) {
      onRename(editValue.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditValue(category);
    setIsEditing(false);
  };

  return (
    <div
      draggable={!isEditing}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      className={`flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200 cursor-move transition-all ${
        isDragged ? 'opacity-50 scale-95 shadow-lg' : 'hover:bg-slate-100'
      } ${!isEditing ? 'hover:border-slate-300' : ''}`}
    >
      {!isEditing && (
        <div className="text-slate-400 mr-1">
          <Icons.More size={16} />
        </div>
      )}
      {isEditing ? (
        <>
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
            className="flex-1 p-1 border border-slate-300 rounded focus:ring-1 focus:ring-primary-500 outline-none"
            autoFocus
          />
          <button
            onClick={handleSaveEdit}
            className="p-1 text-green-600 hover:bg-green-50 rounded"
          >
            <Icons.Check size={16} />
          </button>
          <button
            onClick={handleCancelEdit}
            className="p-1 text-slate-500 hover:bg-slate-100 rounded"
          >
            <Icons.X size={16} />
          </button>
        </>
      ) : (
        <>
          <span className="flex-1 text-slate-700">{category}</span>
          <button
            onClick={() => setIsEditing(true)}
            className="p-1 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded"
            title="Umbenennen"
          >
            <Icons.Edit2 size={14} />
          </button>
          <button
            onClick={onRemove}
            className="p-1 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded"
            title="Entfernen"
          >
            <Icons.Trash2 size={14} />
          </button>
        </>
      )}
    </div>
  );
};

export default CategoryModal;