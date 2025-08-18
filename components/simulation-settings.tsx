'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { RefreshCwIcon, RotateCcwIcon } from 'lucide-react';
import { Model, ModelItem } from '@/lib/db-types';
import { formatCurrency } from '@/lib/reserve-calculations';

type SimulationSettings = {
  projectionYears: number;
  customInflationRate: number | null;
  customBaseMaintenance: number | null;
  targetMinBalance: number;
};

interface SimulationSettingsProps {
  model: Model;
  modelItems: ModelItem[];
  settings: SimulationSettings;
  onSettingsChange: (settings: SimulationSettings) => void;
}

export function SimulationSettings({
  model,
  modelItems,
  settings,
  onSettingsChange,
}: SimulationSettingsProps) {
  const [localSettings, setLocalSettings] = useState(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleInputChange = (field: string, value: any) => {
    const newSettings = { ...localSettings, [field]: value };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
  };

  const handleReset = () => {
    const defaultSettings = {
      projectionYears: model.period || 30,
      customInflationRate: null,
      customBaseMaintenance: null,
      targetMinBalance: 0,
    };
    setLocalSettings(defaultSettings);
    onSettingsChange(defaultSettings);
  };

  const totalItems = modelItems.length;
  const largeExpenses = modelItems.filter(item => item.type === 'Large').length;

  return (
    <Card className="h-fit">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Simulation Settings</CardTitle>
            <CardDescription>Adjust parameters for custom analysis</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcwIcon className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Projection Period */}
        <div className="space-y-2">
          <Label htmlFor="projectionYears">Projection Period (Years)</Label>
          <Input
            id="projectionYears"
            type="number"
            min="1"
            max="50"
            value={localSettings.projectionYears}
            onChange={(e) => handleInputChange('projectionYears', parseInt(e.target.value) || 30)}
          />
          <p className="text-xs text-gray-500">
            Default: {model.period} years • Range: 1-50 years
          </p>
        </div>

        <Separator />

        {/* Financial Parameters */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm">Financial Parameters</h4>
          
          <div className="space-y-2">
            <Label htmlFor="customInflationRate">Inflation Rate (%)</Label>
            <Input
              id="customInflationRate"
              type="number"
              step="0.1"
              min="0"
              max="20"
              value={localSettings.customInflationRate || ''}
              placeholder={model.inflation_rate.toString()}
              onChange={(e) => handleInputChange('customInflationRate', 
                e.target.value ? parseFloat(e.target.value) : null)}
            />
            <p className="text-xs text-gray-500">
              Default: {model.inflation_rate}% • Leave empty to use model default
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customBaseMaintenance">Base Maintenance (Annual $)</Label>
            <Input
              id="customBaseMaintenance"
              type="number"
              min="0"
              value={localSettings.customBaseMaintenance || ''}
              placeholder={model.base_maintenance.toString()}
              onChange={(e) => handleInputChange('customBaseMaintenance', 
                e.target.value ? parseFloat(e.target.value) : null)}
            />
            <p className="text-xs text-gray-500">
              Default: {formatCurrency(model.base_maintenance)} • Leave empty to use model default
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetMinBalance">Target Minimum Balance ($)</Label>
            <Input
              id="targetMinBalance"
              type="number"
              min="0"
              value={localSettings.targetMinBalance}
              onChange={(e) => handleInputChange('targetMinBalance', 
                parseFloat(e.target.value) || 0)}
            />
            <p className="text-xs text-gray-500">
              Minimum acceptable balance to maintain
            </p>
          </div>
        </div>

        <Separator />

        {/* Model Summary */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Model Summary</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Opening Balance:</span>
              <span className="font-medium">{formatCurrency(model.starting_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Housing Units:</span>
              <span className="font-medium">{model.housing}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Base Maintenance:</span>
              <span className="font-medium">{formatCurrency(model.base_maintenance)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Loan Threshold:</span>
              <span className="font-medium">{model.loan_threshold}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Safety Net:</span>
              <span className="font-medium">{model.safety_net_percentage}%</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Model Items Summary */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Model Items</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total Items:</span>
              <Badge variant="outline">{totalItems}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Large Expenses:</span>
              <Badge variant="default">{largeExpenses}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Small Expenses:</span>
              <Badge variant="secondary">{totalItems - largeExpenses}</Badge>
            </div>
          </div>
        </div>

        {/* Investment Strategy */}
        {model.inv_strategy && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Investment Strategy</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                {model.inv_strategy}
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
