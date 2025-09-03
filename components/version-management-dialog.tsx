'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Save, 
  Plus, 
  Clock, 
  User, 
  Trash2, 
  Download,
  AlertCircle
} from 'lucide-react';
import { SimulationVersion } from '@/lib/db-schemas';
import { formatDistanceToNow } from 'date-fns';

interface VersionManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  versions: SimulationVersion[];
  currentVersionId?: string;
  onSaveVersion: (name: string, description?: string) => Promise<void>;
  onLoadVersion: (version: SimulationVersion) => void;
  onDeleteVersion: (versionId: string) => Promise<void>;
  isLoading?: boolean;
  hasUnsavedChanges?: boolean;
}

export function VersionManagementDialog({
  open,
  onOpenChange,
  versions,
  currentVersionId,
  onSaveVersion,
  onLoadVersion,
  onDeleteVersion,
  isLoading = false,
  hasUnsavedChanges = false,
}: VersionManagementDialogProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newVersionName, setNewVersionName] = useState('');
  const [newVersionDescription, setNewVersionDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Auto-open create form when there are unsaved changes
  useEffect(() => {
    if (open && hasUnsavedChanges && !isCreating) {
      setIsCreating(true);
    }
  }, [open, hasUnsavedChanges, isCreating]);

  const handleSaveVersion = async () => {
    if (!newVersionName.trim()) return;
    
    setIsSaving(true);
    try {
      await onSaveVersion(newVersionName.trim(), newVersionDescription.trim() || '');
      setNewVersionName('');
      setNewVersionDescription('');
      setIsCreating(false);
    } catch (error) {
      console.error('Failed to save version:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadVersion = (version: SimulationVersion) => {
    onLoadVersion(version);
    onOpenChange(false);
  };

  const handleDeleteVersion = async (versionId: string) => {
    if (confirm('Are you sure you want to delete this version? This action cannot be undone.')) {
      await onDeleteVersion(versionId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Simulation Versions
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Create New Version Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create New Version
              </CardTitle>
              <CardDescription>
                Save the current simulation state as a new version
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!isCreating ? (
                <div className="flex items-center gap-4">
                  <Button 
                    onClick={() => setIsCreating(true)}
                    disabled={!hasUnsavedChanges || isLoading}
                    className="flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Save as Version
                  </Button>
                  {!hasUnsavedChanges && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      No changes to save
                    </Badge>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="version-name">Version Name *</Label>
                    <Input
                      id="version-name"
                      value={newVersionName}
                      onChange={(e) => setNewVersionName(e.target.value)}
                      placeholder="e.g., Baseline Scenario, Optimized Fees, etc."
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="version-description">Description (Optional)</Label>
                    <Textarea
                      id="version-description"
                      value={newVersionDescription}
                      onChange={(e) => setNewVersionDescription(e.target.value)}
                      placeholder="Describe what this version represents..."
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleSaveVersion}
                      disabled={!newVersionName.trim() || isSaving}
                      className="flex items-center gap-2"
                    >
                      <Save className="h-4 w-4" />
                      {isSaving ? 'Saving...' : 'Save Version'}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsCreating(false);
                        setNewVersionName('');
                        setNewVersionDescription('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Existing Versions Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Saved Versions
              </CardTitle>
              <CardDescription>
                Load or manage previously saved simulation versions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {versions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No versions saved yet</p>
                  <p className="text-sm">Create your first version to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {versions.map((version) => (
                    <div
                      key={version.id}
                      className={`p-4 border rounded-lg ${
                        version.id === currentVersionId
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">{version.name}</h4>
                            {version.id === currentVersionId && (
                              <Badge variant="default" className="text-xs">
                                Current
                              </Badge>
                            )}
                          </div>
                          {version.description && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {version.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(version.createdAt), { addSuffix: true })}
                            </span>
                            {version.createdBy && (
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {version.createdBy}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {version.id !== currentVersionId && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleLoadVersion(version)}
                              className="flex items-center gap-1"
                            >
                              <Download className="h-3 w-3" />
                              Load
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteVersion(version.id)}
                            className="flex items-center gap-1 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
