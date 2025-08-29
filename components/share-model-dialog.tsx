'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, ExternalLink, AlertCircle } from 'lucide-react';
import { Model, Expense } from '@/lib/db-schemas';
import { createShareableUrl } from '@/lib/url-sharing';
import { formatCurrency, formatPercentage } from '@/lib/db-utils';
import { toast } from 'sonner';

interface ShareModelDialogProps {
  model: Model;
  expenses: Expense[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareModelDialog({ model, expenses, open, onOpenChange }: ShareModelDialogProps) {
  const [shareUrl, setShareUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open && model) {
      const url = createShareableUrl(model, expenses);
      setShareUrl(url);
    }
  }, [open, model, expenses]);

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        // Fallback method
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      toast.success('Share link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      toast.error('Failed to copy link to clipboard');
    }
  };

  const handleOpenLink = () => {
    window.open(shareUrl, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Share Model</DialogTitle>
          <DialogDescription>
            Share "{model.name}" with others using this link. Anyone with this link can import the model into their own database.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Model Preview */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-3">Model Preview</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Name:</span>
                <p className="font-medium">{model.name}</p>
              </div>
              <div>
                <span className="text-gray-500">Fiscal Year:</span>
                <p className="font-medium">{model.fiscalYear}</p>
              </div>
              <div>
                <span className="text-gray-500">Starting Amount:</span>
                <p className="font-medium">{formatCurrency(model.startingAmount)}</p>
              </div>
              <div>
                <span className="text-gray-500">Monthly Fees/Unit:</span>
                <p className="font-medium">{formatCurrency(model.monthlyReserveFeesPerHousingUnit)}</p>
              </div>
              <div>
                <span className="text-gray-500">Inflation Rate:</span>
                <p className="font-medium">{formatPercentage(model.inflationRate)}</p>
              </div>
              <div>
                <span className="text-gray-500">Safety Net:</span>
                <p className="font-medium">{formatPercentage(model.safetyNetPercentage)}</p>
              </div>
            </div>
            <div className="mt-3">
              <Badge variant="outline">
                {expenses.length} expenses included
              </Badge>
            </div>
          </div>

          {/* Share URL */}
          <div className="space-y-2">
            <Label htmlFor="share-url">Share Link</Label>
            <div className="flex space-x-2">
              <Input
                id="share-url"
                value={shareUrl}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="flex items-center space-x-2"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenLink}
                className="flex items-center space-x-2"
              >
                <ExternalLink className="h-4 w-4" />
                <span>Open</span>
              </Button>
            </div>
          </div>

          {/* Info Alert */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              When someone opens this link, they'll see a preview of the model and can choose to import it into their own database. 
              The imported model will be named "{model.name} (Imported)".
            </AlertDescription>
          </Alert>
        </div>
      </DialogContent>
    </Dialog>
  );
}
