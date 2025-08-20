'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Association, ManagementCompany } from '@/lib/db-types';

export function EditAssociationForm({ association, managementCompanies, onSuccess, onUpdate }: { 
  association: Association; 
  managementCompanies: ManagementCompany[];
  onSuccess: () => void; 
  onUpdate: (association: Association) => Promise<any> 
}) {
  const [formData, setFormData] = useState({
    association: association.association || '',
    company_id: association.company_id || '',
    company_type: association.company_type || 'reserve',
    email: association.email || '',
    phone: association.phone || '',
    address: association.address || '',
    city: association.city || '',
    zip: association.zip || '',
    state: association.state || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onUpdate({
        ...association,
        ...formData,
        company_id: formData.company_id || undefined, // Remove empty string
      });
      onSuccess();
    } catch (error) {
      console.error('Failed to update association:', error);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit Association</DialogTitle>
        <DialogDescription>Update association information.</DialogDescription>
      </DialogHeader>
      
      <form onSubmit={handleSubmit} className="space-y-3 mt-4">
        <div className="space-y-2">
          <Label htmlFor="edit-association">Association Name *</Label>
          <Input
            id="edit-association"
            value={formData.association}
            onChange={(e) => setFormData({ ...formData, association: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-company_id">Management Company (Optional)</Label>
          <Select value={formData.company_id} onValueChange={(value) => setFormData({ ...formData, company_id: value })}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a management company (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Independent (No Management Company)</SelectItem>
              {managementCompanies.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.company}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-email">Email</Label>
          <Input
            id="edit-email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-phone">Phone</Label>
          <Input
            id="edit-phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-address">Address</Label>
          <Input
            id="edit-address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="edit-city">City</Label>
            <Input
              id="edit-city"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-state">State</Label>
            <Input
              id="edit-state"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-zip">ZIP Code</Label>
          <Input
            id="edit-zip"
            value={formData.zip}
            onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
          />
        </div>

        <Button type="submit" className="w-full">
          Update Association
        </Button>
      </form>
    </>
  );
}
