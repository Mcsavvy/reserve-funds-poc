'use client';

import { useState, useEffect } from 'react';
import { useModels, useExpenses } from '@/hooks/use-database';
import { getDatabase, getCurrentTimestamp } from '@/lib/database';
import { hasShareableModelData } from '@/lib/url-sharing';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Settings, DollarSign, Calendar, Building } from 'lucide-react';
import { formatCurrency } from '@/lib/db-utils';
import { ModelsTable } from '@/components/models-table';
import { AddModelDialog } from '@/components/add-model-dialog';
import { EditModelDialog } from '@/components/edit-model-dialog';
import { ManageExpensesDialog } from '@/components/manage-expenses-dialog';
import { ManualPasteDialog } from '@/components/manual-paste-dialog';
import { ShareModelDialog } from '@/components/share-model-dialog';
import { Model } from '@/lib/db-schemas';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function HomePage() {
  const { models, isLoading: modelsLoading, error: modelsError, deleteModel, copyModelToClipboard, pasteModelFromClipboard, pasteModelFromData, loadModels } = useModels();
  const { expenses, loadExpenses } = useExpenses(); // Get all expenses for stats
  const router = useRouter();
  
  const [isAddModelOpen, setIsAddModelOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [managingExpensesModel, setManagingExpensesModel] = useState<Model | null>(null);
  const [newlyCreatedModelId, setNewlyCreatedModelId] = useState<string | null>(null);
  const [canPaste, setCanPaste] = useState(false);
  const [isManualPasteOpen, setIsManualPasteOpen] = useState(false);
  const [copyDataForManual, setCopyDataForManual] = useState<string>('');
  const [sharingModel, setSharingModel] = useState<Model | null>(null);

  // Calculate stats
  const totalModels = models.length;
  const totalStartingAmount = models.reduce((sum, model) => sum + model.startingAmount, 0);
  const averageMonthlyFees = models.length > 0 
    ? models.reduce((sum, model) => sum + model.monthlyReserveFeesPerHousingUnit, 0) / models.length 
    : 0;
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.cost, 0);

  // Check if we can paste from clipboard on load
  useEffect(() => {
    const checkClipboard = () => {
      try {
        // Only check if clipboard API is available, don't actually read
        if (navigator.clipboard && navigator.clipboard.readText) {
          // Don't actually read the clipboard on load, just enable the paste button
          // The actual check will happen when user clicks paste
          setCanPaste(true);
        } else {
          setCanPaste(false);
        }
      } catch (error) {
        // Don't show error for clipboard permission issues, just disable paste
        console.warn('Clipboard API not available:', error);
        setCanPaste(false);
      }
    };

    checkClipboard();
    
    // Recheck clipboard when the window gains focus
    const handleFocus = () => checkClipboard();
    window.addEventListener('focus', handleFocus);
    
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Check for shareable model data in URL and redirect to import page
  useEffect(() => {
    if (hasShareableModelData()) {
      router.push('/import');
    }
  }, [router]);

  const handleDeleteModel = async (model: Model) => {
    if (confirm(`Are you sure you want to delete "${model.name}"? This will also delete all associated expenses.`)) {
      try {
        await deleteModel(model.id);
        await loadModels(); // Refresh the list
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

  const handleModelCreated = async (modelId: string) => {
    setNewlyCreatedModelId(modelId);
    setIsAddModelOpen(false);
    await loadModels(); // Refresh the list
    // Auto-open expenses dialog for the newly created model
    const newModel = models.find(m => m.id === modelId);
    if (newModel) {
      setManagingExpensesModel(newModel);
    }
  };

  const handleCopyModel = async (model: Model) => {
    try {
      const result = await copyModelToClipboard(model);
      setCanPaste(true);
      
      if (result.method === 'clipboard') {
        toast.success(`Model "${model.name}" copied to clipboard`, {
          description: 'The model and all its expenses have been copied. You can now paste it.',
        });
      } else {
        toast.success(`Model "${model.name}" copied to clipboard (fallback method)`, {
          description: 'The model and all its expenses have been copied using fallback method.',
        });
      }
    } catch (error) {
      console.error('Failed to copy model:', error);
      
      // If clipboard fails, offer manual copy option
      try {
        const database = await getDatabase();
        const expenseDocs = await database.expenses.find({ selector: { modelId: model.id } }).exec();
        const expenses = expenseDocs.map(doc => doc.toJSON());
        
        const copyData = {
          model: {
            ...model,
            id: undefined,
            createdAt: undefined,
            updatedAt: undefined,
          },
          expenses: expenses.map(expense => ({
            ...expense,
            id: undefined,
            modelId: undefined,
            createdAt: undefined,
            updatedAt: undefined,
          })),
          type: 'reserve-fund-model-copy',
          timestamp: getCurrentTimestamp(),
        };
        
        setCopyDataForManual(JSON.stringify(copyData, null, 2));
        setIsManualPasteOpen(true);
        
        toast.error('Clipboard access blocked', {
          description: 'Opening manual copy dialog. You can copy the data manually.',
        });
      } catch (fallbackErr) {
        console.error('Fallback copy also failed:', fallbackErr);
        toast.error('Failed to copy model', {
          description: 'Both clipboard and manual copy methods failed. Please try again.',
        });
      }
    }
  };

  const handlePasteModel = async () => {
    try {
      const pastedModel = await pasteModelFromClipboard();
      toast.success(`Model "${pastedModel.name}" pasted successfully`, {
        description: 'The model and all its expenses have been created.',
      });
      
      await loadModels(); // Refresh the list
      // Auto-open expenses dialog for the pasted model
      setManagingExpensesModel(pastedModel);
      setNewlyCreatedModelId(pastedModel.id);
    } catch (error) {
      console.error('Failed to paste model:', error);
      
      // If clipboard paste fails, offer manual paste option
      if (error instanceof Error && (
        error.message.includes('Clipboard access denied') ||
        error.message.includes('Clipboard API not available') ||
        error.message.includes('Clipboard does not contain valid')
      )) {
        setIsManualPasteOpen(true);
        toast.error('Clipboard access blocked', {
          description: 'Opening manual paste dialog. You can paste the data manually.',
        });
      } else {
        toast.error('Failed to paste model', {
          description: error instanceof Error ? error.message : 'An unexpected error occurred',
        });
      }
    }
  };

  const handleManualPaste = async (data: string) => {
    try {
      const pastedModel = await pasteModelFromData(data);
      toast.success(`Model "${pastedModel.name}" pasted successfully`, {
        description: 'The model and all its expenses have been created.',
      });
      
      await loadModels(); // Refresh the list
      // Auto-open expenses dialog for the pasted model
      setManagingExpensesModel(pastedModel);
      setNewlyCreatedModelId(pastedModel.id);
    } catch (error) {
      console.error('Failed to paste model from manual data:', error);
      throw error; // Re-throw to let the dialog handle the error
    }
  };

  const handleShareModel = (model: Model) => {
    setSharingModel(model);
  };

  const handleRefresh = async () => {
    await Promise.all([loadModels(), loadExpenses()]);
    toast.success('Models list refreshed');
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
        <div className="text-red-500">
          Error loading dashboard: {modelsError}
          <br />
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Reload Page
          </button>
        </div>
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
              onCopy={handleCopyModel}
              onPaste={handlePasteModel}
              onRefresh={handleRefresh}
              onShare={handleShareModel}
              canPaste={canPaste}
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
          onOpenChange={async (open) => {
            if (!open) {
              setEditingModel(null);
              // Refresh models when dialog closes since the model might have been modified
              await loadModels();
            }
          }}
        />
      )}

      {managingExpensesModel && (
        <ManageExpensesDialog
          model={managingExpensesModel}
          open={!!managingExpensesModel}
          onOpenChange={async (open) => {
            if (!open) {
              setManagingExpensesModel(null);
              // Refresh expenses when dialog closes since they might have been modified
              await loadExpenses();
            }
          }}
          isNewModel={managingExpensesModel.id === newlyCreatedModelId}
        />
      )}

      <ManualPasteDialog
        open={isManualPasteOpen}
        onOpenChange={setIsManualPasteOpen}
        onPaste={handleManualPaste}
        copyData={copyDataForManual}
      />

      {sharingModel && (
        <ShareModelDialog
          model={sharingModel}
          expenses={expenses.filter(e => e.modelId === sharingModel.id)}
          open={!!sharingModel}
          onOpenChange={(open) => !open && setSharingModel(null)}
        />
      )}
    </div>
  );
}
