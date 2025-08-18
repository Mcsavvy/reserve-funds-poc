'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { PlusIcon, BuildingIcon, ChartBarIcon, CogIcon, TrashIcon } from 'lucide-react';
import { ManagementCompany, Association } from '@/lib/db-types';

// We'll import these from separate form files later
import { AddManagementCompanyForm, AddAssociationForm, AddModelForm } from './forms';

interface QuickActionsProps {
  managementCompanies: ManagementCompany[];
  associations: Association[];
  onAddManagementCompany: (company: any) => Promise<any>;
  onAddAssociation: (association: any) => Promise<any>;
  onAddModel: (model: any) => Promise<any>;
  onSeedSampleData: () => void;
  onClearAllData: () => void;
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
          <DialogContent className="sm:max-w-md">
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
          <DialogContent className="sm:max-w-md">
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
          <DialogContent className="sm:max-w-md">
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
          onClick={onSeedSampleData}
        >
          <BuildingIcon className="h-4 w-4 mr-2" />
          Generate Sample Data
        </Button>

        <Button 
          className="w-full justify-start" 
          variant="destructive"
          onClick={onClearAllData}
        >
          <TrashIcon className="h-4 w-4 mr-2" />
          Clear All Data
        </Button>
      </CardContent>
    </Card>
  );
}
