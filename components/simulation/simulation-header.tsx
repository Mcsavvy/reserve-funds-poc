'use client';

import { Button } from '@/components/ui/button';
import { Edit, Zap, Save } from 'lucide-react';
import { Model } from '@/lib/db-schemas';
import Link from 'next/link';
import Image from 'next/image';
import { VersionSelector } from '@/components/version-selector';

interface SimulationHeaderProps {
  model: Model;
  hasUnsavedChanges: boolean;
  isOptimizing: boolean;
  versions: any[];
  currentVersionId?: string;
  onResetChanges: () => void;
  onOptimizeFees: () => void;
  onEditSimulation: () => void;
  onLoadVersion: (version: any) => void;
  onOpenVersionManagement: () => void;
}

export function SimulationHeader({
  model,
  hasUnsavedChanges,
  isOptimizing,
  versions,
  currentVersionId,
  onResetChanges,
  onOptimizeFees,
  onEditSimulation,
  onLoadVersion,
  onOpenVersionManagement
}: SimulationHeaderProps) {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <Image
                src="/logo.png"
                alt="Reserve Fund Advisers LLC"
                width={75}
                height={48}
                className="h-12 w-auto"
              />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Simulation: {model.name}</h1>
              <p className="text-sm text-gray-500">
                {model.fiscalYear} - {model.fiscalYear + model.period - 1} ({model.period} years)
              </p>
            </div>
          </div>
          
          {/* Version Selector */}
          <VersionSelector
            versions={versions}
            currentVersionId={currentVersionId}
            onLoadVersion={onLoadVersion}
            onOpenVersionManagement={onOpenVersionManagement}
            hasUnsavedChanges={hasUnsavedChanges}
          />
          
          <div className="flex items-center space-x-2">
            {hasUnsavedChanges && (
              <>
                <Button variant="outline" size="sm" onClick={onResetChanges}>
                  Reset Changes
                </Button>
                <Button 
                  size="sm" 
                  onClick={onOpenVersionManagement}
                  className="flex items-center space-x-2 bg-green-600 hover:bg-green-700"
                >
                  <Save className="h-4 w-4" />
                  <span>Save as Version</span>
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
              onClick={onEditSimulation}
              className="flex items-center space-x-2"
            >
              <Edit className="h-4 w-4" />
              <span>Edit Simulation</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
