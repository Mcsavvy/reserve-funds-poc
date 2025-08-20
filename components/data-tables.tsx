'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ManagementCompany, Association, Model, LtimStrategy } from '@/lib/db-types';
import { ManagementCompaniesTable, AssociationsTable, ModelsTable } from './tables';
import { LtimStrategiesTable } from './tables/ltim-strategies-table';
import { EditManagementCompanyForm, EditAssociationForm, EditModelForm, AddLtimStrategyForm, EditLtimStrategyForm } from './forms';
import { ModelItemsManager } from './model-items-manager';

interface DataTablesProps {
  managementCompanies: ManagementCompany[];
  associations: Association[];
  models: Model[];
  ltimStrategies: LtimStrategy[];
  loading: {
    companies: boolean;
    associations: boolean;
    models: boolean;
    ltimStrategies: boolean;
  };
  onEditManagementCompany: (company: ManagementCompany) => void;
  onEditAssociation: (association: Association) => void;
  onEditModel: (model: Model) => void;
  onEditLtimStrategy: (strategy: LtimStrategy) => void;
  onDeleteManagementCompany: (company: ManagementCompany) => void;
  onDeleteAssociation: (association: Association) => void;
  onDeleteModel: (model: Model) => void;
  onDeleteLtimStrategy: (strategy: LtimStrategy) => void;
  onRunSimulation?: (model: Model) => void;
  onUpdateManagementCompany: (company: ManagementCompany) => Promise<any>;
  onUpdateAssociation: (association: Association) => Promise<any>;
  onUpdateModel: (model: Model) => Promise<any>;
  onUpdateLtimStrategy: (strategy: LtimStrategy) => Promise<any>;
  onAddLtimStrategy: (strategy: any) => Promise<any>;
  getAssociationsByCompany: (companyId: string) => Association[];
}

export function DataTables({
  managementCompanies,
  associations,
  models,
  ltimStrategies,
  loading,
  onDeleteManagementCompany,
  onDeleteAssociation,
  onDeleteModel,
  onDeleteLtimStrategy,
  onRunSimulation,
  onUpdateManagementCompany,
  onUpdateAssociation,
  onUpdateModel,
  onUpdateLtimStrategy,
  onAddLtimStrategy,
  getAssociationsByCompany,
}: DataTablesProps) {
  // Dialog states
  const [showEditManagementCompany, setShowEditManagementCompany] = useState(false);
  const [showEditAssociation, setShowEditAssociation] = useState(false);
  const [showEditModel, setShowEditModel] = useState(false);

  const [showModelItems, setShowModelItems] = useState(false);
  
  // Selected entities for editing
  const [selectedManagementCompany, setSelectedManagementCompany] = useState<ManagementCompany | null>(null);
  const [selectedAssociation, setSelectedAssociation] = useState<Association | null>(null);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);

  const [selectedModelForItems, setSelectedModelForItems] = useState<Model | null>(null);
  
  // LTIM Strategy editing state
  const [showEditLtimStrategy, setShowEditLtimStrategy] = useState(false);
  const [selectedLtimStrategy, setSelectedLtimStrategy] = useState<LtimStrategy | null>(null);
  const [showAddLtimStrategy, setShowAddLtimStrategy] = useState(false);

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

  const handleManageItems = (model: Model) => {
    setSelectedModelForItems(model);
    setShowModelItems(true);
  };

  const handleEditLtimStrategy = (strategy: LtimStrategy) => {
    setSelectedLtimStrategy(strategy);
    setShowEditLtimStrategy(true);
  };

  const handleAddLtimStrategy = () => {
    setShowAddLtimStrategy(true);
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
          <TabsTrigger value="ltim-strategies">LTIM Strategies ({ltimStrategies.length})</TabsTrigger>
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
        
        <TabsContent value="ltim-strategies" className="space-y-4">
          <LtimStrategiesTable 
            ltimStrategies={ltimStrategies}
            loading={loading.ltimStrategies}
            onEdit={handleEditLtimStrategy}
            onDelete={onDeleteLtimStrategy}
            onAdd={handleAddLtimStrategy}
          />
        </TabsContent>
      </Tabs>

      {/* Edit Management Company Dialog */}
      <Dialog open={showEditManagementCompany} onOpenChange={setShowEditManagementCompany}>
        <DialogContent className="sm:max-w-xl">
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
        <DialogContent className="sm:max-w-xl">
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
        <DialogContent className="sm:max-w-xl">
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
      {/* Edit LTIM Strategy Dialog */}
      <Dialog open={showEditLtimStrategy} onOpenChange={setShowEditLtimStrategy}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedLtimStrategy && (
            <EditLtimStrategyForm 
              strategy={selectedLtimStrategy}
              onSuccess={() => setShowEditLtimStrategy(false)}
              onUpdate={onUpdateLtimStrategy}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Add LTIM Strategy Dialog */}
      <Dialog open={showAddLtimStrategy} onOpenChange={setShowAddLtimStrategy}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <AddLtimStrategyForm 
            onSuccess={() => setShowAddLtimStrategy(false)}
            onAdd={onAddLtimStrategy}
          />
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
