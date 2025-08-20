'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function AddManagementCompanyForm({ onSuccess, onAdd }: { onSuccess: () => void; onAdd: (company: any) => Promise<any> }) {
  const [formData, setFormData] = useState({
    company: '',
    company_type: 'property' as const,
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
        active: true,
        created_at: Date.now(),
      });
      onSuccess();
      setFormData({
        company: '',
        company_type: 'property' as const,
        email: '',
        phone: '',
        address: '',
        city: '',
        zip: '',
        state: '',
      });
    } catch (error) {
      console.error('Failed to add management company:', error);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add Management Company</DialogTitle>
        <DialogDescription>Create a new property management company.</DialogDescription>
      </DialogHeader>
      
      <form onSubmit={handleSubmit} className="space-y-3 mt-4">
        <div className="space-y-2">
          <Label htmlFor="company">Company Name *</Label>
          <Input
            id="company"
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="company_type">Company Type</Label>
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
          Add Management Company
        </Button>
      </form>
    </>
  );
}
