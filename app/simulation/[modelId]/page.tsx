'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useModels, useExpenses } from '@/hooks/use-database';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, TrendingUp, TrendingDown, AlertTriangle, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/db-utils';
import { ProjectionTable } from '@/components/projection-table';
import { ModelEditSidebar } from '@/components/model-edit-sidebar';
import { YearDetailSidebar } from '@/components/year-detail-sidebar';
import { generateProjections, getProjectionStats, applyYearAdjustments, SimulationParams, YearProjection } from '@/lib/simulation';
import { Model } from '@/lib/db-schemas';

export default function SimulationPage() {
  const params = useParams();
  const router = useRouter();
  const modelId = params.modelId as string;
  
  const { models, getModel, updateModel } = useModels();
  const { expenses } = useExpenses(modelId);
  
  const [model, setModel] = useState<Model | null>(null);
  const [simulationParams, setSimulationParams] = useState<SimulationParams | null>(null);
  const [isModelEditOpen, setIsModelEditOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState<YearProjection | null>(null);
  const [yearAdjustments, setYearAdjustments] = useState<Record<number, any>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Load model data
  useEffect(() => {
    const loadModel = async () => {
      try {
        setIsLoading(true);
        const modelData = await getModel(modelId);
        if (modelData) {
          setModel(modelData);
          // Initialize simulation params with model data
          const { id, createdAt, updatedAt, ...simParams } = modelData;
          setSimulationParams(simParams);
        }
      } catch (error) {
        console.error('Failed to load model:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadModel();
  }, [modelId, getModel]);

  // Generate projections when params or expenses change
  const projections = useMemo(() => {
    if (!simulationParams || !expenses) return [];
    let baseProjections = generateProjections(simulationParams, expenses);
    
    // Apply year adjustments and recalculate subsequent years
    if (Object.keys(yearAdjustments).length > 0) {
      baseProjections = applyYearAdjustments(baseProjections, yearAdjustments);
    }
    
    return baseProjections;
  }, [simulationParams, expenses, yearAdjustments]);

  // Calculate stats
  const stats = useMemo(() => {
    if (projections.length === 0) return null;
    return getProjectionStats(projections);
  }, [projections]);

  const handleModelEdit = (updatedParams: SimulationParams) => {
    setSimulationParams(updatedParams);
  };

  const handleYearAdjustment = (year: number, adjustments: any) => {
    setYearAdjustments(prev => ({
      ...prev,
      [year]: adjustments
    }));
  };

  const handleSaveModel = async () => {
    if (!model || !simulationParams) return;
    
    try {
      await updateModel(model.id, simulationParams);
      // Update local model state
      setModel({ ...model, ...simulationParams });
    } catch (error) {
      console.error('Failed to save model:', error);
      alert('Failed to save model changes. Please try again.');
    }
  };

  const handleResetChanges = () => {
    if (!model) return;
    const { id, createdAt, updatedAt, ...simParams } = model;
    setSimulationParams(simParams);
  };

  const hasUnsavedChanges = useMemo(() => {
    if (!model || !simulationParams) return false;
    
    // Compare simulation params with original model
    const { id, createdAt, updatedAt, ...originalParams } = model;
    const hasModelChanges = JSON.stringify(originalParams) !== JSON.stringify(simulationParams);
    const hasYearAdjustments = Object.keys(yearAdjustments).length > 0;
    
    return hasModelChanges || hasYearAdjustments;
  }, [model, simulationParams, yearAdjustments]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading simulation...</div>
      </div>
    );
  }

  if (!model || !simulationParams) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">Model not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
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
                  <Button variant="outline" size="sm" onClick={handleResetChanges}>
                    Reset
                  </Button>
                  <Button size="sm" onClick={handleSaveModel}>
                    Save Changes
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsModelEditOpen(true)}
                className="flex items-center space-x-2"
              >
                <Edit className="h-4 w-4" />
                <span>Edit Model</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Final Balance</CardTitle>
                {stats.finalBalance >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${stats.finalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(stats.finalBalance)}
                </div>
                <p className="text-xs text-muted-foreground">
                  At end of {model.period}-year period
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Minimum Balance</CardTitle>
                {stats.negativeBalanceYears > 0 ? (
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                ) : (
                  <DollarSign className="h-4 w-4 text-green-600" />
                )}
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${stats.minBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(stats.minBalance)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Lowest balance reached
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Collections</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(stats.totalCollections)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Over {model.period} years
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                <TrendingDown className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {formatCurrency(stats.totalExpenses)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Over {model.period} years
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="projection" className="space-y-6">
          <TabsList>
            <TabsTrigger value="projection">Projection</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
          </TabsList>

          <TabsContent value="projection">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Year-by-Year Projection</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Click on any year to view and edit details
                    </p>
                  </div>
                  {stats && stats.negativeBalanceYears > 0 && (
                    <Badge variant="destructive">
                      {stats.negativeBalanceYears} year{stats.negativeBalanceYears > 1 ? 's' : ''} with negative balance
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <ProjectionTable
                  projections={projections}
                  onYearClick={setSelectedYear}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analysis">
            <Card>
              <CardHeader>
                <CardTitle>Financial Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Analysis features coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scenarios">
            <Card>
              <CardHeader>
                <CardTitle>Scenario Planning</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Scenario features coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Sidebars */}
      <ModelEditSidebar
        open={isModelEditOpen}
        onOpenChange={setIsModelEditOpen}
        model={simulationParams}
        onSave={handleModelEdit}
      />

      {selectedYear && (
        <YearDetailSidebar
          open={!!selectedYear}
          onOpenChange={(open: boolean) => !open && setSelectedYear(null)}
          yearProjection={selectedYear}
          model={simulationParams}
          onYearAdjustment={handleYearAdjustment}
        />
      )}
    </div>
  );
}
