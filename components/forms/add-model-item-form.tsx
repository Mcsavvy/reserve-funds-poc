'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Model } from '@/lib/db-types';

export function AddModelItemForm({ onSuccess, onAdd, model }: { 
  onSuccess: () => void; 
  onAdd: (item: any) => Promise<any>;
  model: Model;
}) {
  const [formData, setFormData] = useState({
    name: '',
    redundancy: 1,
    remaining_life: 10,
    cost: 5000,
    is_sirs: false,
    starting_year: model.fiscal_year,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onAdd({
        ...formData,
        model_id: model.id,
      });
      onSuccess();
      setFormData({
        name: '',
        redundancy: 1,
        remaining_life: 10,
        cost: 5000,
        is_sirs: false,
        starting_year: model.fiscal_year,
      });
    } catch (error) {
      console.error('Failed to add model item:', error);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add Model Item</DialogTitle>
        <DialogDescription>Add a new component or item to this reserve fund model.</DialogDescription>
      </DialogHeader>
      
      <form onSubmit={handleSubmit} className="space-y-3 mt-4">
        <div className="space-y-2">
          <Label htmlFor="item-name">Item Name *</Label>
          <Input
            id="item-name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Roof Replacement, Pool Equipment, HVAC System"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="item-cost">Replacement Cost ($) *</Label>
            <Input
              id="item-cost"
              type="number"
              min="0"
              step="100"
              value={formData.cost}
              onChange={(e) => setFormData({ ...formData, cost: Number(e.target.value) })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="item-life">Remaining Life (years) *</Label>
            <Input
              id="item-life"
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
            <Label htmlFor="item-redundancy">Redundancy Factor</Label>
            <Input
              id="item-redundancy"
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
            <Label htmlFor="item-starting-year">Starting Year</Label>
            <Input
              id="item-starting-year"
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
            id="item-sirs"
            checked={formData.is_sirs}
            onChange={(e) => setFormData({ ...formData, is_sirs: e.target.checked })}
            className="rounded"
          />
          <Label htmlFor="item-sirs">SIRS (Structural/Important) Item</Label>
        </div>
        <p className="text-xs text-gray-500 -mt-2">
          Check if this is a structural or important item requiring priority funding
        </p>

        <Button type="submit" className="w-full">
          Add Model Item
        </Button>
      </form>
    </>
  );
}
