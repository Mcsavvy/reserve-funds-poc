'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EditIcon, Trash2Icon, MoreHorizontalIcon, SearchIcon, XIcon, PlayIcon, ListIcon, PlusIcon } from 'lucide-react';
import { ManagementCompany, Association, Model, LtimInvestmentRate, ModelItem } from '@/lib/db-types';
import { formatCurrency } from '@/lib/reserve-calculations';
import { US_STATES } from "../../lib/constants"

// Models Table Component
export function ModelsTable({ 
  models, 
  associations, 
  loading, 
  onEdit, 
  onDelete,
  onRunSimulation,
  onManageItems
}: { 
  models: Model[]; 
  associations: Association[]; 
  loading: boolean;
  onEdit: (model: Model) => void;
  onDelete: (model: Model) => void;
  onRunSimulation?: (model: Model) => void;
  onManageItems?: (model: Model) => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAssociation, setSelectedAssociation] = useState<string>('all');

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getAssociationName = (clientId: string) => {
    const association = associations.find(a => a.id === clientId);
    return association?.association || 'Unknown Association';
  };

  // Filter models based on search term and selected association
  const filteredModels = models.filter((model) => {
    const matchesSearch = searchTerm === '' || 
      model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getAssociationName(model.client_id).toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAssociation = selectedAssociation === 'all' || 
      model.client_id === selectedAssociation;
    
    return matchesSearch && matchesAssociation;
  });

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedAssociation('all');
  };

  const hasActiveFilters = searchTerm !== '' || selectedAssociation !== 'all';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reserve Fund Models</CardTitle>
        <CardDescription>Track and analyze your reserve fund models</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Search and Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search models or associations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Select value={selectedAssociation} onValueChange={setSelectedAssociation}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by association" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Associations</SelectItem>
                {associations.map((association) => (
                  <SelectItem key={association.id} value={association.id}>
                    {association.association}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <XIcon className="h-4 w-4 mr-2" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Results Summary */}
        {hasActiveFilters && (
          <div className="mb-4 text-sm text-gray-600">
            Showing {filteredModels.length} of {models.length} models
          </div>
        )}

        <div className="space-y-4">
          {filteredModels.map((model) => (
            <div key={model.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <h3 className="font-medium">{model.name}</h3>
                <p className="text-sm text-gray-600">{getAssociationName(model.client_id)}</p>
                <div className="flex items-center space-x-4 mt-2">
                  <span className="text-sm">
                    Starting: {formatCurrency(model.starting_amount)}
                  </span>
                  <span className="text-sm">
                    Monthly: {formatCurrency(model.monthly_fees)}
                  </span>
                  <span className="text-sm">
                    Units: {model.housing}
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm text-gray-600">
                    FY {model.fiscal_year}
                  </p>
                  <Badge variant={model.active ? 'default' : 'secondary'}>
                    {model.active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontalIcon className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                  {onRunSimulation && (
                    <DropdownMenuItem onClick={() => onRunSimulation(model)}>
                      <PlayIcon className="h-4 w-4 mr-2" />
                      Run Simulation
                    </DropdownMenuItem>
                  )}
                  {onManageItems && (
                    <DropdownMenuItem onClick={() => onManageItems(model)}>
                      <ListIcon className="h-4 w-4 mr-2" />
                      Manage Items
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => onEdit(model)}>
                    <EditIcon className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onDelete(model)} 
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2Icon className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
          {filteredModels.length === 0 && models.length > 0 && (
            <div className="text-center py-8 text-gray-500">
              <SearchIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No models found matching your search criteria.</p>
              <Button variant="link" onClick={clearFilters} className="mt-2">
                Clear filters to see all models
              </Button>
            </div>
          )}
          {models.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No models found. Create your first model to begin analysis.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Management Companies Table Component
export function ManagementCompaniesTable({ 
  companies, 
  associations,
  loading, 
  onEdit, 
  onDelete,
  getAssociationsByCompany
}: { 
  companies: ManagementCompany[]; 
  associations: Association[];
  loading: boolean;
  onEdit: (company: ManagementCompany) => void;
  onDelete: (company: ManagementCompany) => void;
  getAssociationsByCompany: (companyId: string) => Association[];
}) {
  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Management Companies</CardTitle>
        <CardDescription>Property management companies and their managed associations</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {companies.map((company) => {
            const managedAssociations = getAssociationsByCompany(company.id);
            return (
              <div key={company.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <h3 className="font-medium">{company.company}</h3>
                  <p className="text-sm text-gray-600">{company.email}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="outline">{company.company_type}</Badge>
                    <span className="text-sm text-gray-500">
                      Manages {managedAssociations.length} association{managedAssociations.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-sm text-gray-600">
                      Created {new Date(company.created_at).toLocaleDateString()}
                    </p>
                    <Badge variant={company.active ? 'default' : 'secondary'}>
                      {company.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontalIcon className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(company)}>
                        <EditIcon className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => onDelete(company)} 
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2Icon className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
          {companies.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No management companies found. Add your first management company to get started.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Associations Table Component
export function AssociationsTable({ 
  associations, 
  managementCompanies,
  loading, 
  onEdit, 
  onDelete 
}: { 
  associations: Association[]; 
  managementCompanies: ManagementCompany[];
  loading: boolean;
  onEdit: (association: Association) => void;
  onDelete: (association: Association) => void;
}) {
  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getManagementCompanyName = (companyId?: string) => {
    if (!companyId) return 'Independent';
    const company = managementCompanies.find(c => c.id === companyId);
    return company?.company || 'Unknown Company';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Associations</CardTitle>
        <CardDescription>Homeowners associations and community organizations</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {associations.map((association) => (
            <div key={association.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <h3 className="font-medium">{association.association}</h3>
                <p className="text-sm text-gray-600">{association.email}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge variant="default">Association</Badge>
                  <Badge variant="outline">{association.company_type}</Badge>
                  <span className="text-sm text-gray-500">
                    Managed by: {getManagementCompanyName(association.company_id)}
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm text-gray-600">
                    Created {new Date(association.created_at).toLocaleDateString()}
                  </p>
                  <Badge variant={association.active ? 'default' : 'secondary'}>
                    {association.active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontalIcon className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(association)}>
                      <EditIcon className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onDelete(association)} 
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2Icon className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
          {associations.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No associations found. Add your first association to get started.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// LTIM Investment Rates Table Component
// Model Items Table Component
export function ModelItemsTable({ 
  modelItems, 
  loading, 
  onEdit, 
  onDelete,
  onAdd,
  modelName
}: { 
  modelItems: ModelItem[]; 
  loading: boolean;
  onEdit: (item: ModelItem) => void;
  onDelete: (item: ModelItem) => void;
  onAdd: () => void;
  modelName?: string;
}) {
  
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Model Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Model Items</CardTitle>
          <CardDescription>
            {modelName ? `Components and items for ${modelName}` : 'Components and items in this reserve fund model'}
          </CardDescription>
        </div>
        <Button onClick={onAdd} size="sm">
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {modelItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h4 className="font-medium">{item.name}</h4>
                  {item.is_sirs && (
                    <Badge variant="destructive" className="text-xs">
                      SIRS
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Cost: </span>
                    {formatCurrency(item.cost)}
                  </div>
                  <div>
                    <span className="font-medium">Life: </span>
                    {item.remaining_life} years
                  </div>
                  <div>
                    <span className="font-medium">Redundancy: </span>
                    {item.redundancy}
                  </div>
                  <div>
                    <span className="font-medium">Type: </span>
                    {item.is_sirs ? 'SIRS' : 'Standard'}
                  </div>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontalIcon className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(item)}>
                    <EditIcon className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onDelete(item)}
                    className="text-red-600"
                  >
                    <Trash2Icon className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}

          {modelItems.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <PlusIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No items found for this model.</p>
              <Button variant="link" onClick={onAdd} className="mt-2">
                Add your first item
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function LtimInvestmentRatesTable({ 
  ltimRates, 
  loading, 
  onEdit, 
  onDelete,
  onAdd
}: { 
  ltimRates: LtimInvestmentRate[]; 
  loading: boolean;
  onEdit: (rate: LtimInvestmentRate) => void;
  onDelete: (rate: LtimInvestmentRate) => void;
  onAdd: () => void;
}) {
  
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>LTIM Investment Rates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStateName = (stateCode: string) => {
    const state = US_STATES.find(s => s.code === stateCode);
    return state ? `${state.name} (${stateCode})` : stateCode;
  };

  // Group rates by state
  const ratesByState = ltimRates.reduce((acc, rate) => {
    if (!acc[rate.state]) {
      acc[rate.state] = [];
    }
    acc[rate.state].push(rate);
    return acc;
  }, {} as Record<string, LtimInvestmentRate[]>);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>LTIM Investment Rates</CardTitle>
          <CardDescription>Long-term investment management rates by state and bucket</CardDescription>
        </div>
        <Button onClick={onAdd} size="sm">
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Rate
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {Object.entries(ratesByState).map(([state, rates]) => (
            <div key={state} className="border rounded-lg p-4">
              <h3 className="font-medium text-lg mb-3">{getStateName(state)}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rates
                  .filter(rate => rate.active)
                  .sort((a, b) => a.bucket_name.localeCompare(b.bucket_name))
                  .map((rate) => (
                    <div key={rate.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{rate.bucket_name}</h4>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontalIcon className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEdit(rate)}>
                              <EditIcon className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => onDelete(rate)}
                              className="text-red-600"
                            >
                              <Trash2Icon className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="text-2xl font-bold text-blue-600 mb-1">
                        {rate.rate}%
                      </div>
                      {rate.bucket_description && (
                        <p className="text-sm text-gray-600">{rate.bucket_description}</p>
                      )}
                      {rate.effective_date && (
                        <p className="text-xs text-gray-500 mt-2">
                          Effective: {new Date(rate.effective_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ))}

          {Object.keys(ratesByState).length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No LTIM investment rates found. Add your first rate to get started.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export { LtimStrategiesTable } from './ltim-strategies-table';
