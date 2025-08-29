'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Copy, Check } from 'lucide-react';

interface ManualPasteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaste: (data: string) => Promise<void>;
  copyData?: string;
}

export function ManualPasteDialog({ open, onOpenChange, onPaste, copyData }: ManualPasteDialogProps) {
  const [pasteData, setPasteData] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handlePaste = async () => {
    if (!pasteData.trim()) {
      setError('Please paste the model data');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onPaste(pasteData);
      onOpenChange(false);
      setPasteData('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to paste model data');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = async () => {
    if (!copyData) return;
    
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(copyData);
      } else {
        // Fallback method
        const textArea = document.createElement('textarea');
        textArea.value = copyData;
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
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Manual Paste Model Data</DialogTitle>
          <DialogDescription>
            If clipboard access is blocked, you can manually paste the model data here.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {copyData && (
            <div className="space-y-2">
              <Label>Copy this data to share with others:</Label>
              <div className="relative">
                <Textarea
                  value={copyData}
                  readOnly
                  className="font-mono text-sm"
                  rows={6}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopy}
                  className="absolute top-2 right-2"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="paste-data">Paste model data here:</Label>
            <Textarea
              id="paste-data"
              value={pasteData}
              onChange={(e) => setPasteData(e.target.value)}
              placeholder="Paste the model JSON data here..."
              className="font-mono text-sm"
              rows={8}
            />
          </div>
          
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handlePaste} disabled={isSubmitting}>
              {isSubmitting ? 'Pasting...' : 'Paste Model'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
