'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDatabase, useManagementCompanies, useAssociations, useModels, useLtimInvestmentRates, useSampleData } from '@/hooks/use-database';
import { useCurrentUser } from '@/hooks/use-local-storage';
import { Model, ManagementCompany, Association, LtimInvestmentRate } from '@/lib/db-types';
import { DashboardHeader } from './dashboard-header';
import { DashboardStats } from './dashboard-stats';
import { QuickActions } from './quick-actions';
import { RecentActivity } from './recent-activity';
import { DataTables } from './data-tables';

export function Dashboard() {
  const router = useRouter();
  const { isInitialized, error, clearAllData } = useDatabase();
  
  // Separate hooks for different entity types
  const { items: managementCompanies, addItem: addManagementCompany, updateItem: updateManagementCompany, deleteItem: deleteManagementCompany, loading: companiesLoading } = useManagementCompanies();
  const { items: associations, addItem: addAssociation, updateItem: updateAssociation, deleteItem: deleteAssociation, loading: associationsLoading, getAssociationsByCompany } = useAssociations();
  const { items: models, addItem: addModel, updateItem: updateModel, deleteItem: deleteModel, loading: modelsLoading } = useModels();
  const { items: ltimRates, addItem: addLtimRate, updateItem: updateLtimRate, deleteItem: deleteLtimRate, loading: ltimRatesLoading } = useLtimInvestmentRates();
  const { seedSampleData } = useSampleData();
  const [user] = useCurrentUser();

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

  const handleDeleteLtimRate = async (rate: LtimInvestmentRate) => {
    if (window.confirm(`Are you sure you want to delete the LTIM rate "${rate.bucket_name}" for ${rate.state}?`)) {
      try {
        await deleteLtimRate(rate.id);
      } catch (error) {
        console.error('Failed to delete LTIM rate:', error);
        alert('Failed to delete LTIM rate. Please try again.');
      }
    }
  };

  const handleRunSimulation = (model: Model) => {
    router.push(`/simulation/${model.id}`);
  };

  const handleClearAllData = async () => {
    if (window.confirm('Are you sure you want to clear ALL data? This action cannot be undone and will remove all management companies, associations, models, and settings.')) {
      try {
        await clearAllData();
        alert('All data has been cleared successfully.');
        // Trigger a page reload to refresh all components
        window.location.reload();
      } catch (error) {
        console.error('Failed to clear all data:', error);
        alert('Failed to clear all data. Please try again.');
      }
    }
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
            onSeedSampleData={seedSampleData}
            onClearAllData={handleClearAllData}
          />

          <RecentActivity models={models} />
        </div>

        <DataTables
          managementCompanies={managementCompanies}
          associations={associations}
          models={models}
          ltimRates={ltimRates}
          loading={{
            companies: companiesLoading,
            associations: associationsLoading,
            models: modelsLoading,
            ltimRates: ltimRatesLoading,
          }}
          onEditManagementCompany={() => {}} // These are handled internally in DataTables
          onEditAssociation={() => {}}
          onEditModel={() => {}}
          onEditLtimRate={() => {}}
          onDeleteManagementCompany={handleDeleteManagementCompany}
          onDeleteAssociation={handleDeleteAssociation}
          onDeleteModel={handleDeleteModel}
          onDeleteLtimRate={handleDeleteLtimRate}
          onRunSimulation={handleRunSimulation}
          onUpdateManagementCompany={updateManagementCompany}
          onUpdateAssociation={updateAssociation}
          onUpdateModel={updateModel}
          onUpdateLtimRate={updateLtimRate}
          onAddLtimRate={addLtimRate}
          getAssociationsByCompany={getAssociationsByCompany}
        />
      </div>
    </div>
  );
}