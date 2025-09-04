import { useState, useEffect, useCallback } from 'react';
import { getDatabase, generateId, getCurrentTimestamp } from '@/lib/database';
import { SimulationVersion } from '@/lib/db-schemas';
import { SimulationParams } from '@/lib/simulation';
import { SimulationInvestment } from '@/components/add-simulation-investment-dialog';

export interface CreateVersionData {
  name: string;
  description?: string;
  modelSnapshot: SimulationParams;
  yearAdjustments: Record<number, any>;
  simulationInvestments: Record<number, SimulationInvestment[]>;
}

export const useSimulationVersions = (modelId: string) => {
  const [versions, setVersions] = useState<SimulationVersion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load versions for a model
  const loadVersions = useCallback(async () => {
    if (!modelId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const db = await getDatabase();
      const versionsCollection = db.simulationVersions;
      
      const modelVersions = await versionsCollection
        .find({
          selector: { modelId }
        })
        .sort({ createdAt: 'desc' })
        .exec();
      
      setVersions(modelVersions.map(v => v.toJSON() as SimulationVersion));
    } catch (err) {
      setError('Failed to load versions');
      console.error('Error loading versions:', err);
    } finally {
      setIsLoading(false);
    }
  }, [modelId]);

  // Create a new version
  const createVersion = useCallback(async (versionData: CreateVersionData): Promise<SimulationVersion | null> => {
    if (!modelId) return null;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const db = await getDatabase();
      const versionsCollection = db.simulationVersions;
      
      const newVersion = {
        id: generateId(),
        modelId,
        name: versionData.name,
        description: versionData.description || '', // Use empty string if description is null/undefined
        modelSnapshot: versionData.modelSnapshot,
        yearAdjustments: versionData.yearAdjustments,
        simulationInvestments: versionData.simulationInvestments,
        createdAt: getCurrentTimestamp(),
        createdBy: 'user', // TODO: Get actual user ID when auth is implemented
      };
      
      const doc = await versionsCollection.insert(newVersion);
      const createdVersion = doc.toJSON() as SimulationVersion;
      
      // Refresh versions list
      await loadVersions();
      
      return createdVersion;
    } catch (err) {
      setError('Failed to create version');
      console.error('Error creating version:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [modelId, loadVersions]);

  // Load a specific version
  const loadVersion = useCallback(async (versionId: string): Promise<SimulationVersion | null> => {
    try {
      const db = await getDatabase();
      const versionsCollection = db.simulationVersions;
      
      const version = await versionsCollection.findOne(versionId).exec();
      return version ? version.toJSON() as SimulationVersion : null;
    } catch (err) {
      setError('Failed to load version');
      console.error('Error loading version:', err);
      return null;
    }
  }, []);

  // Delete a version
  const deleteVersion = useCallback(async (versionId: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const db = await getDatabase();
      const versionsCollection = db.simulationVersions;
      
      const version = await versionsCollection.findOne(versionId).exec();
      if (version) {
        await version.remove();
        await loadVersions(); // Refresh list
        return true;
      }
      return false;
    } catch (err) {
      setError('Failed to delete version');
      console.error('Error deleting version:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [loadVersions]);

  // Load versions when modelId changes
  useEffect(() => {
    loadVersions();
  }, [loadVersions]);

  return {
    versions,
    isLoading,
    error,
    createVersion,
    loadVersion,
    deleteVersion,
    loadVersions,
  };
};
