'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ManagementCompany, Association, Model, LtimInvestmentRate, ModelItem } from '@/lib/db-types';

// US States list for dropdown
const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' }
];

// Add Management Company Form Component
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
      
      <form onSubmit={handleSubmit} className="space-y-4 mt-6">
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

// Add Association Form Component
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
      
      <form onSubmit={handleSubmit} className="space-y-4 mt-6">
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

// Add Model Form Component
export function AddModelForm({ associations, onSuccess, onAdd }: { 
  associations: Association[]; 
  onSuccess: () => void; 
  onAdd: (model: any) => Promise<any> 
}) {
  const [formData, setFormData] = useState({
    name: '',
    client_id: '',
    housing: 100,
    starting_amount: 0, // Opening Balance
    base_maintenance: 120000, // Base maintenance amount
    inflation_rate: 5.0, // Annual inflation rate percentage
    loan_threshold: 70.0, // Loan threshold percentage
    loan_rate: 10.0, // Loan interest rate percentage
    safety_net_percentage: 10.0, // Safety net percentage
    period: 30, // Analysis horizon in years
    loan_years: 5, // Loan term in years
    fiscal_year: new Date().getFullYear().toString(),
    inv_strategy: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onAdd({
        ...formData,
        active: true,
        updated_at: Date.now(),
        created_at: Date.now(),
      });
      onSuccess();
      setFormData({
        name: '',
        client_id: '',
        housing: 100,
        starting_amount: 0,
        base_maintenance: 120000,
        inflation_rate: 5.0,
        loan_threshold: 70.0,
        loan_rate: 10.0,
        safety_net_percentage: 10.0,
        period: 30,
        loan_years: 5,
        fiscal_year: new Date().getFullYear().toString(),
        inv_strategy: '',
      });
    } catch (error) {
      console.error('Failed to add model:', error);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Create New Model</DialogTitle>
        <DialogDescription>Set up a new reserve fund model for analysis.</DialogDescription>
      </DialogHeader>
      
      <form onSubmit={handleSubmit} className="space-y-4 mt-6">
        <div className="space-y-2">
          <Label htmlFor="name">Model Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="client_id">Association *</Label>
          <Select value={formData.client_id} onValueChange={(value) => setFormData({ ...formData, client_id: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select an association" />
            </SelectTrigger>
            <SelectContent>
              {associations.map((association) => (
                <SelectItem key={association.id} value={association.id}>
                  {association.association}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="housing">Housing Units</Label>
            <Input
              id="housing"
              type="number"
              value={formData.housing}
              onChange={(e) => setFormData({ ...formData, housing: Number(e.target.value) })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fiscal_year">Fiscal Year</Label>
            <Input
              id="fiscal_year"
              value={formData.fiscal_year}
              onChange={(e) => setFormData({ ...formData, fiscal_year: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="starting_amount">Opening Balance ($)</Label>
          <Input
            id="starting_amount"
            type="number"
            value={formData.starting_amount}
            onChange={(e) => setFormData({ ...formData, starting_amount: Number(e.target.value) })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="base_maintenance">Base Maintenance (Annual $)</Label>
          <Input
            id="base_maintenance"
            type="number"
            value={formData.base_maintenance}
            onChange={(e) => setFormData({ ...formData, base_maintenance: Number(e.target.value) })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="inflation_rate">Inflation Rate (%)</Label>
          <Input
            id="inflation_rate"
            type="number"
            step="0.1"
            value={formData.inflation_rate}
            onChange={(e) => setFormData({ ...formData, inflation_rate: Number(e.target.value) })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="period">Simulation Years (Horizon)</Label>
          <Input
            id="period"
            type="number"
            min="1"
            max="50"
            value={formData.period}
            onChange={(e) => setFormData({ ...formData, period: Number(e.target.value) })}
            placeholder="Number of years to simulate (default: 30)"
          />
          <p className="text-xs text-gray-500">
            Specify how many years into the future to project reserve fund needs (typically 20-30 years)
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="loan_threshold">Loan Threshold (%)</Label>
            <Input
              id="loan_threshold"
              type="number"
              step="0.1"
              value={formData.loan_threshold}
              onChange={(e) => setFormData({ ...formData, loan_threshold: Number(e.target.value) })}
            />
            <p className="text-xs text-gray-500">Percentage for large expense loan eligibility</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="loan_rate">Loan Rate (%)</Label>
            <Input
              id="loan_rate"
              type="number"
              step="0.1"
              value={formData.loan_rate}
              onChange={(e) => setFormData({ ...formData, loan_rate: Number(e.target.value) })}
            />
            <p className="text-xs text-gray-500">Annual interest rate for loans</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="safety_net_percentage">Safety Net (%)</Label>
            <Input
              id="safety_net_percentage"
              type="number"
              step="0.1"
              value={formData.safety_net_percentage}
              onChange={(e) => setFormData({ ...formData, safety_net_percentage: Number(e.target.value) })}
            />
            <p className="text-xs text-gray-500">Emergency cushion percentage</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="inv_strategy">Investment Strategy</Label>
          <Textarea
            id="inv_strategy"
            value={formData.inv_strategy}
            onChange={(e) => setFormData({ ...formData, inv_strategy: e.target.value })}
            placeholder="Describe the investment strategy for this reserve fund..."
          />
        </div>

        <Button type="submit" className="w-full" disabled={!formData.client_id}>
          Create Model
        </Button>
      </form>
    </>
  );
}

// Edit Management Company Form Component
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
      
      <form onSubmit={handleSubmit} className="space-y-4 mt-6">
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

// Edit Association Form Component  
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
      
      <form onSubmit={handleSubmit} className="space-y-4 mt-6">
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

// Edit Model Form Component
export function EditModelForm({ model, associations, onSuccess, onUpdate }: { 
  model: Model; 
  associations: Association[]; 
  onSuccess: () => void; 
  onUpdate: (model: Model) => Promise<any> 
}) {
  const [formData, setFormData] = useState({
    name: model.name,
    client_id: model.client_id,
    housing: model.housing,
    starting_amount: model.starting_amount,
    base_maintenance: model.base_maintenance || 120000,
    inflation_rate: model.inflation_rate,
    loan_threshold: model.loan_threshold || 70.0,
    loan_rate: model.loan_rate || 10.0,
    safety_net_percentage: model.safety_net_percentage || 10.0,
    period: model.period,
    loan_years: model.loan_years,
    fiscal_year: model.fiscal_year,
    inv_strategy: model.inv_strategy,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onUpdate({
        ...model,
        ...formData,
        updated_at: Date.now(),
      });
      onSuccess();
    } catch (error) {
      console.error('Failed to update model:', error);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit Model</DialogTitle>
        <DialogDescription>Update reserve fund model settings.</DialogDescription>
      </DialogHeader>
      
      <form onSubmit={handleSubmit} className="space-y-4 mt-6">
        <div className="space-y-2">
          <Label htmlFor="edit-model-name">Model Name *</Label>
          <Input
            id="edit-model-name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-model-client_id">Association *</Label>
          <Select value={formData.client_id} onValueChange={(value) => setFormData({ ...formData, client_id: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select an association" />
            </SelectTrigger>
            <SelectContent>
              {associations.map((association) => (
                <SelectItem key={association.id} value={association.id}>
                  {association.association}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="edit-model-housing">Housing Units</Label>
            <Input
              id="edit-model-housing"
              type="number"
              value={formData.housing}
              onChange={(e) => setFormData({ ...formData, housing: Number(e.target.value) })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-model-fiscal_year">Fiscal Year</Label>
            <Input
              id="edit-model-fiscal_year"
              value={formData.fiscal_year}
              onChange={(e) => setFormData({ ...formData, fiscal_year: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-model-starting_amount">Opening Balance ($)</Label>
          <Input
            id="edit-model-starting_amount"
            type="number"
            value={formData.starting_amount}
            onChange={(e) => setFormData({ ...formData, starting_amount: Number(e.target.value) })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-model-base_maintenance">Base Maintenance (Annual $)</Label>
          <Input
            id="edit-model-base_maintenance"
            type="number"
            value={formData.base_maintenance}
            onChange={(e) => setFormData({ ...formData, base_maintenance: Number(e.target.value) })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-model-inflation_rate">Inflation Rate (%)</Label>
          <Input
            id="edit-model-inflation_rate"
            type="number"
            step="0.1"
            value={formData.inflation_rate}
            onChange={(e) => setFormData({ ...formData, inflation_rate: Number(e.target.value) })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-model-period">Simulation Years (Horizon)</Label>
          <Input
            id="edit-model-period"
            type="number"
            min="1"
            max="50"
            value={formData.period}
            onChange={(e) => setFormData({ ...formData, period: Number(e.target.value) })}
            placeholder="Number of years to simulate (default: 30)"
          />
          <p className="text-xs text-gray-500">
            Specify how many years into the future to project reserve fund needs (typically 20-30 years)
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="edit-model-loan_threshold">Loan Threshold (%)</Label>
            <Input
              id="edit-model-loan_threshold"
              type="number"
              step="0.1"
              value={formData.loan_threshold}
              onChange={(e) => setFormData({ ...formData, loan_threshold: Number(e.target.value) })}
            />
            <p className="text-xs text-gray-500">Percentage for large expense loan eligibility</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-model-loan_rate">Loan Rate (%)</Label>
            <Input
              id="edit-model-loan_rate"
              type="number"
              step="0.1"
              value={formData.loan_rate}
              onChange={(e) => setFormData({ ...formData, loan_rate: Number(e.target.value) })}
            />
            <p className="text-xs text-gray-500">Annual interest rate for loans</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-model-safety_net_percentage">Safety Net (%)</Label>
            <Input
              id="edit-model-safety_net_percentage"
              type="number"
              step="0.1"
              value={formData.safety_net_percentage}
              onChange={(e) => setFormData({ ...formData, safety_net_percentage: Number(e.target.value) })}
            />
            <p className="text-xs text-gray-500">Emergency cushion percentage</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-model-inv_strategy">Investment Strategy</Label>
          <Textarea
            id="edit-model-inv_strategy"
            value={formData.inv_strategy}
            onChange={(e) => setFormData({ ...formData, inv_strategy: e.target.value })}
            placeholder="Describe the investment strategy for this reserve fund..."
          />
        </div>

        <Button type="submit" className="w-full">
          Update Model
        </Button>
      </form>
    </>
  );
}

// Add LTIM Rate Form Component
export function AddLtimRateForm({ onSuccess, onAdd }: { onSuccess: () => void; onAdd: (rate: any) => Promise<any> }) {
  const [formData, setFormData] = useState({
    state: '',
    bucket_name: '',
    bucket_description: '',
    rate: 0,
    effective_date: '',
    active: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onAdd({
        ...formData,
        rate: Number(formData.rate),
        effective_date: formData.effective_date ? new Date(formData.effective_date).getTime() : undefined,
      });
      onSuccess();
    } catch (error) {
      console.error('Failed to add LTIM rate:', error);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add LTIM Investment Rate</DialogTitle>
        <DialogDescription>Create a new long-term investment management rate for a state and bucket.</DialogDescription>
      </DialogHeader>
      
      <form onSubmit={handleSubmit} className="space-y-4 mt-6">
        <div className="space-y-2">
          <Label htmlFor="state">State *</Label>
          <Select value={formData.state} onValueChange={(value) => setFormData({ ...formData, state: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select a state" />
            </SelectTrigger>
            <SelectContent>
              {US_STATES.map((state) => (
                <SelectItem key={state.code} value={state.code}>
                  {state.name} ({state.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bucket_name">Bucket Name *</Label>
          <Input
            id="bucket_name"
            value={formData.bucket_name}
            onChange={(e) => setFormData({ ...formData, bucket_name: e.target.value })}
            placeholder="e.g., Conservative, Moderate, Aggressive"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bucket_description">Bucket Description</Label>
          <Textarea
            id="bucket_description"
            value={formData.bucket_description}
            onChange={(e) => setFormData({ ...formData, bucket_description: e.target.value })}
            placeholder="Optional description of this investment bucket"
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="rate">Investment Rate (%) *</Label>
          <Input
            id="rate"
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={formData.rate}
            onChange={(e) => setFormData({ ...formData, rate: Number(e.target.value) })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="effective_date">Effective Date</Label>
          <Input
            id="effective_date"
            type="date"
            value={formData.effective_date}
            onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
          />
        </div>

        <Button type="submit" className="w-full">
          Add LTIM Rate
        </Button>
      </form>
    </>
  );
}

// Add Model Item Form Component
export function AddModelItemForm({ onSuccess, onAdd, modelId }: { 
  onSuccess: () => void; 
  onAdd: (item: any) => Promise<any>;
  modelId: string;
}) {
  const [formData, setFormData] = useState({
    name: '',
    year: 1, // Year when expense will be incurred
    cost: 5000, // Amount in today's dollars
    type: 'Small' as 'Large' | 'Small', // Type of expense
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onAdd({
        ...formData,
        model_id: modelId,
      });
      onSuccess();
      setFormData({
        name: '',
        year: 1,
        cost: 5000,
        type: 'Small' as 'Large' | 'Small',
      });
    } catch (error) {
      console.error('Failed to add model item:', error);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add Model Item</DialogTitle>
        <DialogDescription>Add a new component or item to this reserve fund model.</DialogDescription>
      </DialogHeader>
      
      <form onSubmit={handleSubmit} className="space-y-4 mt-6">
        <div className="space-y-2">
          <Label htmlFor="item-name">Expense Description *</Label>
          <Input
            id="item-name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Elevator modernisation, Roof replacement, Generator overhaul"
            required
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="item-year">Year *</Label>
            <Input
              id="item-year"
              type="number"
              min="1"
              max="50"
              value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
              required
            />
            <p className="text-xs text-gray-500">Year when expense will be incurred</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="item-cost">Cost (Today's $) *</Label>
            <Input
              id="item-cost"
              type="number"
              min="0"
              step="100"
              value={formData.cost}
              onChange={(e) => setFormData({ ...formData, cost: Number(e.target.value) })}
              required
            />
            <p className="text-xs text-gray-500">Amount in current dollars</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="item-type">Type *</Label>
            <Select value={formData.type} onValueChange={(value: 'Large' | 'Small') => setFormData({ ...formData, type: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Large">Large</SelectItem>
                <SelectItem value="Small">Small</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">Large expenses are eligible for loans</p>
          </div>
        </div>



        <Button type="submit" className="w-full">
          Add Model Item
        </Button>
      </form>
    </>
  );
}

// Edit Model Item Form Component
export function EditModelItemForm({ modelItem, onSuccess, onUpdate }: { 
  modelItem: ModelItem; 
  onSuccess: () => void; 
  onUpdate: (item: ModelItem) => Promise<any> 
}) {
  const [formData, setFormData] = useState({
    name: modelItem.name,
    year: modelItem.year || 1,
    cost: modelItem.cost,
    type: modelItem.type || 'Small' as 'Large' | 'Small',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onUpdate({
        ...modelItem,
        ...formData,
      });
      onSuccess();
    } catch (error) {
      console.error('Failed to update model item:', error);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit Model Item</DialogTitle>
        <DialogDescription>Update the model item details.</DialogDescription>
      </DialogHeader>
      
      <form onSubmit={handleSubmit} className="space-y-4 mt-6">
        <div className="space-y-2">
          <Label htmlFor="edit-item-name">Expense Description *</Label>
          <Input
            id="edit-item-name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Elevator modernisation, Roof replacement, Generator overhaul"
            required
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="edit-item-year">Year *</Label>
            <Input
              id="edit-item-year"
              type="number"
              min="1"
              max="50"
              value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
              required
            />
            <p className="text-xs text-gray-500">Year when expense will be incurred</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-item-cost">Cost (Today's $) *</Label>
            <Input
              id="edit-item-cost"
              type="number"
              min="0"
              step="100"
              value={formData.cost}
              onChange={(e) => setFormData({ ...formData, cost: Number(e.target.value) })}
              required
            />
            <p className="text-xs text-gray-500">Amount in current dollars</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-item-type">Type *</Label>
            <Select value={formData.type} onValueChange={(value: 'Large' | 'Small') => setFormData({ ...formData, type: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Large">Large</SelectItem>
                <SelectItem value="Small">Small</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">Large expenses are eligible for loans</p>
          </div>
        </div>



        <Button type="submit" className="w-full">
          Update Model Item
        </Button>
      </form>
    </>
  );
}

// Edit LTIM Rate Form Component
export function EditLtimRateForm({ ltimRate, onSuccess, onUpdate }: { 
  ltimRate: LtimInvestmentRate; 
  onSuccess: () => void; 
  onUpdate: (rate: LtimInvestmentRate) => Promise<any> 
}) {
  const [formData, setFormData] = useState({
    state: ltimRate.state,
    bucket_name: ltimRate.bucket_name,
    bucket_description: ltimRate.bucket_description || '',
    rate: ltimRate.rate,
    effective_date: ltimRate.effective_date 
      ? new Date(ltimRate.effective_date).toISOString().split('T')[0] 
      : '',
    active: ltimRate.active,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onUpdate({
        ...ltimRate,
        ...formData,
        rate: Number(formData.rate),
        effective_date: formData.effective_date ? new Date(formData.effective_date).getTime() : undefined,
      });
      onSuccess();
    } catch (error) {
      console.error('Failed to update LTIM rate:', error);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit LTIM Investment Rate</DialogTitle>
        <DialogDescription>Update the long-term investment management rate details.</DialogDescription>
      </DialogHeader>
      
      <form onSubmit={handleSubmit} className="space-y-4 mt-6">
        <div className="space-y-2">
          <Label htmlFor="state">State *</Label>
          <Select value={formData.state} onValueChange={(value) => setFormData({ ...formData, state: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select a state" />
            </SelectTrigger>
            <SelectContent>
              {US_STATES.map((state) => (
                <SelectItem key={state.code} value={state.code}>
                  {state.name} ({state.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bucket_name">Bucket Name *</Label>
          <Input
            id="bucket_name"
            value={formData.bucket_name}
            onChange={(e) => setFormData({ ...formData, bucket_name: e.target.value })}
            placeholder="e.g., Conservative, Moderate, Aggressive"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bucket_description">Bucket Description</Label>
          <Textarea
            id="bucket_description"
            value={formData.bucket_description}
            onChange={(e) => setFormData({ ...formData, bucket_description: e.target.value })}
            placeholder="Optional description of this investment bucket"
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="rate">Investment Rate (%) *</Label>
          <Input
            id="rate"
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={formData.rate}
            onChange={(e) => setFormData({ ...formData, rate: Number(e.target.value) })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="effective_date">Effective Date</Label>
          <Input
            id="effective_date"
            type="date"
            value={formData.effective_date}
            onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
          />
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="active"
            checked={formData.active}
            onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
            className="rounded"
          />
          <Label htmlFor="active">Active</Label>
        </div>

        <Button type="submit" className="w-full">
          Update LTIM Rate
        </Button>
      </form>
    </>
  );
}


