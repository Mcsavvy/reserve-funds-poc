'use client';

import { useEffect, useState, use, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, SettingsIcon, PlayIcon, DownloadIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDatabase, useModels, useModelItems, useAssociations } from '@/hooks/use-database';
import { Model, ModelItem, Association } from '@/lib/db-types';
import { SimulationSettings } from '@/components/simulation-settings';
import { SimulationResults } from '@/components/simulation-results';
import { 
  calculateReserveProjections, 
  generateReserveSummary,
  formatCurrency 
} from '@/lib/reserve-calculations';

interface SimulationPageProps {
  params: Promise<{
    modelId: string;
  }>;
}

export default function SimulationPage({ params }: SimulationPageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { isInitialized } = useDatabase();
  const { getItem: getModel } = useModels();
  const { getItemsByModel } = useModelItems();
  const { items: associations } = useAssociations();

  const [model, setModel] = useState<Model | null>(null);
  const [modelItems, setModelItems] = useState<ModelItem[]>([]);
  const [association, setAssociation] = useState<Association | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [simulationSettings, setSimulationSettings] = useState<{
    projectionYears: number;
    customInflationRate: number | null;
    customMonthlyFees: number | null;
    targetMinBalance: number;
    includeInterest: boolean;
  }>({
    projectionYears: 30,
    customInflationRate: null,
    customMonthlyFees: null,
    targetMinBalance: 0,
    includeInterest: true,
  });

  // Load model and related data
  useEffect(() => {
    const loadModelData = async () => {
      if (!isInitialized || !resolvedParams.modelId) return;

      try {
        setLoading(true);
        
        // Load model
        const modelData = await getModel(resolvedParams.modelId);
        if (!modelData) {
          setError('Model not found');
          return;
        }
        setModel(modelData);

        // Load model items
        const items = await getItemsByModel(resolvedParams.modelId);
        setModelItems(items);

        // Set default simulation settings based on model
        setSimulationSettings(prev => ({
          ...prev,
          projectionYears: modelData.period || 30,
        }));

      } catch (err) {
        console.error('Error loading model data:', err);
        setError('Failed to load model data');
      } finally {
        setLoading(false);
      }
    };

    loadModelData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized, resolvedParams.modelId]);

  // Separate effect to handle association lookup when model or associations change
  useEffect(() => {
    if (model && associations && associations.length >= 0) {
      const assoc = associations.find(a => a.id === model.client_id);
      setAssociation(assoc || null);
    } else if (model && !associations) {
      setAssociation(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model?.id, associations]);

  const handleSettingsChange = (newSettings: {
    projectionYears: number;
    customInflationRate: number | null;
    customMonthlyFees: number | null;
    targetMinBalance: number;
    includeInterest: boolean;
  }) => {
    setSimulationSettings(newSettings);
  };

  const handleRunSimulation = () => {
    // Force re-render of simulation results
    setShowSettings(false);
  };

  if (!isInitialized || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading simulation...</p>
        </div>
      </div>
    );
  }

  if (error || !model) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || 'Model not found'}</p>
          <Button onClick={() => router.push('/')} variant="outline">
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button 
              onClick={() => router.push('/')} 
              variant="outline" 
              size="sm"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{model.name}</h1>
              <p className="text-gray-600">
                Reserve Fund Simulation {association && `• ${association.association}`}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button 
              onClick={() => setShowSettings(!showSettings)}
              variant="outline"
            >
              <SettingsIcon className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button onClick={handleRunSimulation}>
              <PlayIcon className="h-4 w-4 mr-2" />
              Run Simulation
            </Button>
          </div>
        </div>

        {/* Model Summary Card */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Starting Balance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(model.starting_amount)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Monthly Fees</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(simulationSettings.customMonthlyFees || model.monthly_fees)}
              </div>
              <p className="text-sm text-gray-600">{model.housing} units</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Inflation Rate</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(simulationSettings.customInflationRate || model.inflation_rate).toFixed(1)}%
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Simulation Period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {simulationSettings.projectionYears} years
              </div>
              <p className="text-sm text-gray-600">FY {model.fiscal_year} - {parseInt(model.fiscal_year) + simulationSettings.projectionYears}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Settings Panel */}
          {showSettings && (
            <div className="lg:col-span-1">
              <SimulationSettings
                model={model}
                modelItems={modelItems}
                settings={simulationSettings}
                onSettingsChange={handleSettingsChange}
              />
            </div>
          )}

          {/* Simulation Results */}
          <div className={showSettings ? "lg:col-span-3" : "lg:col-span-4"}>
            <SimulationResults
              model={model}
              modelItems={modelItems}
              settings={simulationSettings}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
