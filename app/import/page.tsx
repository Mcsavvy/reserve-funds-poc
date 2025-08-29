'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Download, ArrowLeft, Check } from 'lucide-react';
import { useModels } from '@/hooks/use-database';
import { getShareableModelFromCurrentUrl, clearShareableDataFromUrl, ShareableModelData } from '@/lib/url-sharing';
import { formatCurrency, formatPercentage } from '@/lib/db-utils';
import { toast } from 'sonner';
import Image from 'next/image';
import { useExpenses } from '@/hooks/use-database';

export default function ImportPage() {
  const router = useRouter();
  const { createModel, loadModels } = useModels();
  const { createExpense } = useExpenses();
  const [shareData, setShareData] = useState<ShareableModelData | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const data = getShareableModelFromCurrentUrl();
    if (data) {
      setShareData(data);
    } else {
      setError('No valid model data found in the URL');
    }
  }, []);

  const handleImport = async () => {
    if (!shareData) return;

    try {
      setIsImporting(true);
      setError(null);

      // Create the model
      const newModel = await createModel({ ...shareData.model, name: `${shareData.model.name} (Imported)` });

      // Create expenses if any
      if (shareData.expenses && shareData.expenses.length > 0) {
        for (const expenseData of shareData.expenses) {
          await createExpense({
            ...expenseData,
            modelId: newModel.id,
          });
        }
      }

      // Clear the URL data
      clearShareableDataFromUrl();

      toast.success(`Model "${newModel.name}" imported successfully`, {
        description: `Imported with ${shareData.expenses?.length || 0} expenses.`,
      });

      // Redirect to the main page
      router.push('/');
    } catch (err) {
      console.error('Failed to import model:', err);
      setError(err instanceof Error ? err.message : 'Failed to import model');
    } finally {
      setIsImporting(false);
    }
  };

  const handleCancel = () => {
    clearShareableDataFromUrl();
    router.push('/');
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <span>Import Error</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button onClick={handleCancel} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!shareData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p>Loading model data...</p>
          </CardContent>
        </Card>
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
                <h1 className="text-xl font-bold text-gray-900">Import Shared Model</h1>
                <p className="text-sm text-gray-500">Review and import the shared model</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Model Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Model Preview</span>
                <Badge variant="outline">
                  {shareData.expenses?.length || 0} expenses
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Model Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Model Name</label>
                  <p className="text-lg font-semibold">{shareData.model.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Fiscal Year</label>
                  <p className="text-lg">{shareData.model.fiscalYear}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Period (Years)</label>
                  <p className="text-lg">{shareData.model.period}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Starting Amount</label>
                  <p className="text-lg">{formatCurrency(shareData.model.startingAmount)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Monthly Fees/Unit</label>
                  <p className="text-lg">{formatCurrency(shareData.model.monthlyReserveFeesPerHousingUnit)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Housing Units</label>
                  <p className="text-lg">{shareData.model.housingUnits?.toLocaleString() || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Inflation Rate</label>
                  <p className="text-lg">{formatPercentage(shareData.model.inflationRate)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Safety Net</label>
                  <p className="text-lg">{formatPercentage(shareData.model.safetyNetPercentage)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Bank Interest Rate</label>
                  <p className="text-lg">{formatPercentage(shareData.model.bankInterestRate)}</p>
                </div>
              </div>

              {/* Expenses Preview */}
              {shareData.expenses && shareData.expenses.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Expenses</h3>
                  <div className="space-y-2">
                    {shareData.expenses.map((expense, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{expense.name}</p>
                          <p className="text-sm text-gray-500">
                            Expected Life: {expense.expectedLife} years |
                            Remaining Life: {expense.remainingLife} years
                            {expense.sirs && <span className="ml-2 text-blue-600">• SIRS</span>}
                          </p>
                        </div>
                        <p className="font-semibold">{formatCurrency(expense.cost)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Import Info */}
              <Alert>
                <Check className="h-4 w-4" />
                <AlertDescription>
                  This will create a new model in your database with all the settings and expenses shown above.
                  The model will be named "{shareData.model.name} (Imported)".
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={handleCancel} disabled={isImporting}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={isImporting}>
              <Download className="h-4 w-4 mr-2" />
              {isImporting ? 'Importing...' : 'Import Model'}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
