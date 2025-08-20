'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { InfoIcon, AlertTriangleIcon } from 'lucide-react';
import { 
  LTIMStrategyData, 
  LTIMSettings, 
  Model 
} from '@/lib/db-types';
import { 
  validateLTIMSettings,
  formatLTIMRate,
  getLTIMStrategyTotalDuration,
  convertDbStrategyToData
} from '@/lib/ltim-calculations';
import { useLtimStrategies } from '@/hooks/use-database';
import { formatCurrency } from '@/lib/financial-simulator';


interface LTIMSettingsProps {
  model: Model;
  settings: LTIMSettings;
  onSettingsChange: (settings: LTIMSettings) => void;
  surplusAmount?: number; // Optional for calculations
}

export function LTIMSettingsComponent({
  model,
  settings,
  onSettingsChange,
  surplusAmount = 0
}: LTIMSettingsProps) {
  const { items: strategies, loading: strategiesLoading } = useLtimStrategies();

  // Find the selected strategy from database
  const selectedDbStrategy = strategies.find(s => s.id === model.ltim_strategy_id && s.active);
  const strategy = selectedDbStrategy ? convertDbStrategyToData(selectedDbStrategy) : null;
  const validation = validateLTIMSettings(settings);

  // Calculate preview values
  const ltimInvestmentAmount = surplusAmount * (model.ltim_percentage / 100);
  const clientInvestmentAmount = surplusAmount - ltimInvestmentAmount;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          LTIM Investment Strategy
          <Badge variant={model.ltim_enabled ? "default" : "secondary"}>
            {model.ltim_enabled ? "Enabled" : "Disabled"}
          </Badge>
        </CardTitle>
        <CardDescription>
          Configure Long-Term Investment Management settings and strategy
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Validation Alerts */}
        {!validation.isValid && (
          <Alert variant="destructive">
            <AlertTriangleIcon className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                {validation.errors.map((error, index) => (
                  <div key={index}>{error}</div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Enable/Disable Switch */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base">Enable LTIM Strategy</Label>
            <div className="text-sm text-gray-500">
              Use sophisticated time-bucketed investment strategies
            </div>
          </div>
          <Switch
            checked={model.ltim_enabled}
            onCheckedChange={(value) => onSettingsChange({ ...settings, enabled: value })}
          />
        </div>

        {model.ltim_enabled && (
          <>
            <Separator />

            {/* Strategy Selection */}
            <div className="space-y-2">
              <Label htmlFor="strategy_id">LTIM Strategy</Label>
              <Select 
                value={model.ltim_strategy_id || ''} 
                onValueChange={(value) => onSettingsChange({ ...settings, strategy_id: value })}
                disabled={strategiesLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={strategiesLoading ? "Loading strategies..." : "Select a strategy"} />
                </SelectTrigger>
                                          <SelectContent>
                            <SelectItem value="none">No Strategy Selected</SelectItem>
                            {strategies.filter(s => s.active).map((dbStrategy) => (
                    <SelectItem key={dbStrategy.id} value={dbStrategy.id}>
                      {dbStrategy.name} ({dbStrategy.state})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {strategy && (
                <div className="text-sm text-gray-600">
                  <strong>{strategy.name}</strong> - Total Duration: {getLTIMStrategyTotalDuration(strategy)} years
                </div>
              )}
            </div>

            {/* LTIM Percentage */}
            <div className="space-y-2">
              <Label htmlFor="ltim_percentage">LTIM Allocation Percentage</Label>
              <Input
                id="ltim_percentage"
                type="number"
                min="0"
                max="100"
                step="1"
                value={model.ltim_percentage}
                onChange={(e) => onSettingsChange({ ...settings, ltim_percentage: parseFloat(e.target.value) || 0 })}
              />
              <div className="text-sm text-gray-500">
                Percentage of surplus funds allocated to LTIM (0-100%)
              </div>
            </div>

            {/* Start Year */}
            <div className="space-y-2">
              <Label htmlFor="start_year">LTIM Start Year</Label>
              <Input
                id="start_year"
                type="number"
                min="0"
                max="10"
                value={model.ltim_start_year}
                onChange={(e) => onSettingsChange({ ...settings, start_year: parseInt(e.target.value) || 0 })}
              />
              <div className="text-sm text-gray-500">
                Year relative to fiscal year when LTIM calculations begin
              </div>
            </div>

            {/* Preview Calculations */}
            {surplusAmount > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="font-medium">Investment Allocation Preview</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 border rounded-lg">
                      <div className="text-sm font-medium text-blue-600">LTIM Investment</div>
                      <div className="text-2xl font-bold">{formatCurrency(ltimInvestmentAmount)}</div>
                      <div className="text-sm text-gray-500">{model.ltim_percentage}% of surplus</div>
                    </div>
                    
                    <div className="p-3 border rounded-lg">
                      <div className="text-sm font-medium text-green-600">Client Investment</div>
                      <div className="text-2xl font-bold">{formatCurrency(clientInvestmentAmount)}</div>
                      <div className="text-sm text-gray-500">{100 - model.ltim_percentage}% of surplus</div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Strategy Details */}
            {strategy && (
              <>
                <Separator />
                <LTIMStrategyDisplay strategy={strategy} />
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface LTIMStrategyDisplayProps {
  strategy: LTIMStrategyData;
}

function LTIMStrategyDisplay({ strategy }: LTIMStrategyDisplayProps) {
  return (
    <div className="space-y-4">
      <h4 className="font-medium">Strategy Details: {strategy.name}</h4>
      
      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertDescription>
          Strategy starts in year <strong>{strategy.start_year}</strong> and spans <strong>{getLTIMStrategyTotalDuration(strategy)} years</strong> across {strategy.buckets.length} time buckets.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label>Time Buckets & Rates</Label>
        <div className="grid gap-2">
          {strategy.buckets.map((bucket, index) => (
            <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Badge variant="outline">Bucket {index + 1}</Badge>
                <span className="font-medium">{bucket.dur} years</span>
              </div>
              <div className="text-right">
                <div className="font-semibold text-green-600">{formatLTIMRate(bucket.rate)}</div>
                <div className="text-sm text-gray-500">Annual Return</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


