'use client';

import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Zap } from 'lucide-react';
import { Model } from '@/lib/db-schemas';
import { SimulationParams } from '@/lib/simulation';

interface SimulationHeaderProps {
  model: Model;
  hasUnsavedChanges: boolean;
  isOptimizing: boolean;
  onBack: () => void;
  onResetChanges: () => void;
  onSaveModel: () => void;
  onOptimizeFees: () => void;
  onEditModel: () => void;
}

export function SimulationHeader({
  model,
  hasUnsavedChanges,
  isOptimizing,
  onBack,
  onResetChanges,
  onSaveModel,
  onOptimizeFees,
  onEditModel
}: SimulationHeaderProps) {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Simulation: {model.name}</h1>
              <p className="text-sm text-gray-500">
                {model.fiscalYear} - {model.fiscalYear + model.period - 1} ({model.period} years)
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {hasUnsavedChanges && (
              <>
                <Button variant="outline" size="sm" onClick={onResetChanges}>
                  Reset
                </Button>
                <Button size="sm" onClick={onSaveModel}>
                  Save Changes
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onOptimizeFees}
              disabled={isOptimizing}
              className="flex items-center space-x-2 text-blue-600 border-blue-600 hover:bg-blue-50"
            >
              <Zap className="h-4 w-4" />
              <span>{isOptimizing ? 'Optimizing...' : 'Optimize Fees'}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onEditModel}
              className="flex items-center space-x-2"
            >
              <Edit className="h-4 w-4" />
              <span>Edit Model</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
