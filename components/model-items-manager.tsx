'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Model, ModelItem } from '@/lib/db-types';
import { useModelItems } from '@/hooks/use-database';
import { ModelItemsTable } from './tables';
import { AddModelItemForm, EditModelItemForm } from './forms';

interface ModelItemsManagerProps {
  model: Model;
}

export function ModelItemsManager({ model }: ModelItemsManagerProps) {
  const { items: modelItems, addItem: addModelItem, updateItem: updateModelItem, deleteItem: deleteModelItem, loading } = useModelItems();
  const [currentModelItems, setCurrentModelItems] = useState<ModelItem[]>([]);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showEditItem, setShowEditItem] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ModelItem | null>(null);

  // Filter items for the current model
  useEffect(() => {
    const filteredItems = modelItems.filter(item => item.model_id === model.id);
    setCurrentModelItems(filteredItems);
  }, [modelItems, model.id]);

  const handleAddItem = async (itemData: any) => {
    await addModelItem(itemData);
  };

  const handleEditItem = (item: ModelItem) => {
    setSelectedItem(item);
    setShowEditItem(true);
  };

  const handleUpdateItem = async (item: ModelItem) => {
    await updateModelItem(item);
  };

  const handleDeleteItem = async (item: ModelItem) => {
    if (window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
      try {
        await deleteModelItem(item.id);
      } catch (error) {
        console.error('Failed to delete model item:', error);
        alert('Failed to delete model item. Please try again.');
      }
    }
  };

  return (
    <>
      <ModelItemsTable
        modelItems={currentModelItems}
        loading={loading}
        onEdit={handleEditItem}
        onDelete={handleDeleteItem}
        onAdd={() => setShowAddItem(true)}
        modelName={model.name}
      />

      {/* Add Model Item Dialog */}
      <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
        <DialogContent className="sm:max-w-md">
          <AddModelItemForm
            model={model}
            onSuccess={() => setShowAddItem(false)}
            onAdd={handleAddItem}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Model Item Dialog */}
      <Dialog open={showEditItem} onOpenChange={setShowEditItem}>
        <DialogContent className="sm:max-w-md">
          {selectedItem && (
            <EditModelItemForm
              modelItem={selectedItem}
              onSuccess={() => setShowEditItem(false)}
              onUpdate={handleUpdateItem}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
