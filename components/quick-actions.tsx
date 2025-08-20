'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { PlusIcon, BuildingIcon, ChartBarIcon, CogIcon, Trash2Icon } from 'lucide-react';
import { ManagementCompany, Association } from '@/lib/db-types';

// We'll import these from separate form files later
import { AddManagementCompanyForm, AddAssociationForm, AddModelForm } from './forms';

interface QuickActionsProps {
  managementCompanies: ManagementCompany[];
  associations: Association[];
  onAddManagementCompany: (company: any) => Promise<any>;
  onAddAssociation: (association: any) => Promise<any>;
  onAddModel: (model: any) => Promise<any>;
  onSeedSampleData: () => Promise<void>;
  onClearAllData: () => Promise<void>;
}

export function QuickActions({
  managementCompanies,
  associations,
  onAddManagementCompany,
  onAddAssociation,
  onAddModel,
  onSeedSampleData,
  onClearAllData,
}: QuickActionsProps) {
  const [showAddManagementCompany, setShowAddManagementCompany] = useState(false);
  const [showAddAssociation, setShowAddAssociation] = useState(false);
  const [showAddModel, setShowAddModel] = useState(false);
  const [showClearConfirmation, setShowClearConfirmation] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const handleSeedSampleData = async () => {
    try {
      setIsSeeding(true);
      await onSeedSampleData();
    } catch (error) {
      console.error('Failed to seed sample data:', error);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleClearAllData = async () => {
    try {
      setIsClearing(true);
      await onClearAllData();
      setShowClearConfirmation(false);
    } catch (error) {
      console.error('Failed to clear data:', error);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Get started with common tasks</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Dialog open={showAddManagementCompany} onOpenChange={setShowAddManagementCompany}>
          <DialogTrigger asChild>
            <Button className="w-full justify-start" variant="outline">
              <CogIcon className="h-4 w-4 mr-2" />
              Add Management Company
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl">
            <AddManagementCompanyForm 
              onSuccess={() => setShowAddManagementCompany(false)}
              onAdd={onAddManagementCompany}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={showAddAssociation} onOpenChange={setShowAddAssociation}>
          <DialogTrigger asChild>
            <Button className="w-full justify-start" variant="outline">
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Association
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl">
            <AddAssociationForm 
              managementCompanies={managementCompanies}
              onSuccess={() => setShowAddAssociation(false)}
              onAdd={onAddAssociation}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={showAddModel} onOpenChange={setShowAddModel}>
          <DialogTrigger asChild>
            <Button className="w-full justify-start" variant="outline" disabled={associations.length === 0}>
              <ChartBarIcon className="h-4 w-4 mr-2" />
              Create Reserve Model
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl">
            <AddModelForm 
              associations={associations}
              onSuccess={() => setShowAddModel(false)}
              onAdd={onAddModel}
            />
          </DialogContent>
        </Dialog>

        <Button 
          className="w-full justify-start" 
          variant="outline"
          onClick={handleSeedSampleData}
          disabled={isSeeding || isClearing}
        >
          <BuildingIcon className="h-4 w-4 mr-2" />
          {isSeeding ? 'Generating...' : 'Generate Sample Data'}
        </Button>

        <Dialog open={showClearConfirmation} onOpenChange={setShowClearConfirmation}>
          <DialogTrigger asChild>
            <Button 
              className="w-full justify-start" 
              variant="outline"
              disabled={isClearing || isSeeding}
            >
              <Trash2Icon className="h-4 w-4 mr-2" />
              {isClearing ? 'Clearing...' : 'Clear All Data'}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Clear All Data</DialogTitle>
              <DialogDescription>
                This action cannot be undone. This will permanently delete all management companies, 
                associations, models, model items, LTIM rates, and all simulation data.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowClearConfirmation(false)}
                disabled={isClearing || isSeeding}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={handleClearAllData}
                disabled={isClearing || isSeeding}
              >
                {isClearing ? 'Clearing...' : 'Clear All Data'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
