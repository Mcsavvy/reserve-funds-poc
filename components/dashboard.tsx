'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDatabase, useManagementCompanies, useAssociations, useModels, useLtimStrategies, useSampleData, useClearData } from '@/hooks/use-database';
import { useCurrentUser } from '@/hooks/use-local-storage';
import { Model, ManagementCompany, Association, LtimStrategy } from '@/lib/db-types';
import { DashboardHeader } from './dashboard-header';
import { DashboardStats } from './dashboard-stats';
import { QuickActions } from './quick-actions';
import { RecentActivity } from './recent-activity';
import { DataTables } from './data-tables';

export function Dashboard() {
  const router = useRouter();
  const { isInitialized, error } = useDatabase();
  
  // Separate hooks for different entity types
  const { items: managementCompanies, addItem: addManagementCompany, updateItem: updateManagementCompany, deleteItem: deleteManagementCompany, loading: companiesLoading } = useManagementCompanies();
  const { items: associations, addItem: addAssociation, updateItem: updateAssociation, deleteItem: deleteAssociation, loading: associationsLoading, getAssociationsByCompany } = useAssociations();
  const { items: models, addItem: addModel, updateItem: updateModel, deleteItem: deleteModel, loading: modelsLoading } = useModels();
  const { items: ltimStrategies, addItem: addLtimStrategy, updateItem: updateLtimStrategy, deleteItem: deleteLtimStrategy, loading: ltimStrategiesLoading } = useLtimStrategies();
  const { seedSampleData } = useSampleData();
  const { clearAllData } = useClearData();
  const [user] = useCurrentUser();

  // Handlers with page reload
  const handleSeedSampleData = async () => {
    try {
      await seedSampleData();
      // Reload page to ensure all components refresh with new data
      window.location.reload();
    } catch (error) {
      console.error('Failed to seed sample data:', error);
    }
  };

  const handleClearAllData = async () => {
    try {
      await clearAllData();
      // Reload page to ensure all components refresh with cleared data
      window.location.reload();
    } catch (error) {
      console.error('Failed to clear all data:', error);
    }
  };

  // Delete handlers with business logic
  const handleDeleteManagementCompany = async (company: ManagementCompany) => {
    const managedAssociations = getAssociationsByCompany(company.id);
    if (managedAssociations.length > 0) {
      alert(`Cannot delete "${company.company}" because it manages ${managedAssociations.length} association(s). Please reassign or delete the associations first.`);
      return;
    }

    if (window.confirm(`Are you sure you want to delete "${company.company}"?`)) {
      try {
        await deleteManagementCompany(company.id);
      } catch (error) {
        console.error('Failed to delete management company:', error);
        alert('Failed to delete management company. Please try again.');
      }
    }
  };

  const handleDeleteAssociation = async (association: Association) => {
    const associationModels = models.filter(m => m.client_id === association.id);
    if (associationModels.length > 0) {
      alert(`Cannot delete "${association.association}" because it has ${associationModels.length} model(s). Please delete the models first.`);
      return;
    }

    if (window.confirm(`Are you sure you want to delete "${association.association}"?`)) {
      try {
        await deleteAssociation(association.id);
      } catch (error) {
        console.error('Failed to delete association:', error);
        alert('Failed to delete association. Please try again.');
      }
    }
  };

  const handleDeleteModel = async (model: Model) => {
    if (window.confirm(`Are you sure you want to delete the model "${model.name}"?`)) {
      try {
        await deleteModel(model.id);
      } catch (error) {
        console.error('Failed to delete model:', error);
        alert('Failed to delete model. Please try again.');
      }
    }
  };

  const handleDeleteLtimStrategy = async (strategy: LtimStrategy) => {
    if (window.confirm(`Are you sure you want to delete the LTIM strategy "${strategy.name}" for ${strategy.state}?`)) {
      try {
        await deleteLtimStrategy(strategy.id);
      } catch (error) {
        console.error('Failed to delete LTIM strategy:', error);
        alert('Failed to delete LTIM strategy. Please try again.');
      }
    }
  };

  const handleRunSimulation = (model: Model) => {
    router.push(`/simulation/${model.id}`);
  };

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Initializing database...</p>
          {error && <p className="text-red-500 mt-2">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardHeader userName={user.name} />

        <DashboardStats 
          managementCompanies={managementCompanies}
          associations={associations}
          models={models}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <QuickActions
            managementCompanies={managementCompanies}
            associations={associations}
            onAddManagementCompany={addManagementCompany}
            onAddAssociation={addAssociation}
            onAddModel={addModel}
            onSeedSampleData={handleSeedSampleData}
            onClearAllData={handleClearAllData}
          />

          <RecentActivity models={models} />
        </div>

        <DataTables
          managementCompanies={managementCompanies}
          associations={associations}
          models={models}
          ltimStrategies={ltimStrategies}
          loading={{
            companies: companiesLoading,
            associations: associationsLoading,
            models: modelsLoading,
            ltimStrategies: ltimStrategiesLoading,
          }}
          onEditManagementCompany={() => {}} // These are handled internally in DataTables
          onEditAssociation={() => {}}
          onEditModel={() => {}}
          onEditLtimStrategy={() => {}}
          onDeleteManagementCompany={handleDeleteManagementCompany}
          onDeleteAssociation={handleDeleteAssociation}
          onDeleteModel={handleDeleteModel}
          onDeleteLtimStrategy={handleDeleteLtimStrategy}
          onRunSimulation={handleRunSimulation}
          onUpdateManagementCompany={updateManagementCompany}
          onUpdateAssociation={updateAssociation}
          onUpdateModel={updateModel}
          onUpdateLtimStrategy={updateLtimStrategy}
          onAddLtimStrategy={addLtimStrategy}
          getAssociationsByCompany={getAssociationsByCompany}
        />
      </div>
    </div>
  );
}