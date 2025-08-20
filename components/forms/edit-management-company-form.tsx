'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ManagementCompany } from '@/lib/db-types';

export function EditManagementCompanyForm({ company, onSuccess, onUpdate }: { 
  company: ManagementCompany; 
  onSuccess: () => void; 
  onUpdate: (company: ManagementCompany) => Promise<any> 
}) {
  const [formData, setFormData] = useState({
    company: company.company || '',
    company_type: company.company_type || 'property',
    email: company.email || '',
    phone: company.phone || '',
    address: company.address || '',
    city: company.city || '',
    zip: company.zip || '',
    state: company.state || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onUpdate({
        ...company,
        ...formData,
      });
      onSuccess();
    } catch (error) {
      console.error('Failed to update management company:', error);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit Management Company</DialogTitle>
        <DialogDescription>Update management company information.</DialogDescription>
      </DialogHeader>
      
      <form onSubmit={handleSubmit} className="space-y-3 mt-4">
        <div className="space-y-2">
          <Label htmlFor="edit-company">Company Name *</Label>
          <Input
            id="edit-company"
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-company_type">Company Type</Label>
          <Select value={formData.company_type} onValueChange={(value: any) => setFormData({ ...formData, company_type: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="property">Property Management</SelectItem>
              <SelectItem value="reserve">Reserve Specialist</SelectItem>
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
          Update Management Company
        </Button>
      </form>
    </>
  );
}
