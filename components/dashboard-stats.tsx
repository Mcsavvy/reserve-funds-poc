'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BuildingIcon, ChartBarIcon, UsersIcon, CogIcon } from 'lucide-react';
import { ManagementCompany, Association, Model } from '@/lib/db-types';
import { formatCurrency } from '@/lib/reserve-calculations';

interface DashboardStatsProps {
  managementCompanies: ManagementCompany[];
  associations: Association[];
  models: Model[];
}

export function DashboardStats({ managementCompanies, associations, models }: DashboardStatsProps) {
  const activeModels = models.filter(m => m.active);
  const totalManagementCompanies = managementCompanies.length;
  const totalAssociations = associations.length;
  const totalModels = models.length;
  const totalReserveValue = activeModels.reduce((sum, m) => sum + m.starting_amount, 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Management Companies</CardTitle>
          <CogIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalManagementCompanies}</div>
          <p className="text-xs text-muted-foreground">managing properties</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Associations</CardTitle>
          <UsersIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalAssociations}</div>
          <p className="text-xs text-muted-foreground">HOAs and communities</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Reserve Models</CardTitle>
          <ChartBarIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activeModels.length}</div>
          <p className="text-xs text-muted-foreground">of {totalModels} total</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Reserve Value</CardTitle>
          <BuildingIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(totalReserveValue)}
          </div>
          <p className="text-xs text-muted-foreground">across all models</p>
        </CardContent>
      </Card>
    </div>
  );
}
