'use client';

import { useState } from 'react';
import { useModels, useExpenses } from '@/hooks/use-database';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Settings, DollarSign, Calendar, Building } from 'lucide-react';
import { formatCurrency } from '@/lib/db-utils';
import { ModelsTable } from '@/components/models-table';
import { AddModelDialog } from '@/components/add-model-dialog';
import { EditModelDialog } from '@/components/edit-model-dialog';
import { ManageExpensesDialog } from '@/components/manage-expenses-dialog';
import { Model } from '@/lib/db-schemas';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const { models, isLoading: modelsLoading, error: modelsError, deleteModel } = useModels();
  const { expenses } = useExpenses(); // Get all expenses for stats
  const router = useRouter();
  
  const [isAddModelOpen, setIsAddModelOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [managingExpensesModel, setManagingExpensesModel] = useState<Model | null>(null);
  const [newlyCreatedModelId, setNewlyCreatedModelId] = useState<string | null>(null);

  // Calculate stats
  const totalModels = models.length;
  const totalStartingAmount = models.reduce((sum, model) => sum + model.startingAmount, 0);
  const averageMonthlyFees = models.length > 0 
    ? models.reduce((sum, model) => sum + model.monthlyReserveFeesPerHousingUnit, 0) / models.length 
    : 0;
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.cost, 0);

  const handleDeleteModel = async (model: Model) => {
    if (confirm(`Are you sure you want to delete "${model.name}"? This will also delete all associated expenses.`)) {
      try {
        await deleteModel(model.id);
      } catch (error) {
        console.error('Failed to delete model:', error);
        alert('Failed to delete model. Please try again.');
      }
    }
  };

  const handleEditModel = (model: Model) => {
    setEditingModel(model);
  };

  const handleManageExpenses = (model: Model) => {
    setManagingExpensesModel(model);
  };

  const handleSimulate = (model: Model) => {
    router.push(`/simulation/${model.id}`);
  };

  const handleModelCreated = (modelId: string) => {
    setNewlyCreatedModelId(modelId);
    setIsAddModelOpen(false);
    // Auto-open expenses dialog for the newly created model
    const newModel = models.find(m => m.id === modelId);
    if (newModel) {
      setManagingExpensesModel(newModel);
    }
  };

  if (modelsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    );
  }

  if (modelsError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">Error loading dashboard: {modelsError}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Image
                src="/logo.png"
                alt="Reserve Fund Advisers LLC"
                width={75}
                height={48}
                className="h-12 w-auto"
              />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Reserve Fund Advisers</h1>
                <p className="text-sm text-gray-500">Financial Planning Dashboard</p>
              </div>
            </div>
            <Button onClick={() => setIsAddModelOpen(true)} className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Add Model</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Models</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalModels}</div>
              <p className="text-xs text-muted-foreground">
                Reserve fund models
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Starting Funds</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalStartingAmount)}</div>
              <p className="text-xs text-muted-foreground">
                Combined starting amounts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Monthly Fees</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(averageMonthlyFees)}</div>
              <p className="text-xs text-muted-foreground">
                Per housing unit
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
              <p className="text-xs text-muted-foreground">
                All planned expenses
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Models Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Reserve Fund Models</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Manage your reserve fund models and their associated expenses
                </p>
              </div>
              <Button 
                onClick={() => setIsAddModelOpen(true)} 
                size="sm"
                className="flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Add Model</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ModelsTable
              models={models}
              onEdit={handleEditModel}
              onDelete={handleDeleteModel}
              onManageExpenses={handleManageExpenses}
              onSimulate={handleSimulate}
            />
          </CardContent>
        </Card>
      </main>

      {/* Dialogs */}
      <AddModelDialog
        open={isAddModelOpen}
        onOpenChange={setIsAddModelOpen}
        onModelCreated={handleModelCreated}
      />

      {editingModel && (
        <EditModelDialog
          model={editingModel}
          open={!!editingModel}
          onOpenChange={(open) => !open && setEditingModel(null)}
        />
      )}

      {managingExpensesModel && (
        <ManageExpensesDialog
          model={managingExpensesModel}
          open={!!managingExpensesModel}
          onOpenChange={(open) => !open && setManagingExpensesModel(null)}
          isNewModel={managingExpensesModel.id === newlyCreatedModelId}
        />
      )}
    </div>
  );
}
