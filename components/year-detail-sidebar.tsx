'use client';

import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarDays, Edit, TrendingUp, ChevronDown } from 'lucide-react';
import { YearProjection, SimulationParams } from '@/lib/simulation';
import { AddSimulationInvestmentDialog, SimulationInvestment } from '@/components/add-simulation-investment-dialog';
import {
  BalanceOverviewCard,
  CollectionsDetailsCard,
  ExpensesDetailsCard,
  LoanDetailsCard,
  SafetyNetCard,
  FinancialInsightsCard,
  WarningsCard,
  InvestmentSummaryCard,
  InvestmentLiquidationsCard,
  OngoingInvestmentsCard,
  EditYearForm,
} from '@/components/year-detail';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { z } from 'zod';

// Schema for year-specific adjustments
const YearAdjustmentSchema = z.object({
  openingBalance: z.number(),
  collections: z.number().min(0, 'Collections cannot be negative'),
  expenses: z.number().min(0, 'Expenses cannot be negative'),
  safetyNet: z.number().min(0, 'Safety net cannot be negative'),
  loansTaken: z.number().min(0, 'Loans taken cannot be negative'),
  loanPayments: z.number().min(0, 'Loan payments cannot be negative'),
  investmentLiquidations: z.number().min(0, 'Investment liquidations cannot be negative'),
  monthlyFee: z.number().min(0, 'Monthly fee cannot be negative'),
});

type YearAdjustmentData = z.infer<typeof YearAdjustmentSchema>;

interface YearDetailSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  yearProjection: YearProjection;
  model: SimulationParams;
  onYearAdjustment: (year: number, adjustments: YearAdjustmentData) => void;
  onAddInvestment?: (investment: SimulationInvestment) => void;
  onLiquidateInvestment?: (investment: SimulationInvestment, startYear: number, currentYear: number) => void;
  onUnliquidateInvestment?: (investment: SimulationInvestment, startYear: number) => void;
  availableYears: number[];
  onYearChange: (year: number) => void;
}

export function YearDetailSidebar({ 
  open, 
  onOpenChange, 
  yearProjection, 
  model,
  onYearAdjustment,
  onAddInvestment,
  onLiquidateInvestment,
  onUnliquidateInvestment,
  availableYears,
  onYearChange
}: YearDetailSidebarProps) {


  
  // State for investment dialog
  const [isAddInvestmentOpen, setIsAddInvestmentOpen] = useState(false);

  // For now, use the original projection as adjusted projection
  // The EditYearForm component will handle the actual adjustments
  const adjustedProjection = yearProjection;
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CalendarDays className="h-5 w-5" />
              <Select onValueChange={(value) => onYearChange(parseInt(value))} value={yearProjection.year.toString()}>
                <SelectTrigger className="w-[120px] font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      Year {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="overview" className="mt-6 p-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="investments">
              <div className="flex items-center space-x-1">
                <TrendingUp className="h-3 w-3" />
                <span>Investments</span>
              </div>
            </TabsTrigger>
            <TabsTrigger value="edit">
              <div className="flex items-center space-x-1">
                <Edit className="h-3 w-3" />
                <span>Edit</span>
              </div>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            <BalanceOverviewCard 
              adjustedProjection={adjustedProjection} 
              model={model} 
            />
            <CollectionsDetailsCard 
              adjustedProjection={adjustedProjection} 
              model={model} 
            />
            <ExpensesDetailsCard 
              adjustedProjection={adjustedProjection} 
              model={model} 
            />
            <LoanDetailsCard 
              adjustedProjection={adjustedProjection} 
              model={model} 
            />
            <SafetyNetCard 
              adjustedProjection={adjustedProjection} 
              model={model} 
            />
            <FinancialInsightsCard 
              adjustedProjection={adjustedProjection} 
              model={model} 
            />
            <WarningsCard 
              adjustedProjection={adjustedProjection} 
            />
          </TabsContent>

          <TabsContent value="investments" className="space-y-6 mt-6">
            <InvestmentSummaryCard 
              adjustedProjection={adjustedProjection}
              onAddInvestment={onAddInvestment ? () => setIsAddInvestmentOpen(true) : undefined}
            />
            <InvestmentLiquidationsCard 
              adjustedProjection={adjustedProjection}
              onUnliquidateInvestment={onUnliquidateInvestment}
            />
            <OngoingInvestmentsCard 
              adjustedProjection={adjustedProjection}
              onLiquidateInvestment={onLiquidateInvestment}
            />

            {/* No Investments Message */}
            {(!adjustedProjection.investmentLiquidations || adjustedProjection.investmentLiquidations.length === 0) && 
             (!adjustedProjection.simulationInvestmentDetails?.ongoingInvestments || 
              adjustedProjection.simulationInvestmentDetails.ongoingInvestments.length === 0) && (
              <Card>
                <CardContent className="text-center py-8 text-gray-500">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No investments this year</p>
                  <p className="text-sm">Add investments to see their performance and liquidations</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="edit" className="space-y-6 mt-6">
            <EditYearForm
              yearProjection={yearProjection}
              model={model}
              adjustedProjection={adjustedProjection}
              onYearAdjustment={onYearAdjustment}
            />
          </TabsContent>
        </Tabs>
      </SheetContent>
      
      {/* Add Investment Dialog */}
      {onAddInvestment && (
        <AddSimulationInvestmentDialog
          open={isAddInvestmentOpen}
          onOpenChange={setIsAddInvestmentOpen}
          year={yearProjection.year}
          availableToInvest={adjustedProjection.openingBalance + adjustedProjection.collections - adjustedProjection.expenses - adjustedProjection.safetyNet - (adjustedProjection.loanPayments || 0)}
          onAddInvestment={onAddInvestment}
        />
      )}
    </Sheet>
  );
}
