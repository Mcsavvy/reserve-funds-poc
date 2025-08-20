'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ManagementCompany } from '@/lib/db-types';

export function AddAssociationForm({ managementCompanies, onSuccess, onAdd }: { 
  managementCompanies: ManagementCompany[]; 
  onSuccess: () => void; 
  onAdd: (association: any) => Promise<any> 
}) {
  const [formData, setFormData] = useState({
    association: '',
    company_id: '',
    company_type: 'reserve' as const,
    email: '',
    phone: '',
    address: '',
    city: '',
    zip: '',
    state: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onAdd({
        ...formData,
        company_id: formData.company_id || undefined, // Remove empty string
        active: true,
        created_at: Date.now(),
      });
      onSuccess();
      setFormData({
        association: '',
        company_id: '',
        company_type: 'reserve' as const,
        email: '',
        phone: '',
        address: '',
        city: '',
        zip: '',
        state: '',
      });
    } catch (error) {
      console.error('Failed to add association:', error);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add Association</DialogTitle>
        <DialogDescription>Create a new homeowners association or community.</DialogDescription>
      </DialogHeader>
      
      <form onSubmit={handleSubmit} className="space-y-3 mt-4">
        <div className="space-y-2">
          <Label htmlFor="association">Association Name *</Label>
          <Input
            id="association"
            value={formData.association}
            onChange={(e) => setFormData({ ...formData, association: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="company_id">Management Company (Optional)</Label>
          <Select value={formData.company_id} onValueChange={(value) => setFormData({ ...formData, company_id: value })}>
            <SelectTrigger>
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
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="state">State</Label>
            <Input
              id="state"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="zip">ZIP Code</Label>
          <Input
            id="zip"
            value={formData.zip}
            onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
          />
        </div>

        <Button type="submit" className="w-full">
          Add Association
        </Button>
      </form>
    </>
  );
}
