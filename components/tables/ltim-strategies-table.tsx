'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EditIcon, Trash2Icon, MoreHorizontalIcon, PlusIcon, BanknoteIcon } from 'lucide-react';
import { LtimStrategy } from '@/lib/db-types';
import { US_STATES } from "../../lib/constants"

type LtimStrategyTableProps = {
  ltimStrategies: LtimStrategy[];
  loading: boolean;
  onEdit: (strategy: LtimStrategy) => void;
  onDelete: (strategy: LtimStrategy) => void;
  onAdd: () => void;
}


export function LtimStrategiesTable({ 
  ltimStrategies, 
  loading, 
  onEdit, 
  onDelete,
  onAdd
}: LtimStrategyTableProps) {
  
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>LTIM Strategies</CardTitle>
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

  // Group strategies by state
  const strategiesByState = ltimStrategies.reduce((acc, strategy) => {
    if (!acc[strategy.state]) {
      acc[strategy.state] = [];
    }
    acc[strategy.state].push(strategy);
    return acc;
  }, {} as Record<string, LtimStrategy[]>);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>LTIM Strategies</CardTitle>
          <CardDescription>Manage Long-Term Investment Management strategies by state</CardDescription>
        </div>
        <Button onClick={onAdd}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Strategy
        </Button>
      </CardHeader>
      <CardContent>
        {ltimStrategies.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="flex flex-col items-center space-y-4">
              <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                <BanknoteIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div>
                <p className="font-medium">No LTIM strategies found</p>
                <p className="text-sm">Add your first LTIM strategy to get started.</p>
              </div>
              <Button onClick={onAdd} variant="outline">
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Strategy
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(strategiesByState).map(([state, strategies]) => (
              <div key={state} className="space-y-3">
                <h3 className="font-medium text-lg">{getStateName(state)}</h3>
                <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
                  {strategies
                    .filter(strategy => strategy.active)
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((strategy) => {
                      const buckets = JSON.parse(strategy.buckets || '[]');
                      const totalDuration = buckets.reduce((sum: number, bucket: any) => sum + bucket.dur, 0);
                      const weightedRate = buckets.length > 0 
                        ? buckets.reduce((sum: number, bucket: any) => sum + bucket.rate * bucket.dur, 0) / Math.max(1, totalDuration)
                        : 0;

                      return (
                        <div key={strategy.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium">{strategy.name}</h4>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontalIcon className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => onEdit(strategy)}>
                                  <EditIcon className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => onDelete(strategy)}
                                  className="text-red-600"
                                >
                                  <Trash2Icon className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          
                          {strategy.description && (
                            <p className="text-sm text-gray-600 mb-3">{strategy.description}</p>
                          )}
                          
                          <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                            <div>
                              <span className="font-medium">Start Year:</span> {strategy.start_year}
                            </div>
                            <div>
                              <span className="font-medium">Duration:</span> {totalDuration} years
                            </div>
                            <div>
                              <span className="font-medium">Buckets:</span> {buckets.length}
                            </div>
                            <div>
                              <span className="font-medium">Avg Rate:</span> {(weightedRate * 100).toFixed(2)}%
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="text-xs text-gray-500 font-medium">Rate Buckets:</div>
                            <div className="grid grid-cols-2 gap-1 text-xs">
                              {buckets.map((bucket: any, index: number) => (
                                <div key={index} className="bg-gray-50 p-2 rounded">
                                  {bucket.dur}y @ {(bucket.rate * 100).toFixed(2)}%
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          {strategy.updated_at && (
                            <p className="text-xs text-gray-400 mt-3">
                              Updated {new Date(strategy.updated_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
