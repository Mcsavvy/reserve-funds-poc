'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Clock, Save, Settings } from 'lucide-react';
import { SimulationVersion } from '@/lib/db-schemas';
import { formatDistanceToNow } from 'date-fns';

interface VersionSelectorProps {
  versions: SimulationVersion[];
  currentVersionId?: string;
  onLoadVersion: (version: SimulationVersion) => void;
  onOpenVersionManagement: () => void;
  hasUnsavedChanges?: boolean;
}

export function VersionSelector({
  versions,
  currentVersionId,
  onLoadVersion,
  onOpenVersionManagement,
  hasUnsavedChanges = false,
}: VersionSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const currentVersion = versions.find(v => v.id === currentVersionId);
  const hasVersions = versions.length > 0;

  const handleVersionSelect = (version: SimulationVersion) => {
    onLoadVersion(version);
    setIsOpen(false);
  };

  return (
    <div className="flex items-center gap-2">
      {/* Current Version Display */}
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Version:</span>
        {currentVersion ? (
          <Badge variant="outline" className="font-medium">
            {currentVersion.name}
          </Badge>
        ) : (
          <Badge variant="secondary">Original</Badge>
        )}
        {hasUnsavedChanges && (
          <Badge variant="destructive" className="text-xs">
            Modified
          </Badge>
        )}
      </div>

      {/* Version Actions */}
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8">
            <Settings className="h-3 w-3 mr-1" />
            Actions
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Version Management</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {/* Load Other Versions */}
          {hasVersions && (
            <>
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Load Version
              </DropdownMenuLabel>
              {versions
                .filter(v => v.id !== currentVersionId)
                .slice(0, 5) // Show only recent 5 versions
                .map((version) => (
                  <DropdownMenuItem
                    key={version.id}
                    onClick={() => handleVersionSelect(version)}
                    className="flex items-center justify-between"
                  >
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{version.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(version.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </DropdownMenuItem>
                ))}
              {versions.length > 6 && (
                <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                  +{versions.length - 5} more versions
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
            </>
          )}

          {/* Version Management */}
          <DropdownMenuItem onClick={onOpenVersionManagement}>
            <Save className="h-4 w-4 mr-2" />
            Manage Versions
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
