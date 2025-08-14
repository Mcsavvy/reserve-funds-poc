'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ManagementCompany, Association, Model, LtimInvestmentRate } from '@/lib/db-types';
import { ManagementCompaniesTable, AssociationsTable, ModelsTable, LtimInvestmentRatesTable } from './tables';
import { EditManagementCompanyForm, EditAssociationForm, EditModelForm, AddLtimRateForm, EditLtimRateForm } from './forms';
import { ModelItemsManager } from './model-items-manager';

interface DataTablesProps {
  managementCompanies: ManagementCompany[];
  associations: Association[];
  models: Model[];
  ltimRates: LtimInvestmentRate[];
  loading: {
    companies: boolean;
    associations: boolean;
    models: boolean;
    ltimRates: boolean;
  };
  onEditManagementCompany: (company: ManagementCompany) => void;
  onEditAssociation: (association: Association) => void;
  onEditModel: (model: Model) => void;
  onEditLtimRate: (rate: LtimInvestmentRate) => void;
  onDeleteManagementCompany: (company: ManagementCompany) => void;
  onDeleteAssociation: (association: Association) => void;
  onDeleteModel: (model: Model) => void;
  onDeleteLtimRate: (rate: LtimInvestmentRate) => void;
  onRunSimulation?: (model: Model) => void;
  onUpdateManagementCompany: (company: ManagementCompany) => Promise<any>;
  onUpdateAssociation: (association: Association) => Promise<any>;
  onUpdateModel: (model: Model) => Promise<any>;
  onUpdateLtimRate: (rate: LtimInvestmentRate) => Promise<any>;
  onAddLtimRate: (rate: any) => Promise<any>;
  getAssociationsByCompany: (companyId: string) => Association[];
}

export function DataTables({
  managementCompanies,
  associations,
  models,
  ltimRates,
  loading,
  onDeleteManagementCompany,
  onDeleteAssociation,
  onDeleteModel,
  onDeleteLtimRate,
  onRunSimulation,
  onUpdateManagementCompany,
  onUpdateAssociation,
  onUpdateModel,
  onUpdateLtimRate,
  onAddLtimRate,
  getAssociationsByCompany,
}: DataTablesProps) {
  // Dialog states
  const [showEditManagementCompany, setShowEditManagementCompany] = useState(false);
  const [showEditAssociation, setShowEditAssociation] = useState(false);
  const [showEditModel, setShowEditModel] = useState(false);
  const [showAddLtimRate, setShowAddLtimRate] = useState(false);
  const [showEditLtimRate, setShowEditLtimRate] = useState(false);
  const [showModelItems, setShowModelItems] = useState(false);
  
  // Selected entities for editing
  const [selectedManagementCompany, setSelectedManagementCompany] = useState<ManagementCompany | null>(null);
  const [selectedAssociation, setSelectedAssociation] = useState<Association | null>(null);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [selectedLtimRate, setSelectedLtimRate] = useState<LtimInvestmentRate | null>(null);
  const [selectedModelForItems, setSelectedModelForItems] = useState<Model | null>(null);

  // Helper functions for edit actions
  const handleEditManagementCompany = (company: ManagementCompany) => {
    setSelectedManagementCompany(company);
    setShowEditManagementCompany(true);
  };

  const handleEditAssociation = (association: Association) => {
    setSelectedAssociation(association);
    setShowEditAssociation(true);
  };

  const handleEditModel = (model: Model) => {
    setSelectedModel(model);
    setShowEditModel(true);
  };

  const handleEditLtimRate = (rate: LtimInvestmentRate) => {
    setSelectedLtimRate(rate);
    setShowEditLtimRate(true);
  };

  const handleManageItems = (model: Model) => {
    setSelectedModelForItems(model);
    setShowModelItems(true);
  };

  const totalManagementCompanies = managementCompanies.length;
  const totalAssociations = associations.length;
  const totalModels = models.length;

  return (
    <>
      <Tabs defaultValue="associations" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="companies">Companies ({totalManagementCompanies})</TabsTrigger>
          <TabsTrigger value="associations">Associations ({totalAssociations})</TabsTrigger>
          <TabsTrigger value="models">Models ({totalModels})</TabsTrigger>
          <TabsTrigger value="ltim-rates">LTIM Rates ({ltimRates.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="companies" className="space-y-4">
          <ManagementCompaniesTable 
            companies={managementCompanies}
            associations={associations}
            loading={loading.companies}
            onEdit={handleEditManagementCompany}
            onDelete={onDeleteManagementCompany}
            getAssociationsByCompany={getAssociationsByCompany}
          />
        </TabsContent>
        
        <TabsContent value="associations" className="space-y-4">
          <AssociationsTable 
            associations={associations}
            managementCompanies={managementCompanies}
            loading={loading.associations}
            onEdit={handleEditAssociation}
            onDelete={onDeleteAssociation}
          />
        </TabsContent>
        
        <TabsContent value="models" className="space-y-4">
          <ModelsTable 
            models={models} 
            associations={associations}
            loading={loading.models}
            onEdit={handleEditModel}
            onDelete={onDeleteModel}
            onRunSimulation={onRunSimulation}
            onManageItems={handleManageItems}
          />
        </TabsContent>
        
        <TabsContent value="ltim-rates" className="space-y-4">
          <LtimInvestmentRatesTable 
            ltimRates={ltimRates}
            loading={loading.ltimRates}
            onEdit={handleEditLtimRate}
            onDelete={onDeleteLtimRate}
            onAdd={() => setShowAddLtimRate(true)}
          />
        </TabsContent>
      </Tabs>

      {/* Edit Management Company Dialog */}
      <Dialog open={showEditManagementCompany} onOpenChange={setShowEditManagementCompany}>
        <DialogContent className="sm:max-w-md">
          {selectedManagementCompany && (
            <EditManagementCompanyForm 
              company={selectedManagementCompany}
              onSuccess={() => setShowEditManagementCompany(false)}
              onUpdate={onUpdateManagementCompany}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Association Dialog */}
      <Dialog open={showEditAssociation} onOpenChange={setShowEditAssociation}>
        <DialogContent className="sm:max-w-md">
          {selectedAssociation && (
            <EditAssociationForm 
              association={selectedAssociation}
              managementCompanies={managementCompanies}
              onSuccess={() => setShowEditAssociation(false)}
              onUpdate={onUpdateAssociation}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Model Dialog */}
      <Dialog open={showEditModel} onOpenChange={setShowEditModel}>
        <DialogContent className="sm:max-w-md">
          {selectedModel && (
            <EditModelForm 
              model={selectedModel}
              associations={associations}
              onSuccess={() => setShowEditModel(false)}
              onUpdate={onUpdateModel}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Add LTIM Rate Dialog */}
      <Dialog open={showAddLtimRate} onOpenChange={setShowAddLtimRate}>
        <DialogContent className="sm:max-w-md">
          <AddLtimRateForm 
            onSuccess={() => setShowAddLtimRate(false)}
            onAdd={onAddLtimRate}
          />
        </DialogContent>
      </Dialog>

      {/* Edit LTIM Rate Dialog */}
      <Dialog open={showEditLtimRate} onOpenChange={setShowEditLtimRate}>
        <DialogContent className="sm:max-w-md">
          {selectedLtimRate && (
            <EditLtimRateForm 
              ltimRate={selectedLtimRate}
              onSuccess={() => setShowEditLtimRate(false)}
              onUpdate={onUpdateLtimRate}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Model Items Management Dialog */}
      <Dialog open={showModelItems} onOpenChange={setShowModelItems}>
        <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedModelForItems && (
            <ModelItemsManager model={selectedModelForItems} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
