'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ModelItem } from '@/lib/db-types';

export function EditModelItemForm({ modelItem, onSuccess, onUpdate }: { 
  modelItem: ModelItem; 
  onSuccess: () => void; 
  onUpdate: (item: ModelItem) => Promise<any> 
}) {
  const [formData, setFormData] = useState({
    name: modelItem.name,
    redundancy: modelItem.redundancy,
    remaining_life: modelItem.remaining_life,
    cost: modelItem.cost,
    is_sirs: modelItem.is_sirs,
    starting_year: modelItem.starting_year,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onUpdate({
        ...modelItem,
        ...formData,
      });
      onSuccess();
    } catch (error) {
      console.error('Failed to update model item:', error);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit Model Item</DialogTitle>
        <DialogDescription>Update the model item details.</DialogDescription>
      </DialogHeader>
      
      <form onSubmit={handleSubmit} className="space-y-3 mt-4">
        <div className="space-y-2">
          <Label htmlFor="edit-item-name">Item Name *</Label>
          <Input
            id="edit-item-name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Roof Replacement, Pool Equipment, HVAC System"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="edit-item-cost">Replacement Cost ($) *</Label>
            <Input
              id="edit-item-cost"
              type="number"
              min="0"
              step="100"
              value={formData.cost}
              onChange={(e) => setFormData({ ...formData, cost: Number(e.target.value) })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-item-life">Remaining Life (years) *</Label>
            <Input
              id="edit-item-life"
              type="number"
              min="1"
              max="100"
              value={formData.remaining_life}
              onChange={(e) => setFormData({ ...formData, remaining_life: Number(e.target.value) })}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="edit-item-redundancy">Redundancy Factor</Label>
            <Input
              id="edit-item-redundancy"
              type="number"
              min="1"
              max="10"
              value={formData.redundancy}
              onChange={(e) => setFormData({ ...formData, redundancy: Number(e.target.value) })}
            />
            <p className="text-xs text-gray-500">
              Number of replacement cycles expected during the model period
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-item-starting-year">Starting Year</Label>
            <Input
              id="edit-item-starting-year"
              type="number"
              min="2000"
              max="2100"
              value={formData.starting_year}
              onChange={(e) => setFormData({ ...formData, starting_year: e.target.value })}
            />
            <p className="text-xs text-gray-500">
              Year when item tracking begins
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="edit-item-sirs"
            checked={formData.is_sirs}
            onChange={(e) => setFormData({ ...formData, is_sirs: e.target.checked })}
            className="rounded"
          />
          <Label htmlFor="edit-item-sirs">SIRS (Structural/Important) Item</Label>
        </div>
        <p className="text-xs text-gray-500 -mt-2">
          Check if this is a structural or important item requiring priority funding
        </p>

        <Button type="submit" className="w-full">
          Update Model Item
        </Button>
      </form>
    </>
  );
}
