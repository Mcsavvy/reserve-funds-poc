'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Model } from '@/lib/db-types';

interface RecentActivityProps {
  models: Model[];
}

export function RecentActivity({ models }: RecentActivityProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Latest updates and changes</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {models.slice(0, 3).map((model) => (
            <div key={model.id} className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">{model.name}</p>
                <p className="text-xs text-gray-500">
                  Created {new Date(model.created_at).toLocaleDateString()}
                </p>
              </div>
              <Badge variant="secondary">Model</Badge>
            </div>
          ))}
          {models.length === 0 && (
            <p className="text-sm text-gray-500">No recent activity</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
