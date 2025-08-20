'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PlusIcon, Trash2Icon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { LtimStrategy } from '@/lib/db-types';

const US_STATES = [
  { code: 'FL', name: 'Florida' },
  { code: 'CA', name: 'California' },
  { code: 'TX', name: 'Texas' },
  { code: 'NY', name: 'New York' },
  { code: 'SL', name: 'Secondary Strategy' },
];

interface Bucket {
  dur: number;
  rate: number;
}

export function EditLtimStrategyForm({ strategy, onSuccess, onUpdate }: { 
  strategy: LtimStrategy;
  onSuccess: () => void; 
  onUpdate: (strategy: LtimStrategy) => Promise<any> 
}) {
  const [formData, setFormData] = useState({
    name: strategy.name,
    description: strategy.description || '',
    state: strategy.state,
    start_year: strategy.start_year,
  });

  const [buckets, setBuckets] = useState<Bucket[]>(() => {
    try {
      return JSON.parse(strategy.buckets || '[]');
    } catch {
      return [{ dur: 1, rate: 0.04 }];
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onUpdate({
        ...strategy,
        ...formData,
        buckets: JSON.stringify(buckets),
        updated_at: Date.now(),
      });
      onSuccess();
    } catch (error) {
      console.error('Failed to update LTIM strategy:', error);
    }
  };

  const addBucket = () => {
    setBuckets([...buckets, { dur: 1, rate: 0.04 }]);
  };

  const removeBucket = (index: number) => {
    if (buckets.length > 1) {
      setBuckets(buckets.filter((_, i) => i !== index));
    }
  };

  const updateBucket = (index: number, field: keyof Bucket, value: number) => {
    const newBuckets = buckets.map((bucket, i) => 
      i === index ? { ...bucket, [field]: value } : bucket
    );
    setBuckets(newBuckets);
  };

  const totalDuration = buckets.reduce((sum, bucket) => sum + bucket.dur, 0);
  const weightedRate = buckets.length > 0 
    ? buckets.reduce((sum, bucket) => sum + bucket.rate * bucket.dur, 0) / Math.max(1, totalDuration)
    : 0;

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit LTIM Strategy</DialogTitle>
        <DialogDescription>
          Update the Long-Term Investment Management strategy and its rate buckets.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Strategy Name *</Label>
            <Input
              id="edit-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Florida Conservative Strategy"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-state">State *</Label>
            <Select 
              value={formData.state} 
              onValueChange={(value) => setFormData({ ...formData, state: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a state" />
              </SelectTrigger>
              <SelectContent>
                {US_STATES.map((state) => (
                  <SelectItem key={state.code} value={state.code}>
                    {state.name} ({state.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-description">Description</Label>
          <Textarea
            id="edit-description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Optional description of this LTIM strategy..."
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-start_year">Start Year</Label>
          <Input
            id="edit-start_year"
            type="number"
            min="0"
            max="10"
            value={formData.start_year}
            onChange={(e) => setFormData({ ...formData, start_year: Number(e.target.value) })}
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">Rate Buckets</Label>
            <Button type="button" variant="outline" size="sm" onClick={addBucket}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Bucket
            </Button>
          </div>

          <div className="space-y-3">
            {buckets.map((bucket, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <Label className="text-sm">Duration (years)</Label>
                      <Input
                        type="number"
                        min="1"
                        max="20"
                        value={bucket.dur}
                        onChange={(e) => updateBucket(index, 'dur', Number(e.target.value))}
                      />
                    </div>
                    <div className="flex-1">
                      <Label className="text-sm">Rate (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="20"
                        step="0.01"
                        value={(bucket.rate * 100).toFixed(2)}
                        onChange={(e) => updateBucket(index, 'rate', Number(e.target.value) / 100)}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeBucket(index)}
                      disabled={buckets.length <= 1}
                      className="self-end"
                    >
                      <Trash2Icon className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-3 rounded">
            <div>
              <span className="font-medium">Total Duration:</span> {totalDuration} years
            </div>
            <div>
              <span className="font-medium">Weighted Avg Rate:</span> {(weightedRate * 100).toFixed(2)}%
            </div>
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={!formData.name || !formData.state}>
          Update LTIM Strategy
        </Button>
      </form>
    </>
  );
}
