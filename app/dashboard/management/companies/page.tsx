'use client';

import { useState } from 'react';
import { useInvoiceData } from '@/context/InvoiceContext';
import { useConfirm } from '@/context/ConfirmationContext';
import { Company } from '@/lib/types';
import { Building2, Plus, Search, Edit, Trash2, Users, CheckCircle, XCircle, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function CompaniesPage() {
  const { allCompanies, addTenantCompany, updateTenantCompany, deleteTenantCompany, users } = useInvoiceData();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({
    name: '',
    ownerName: '',
    email: '',
    phone: '',
    address: '',
    vatNumber: '',
    logo: '',
    invoiceLogo: '',
    currency: 'USD',
    taxRate: '0',
    status: 'active' as 'active' | 'suspended',
  });

  const filtered = allCompanies.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.ownerName?.toLowerCase() || '').includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setEditingCompany(null);
    setForm({
      name: '',
      ownerName: '',
      email: '',
      phone: '',
      address: '',
      vatNumber: '',
      logo: '',
      invoiceLogo: '',
      currency: 'USD',
      taxRate: '0',
      status: 'active',
    });
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (company: Company) => {
    setEditingCompany(company);
    setForm({ 
      name: company.name, 
      ownerName: company.ownerName ?? '', 
      email: company.email, 
      phone: company.phone, 
      address: company.address,
      vatNumber: company.vatNumber,
      logo: company.logo,
      invoiceLogo: company.invoiceLogo,
      currency: company.currency,
      taxRate: String(company.taxRate),
      status: company.status,
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!form.name.trim()) {
      setFormError('Company name is required.');
      return;
    }

    const payload = {
      name: form.name.trim(),
      ownerName: form.ownerName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      vatNumber: form.vatNumber.trim(),
      logo: form.logo.trim(),
      invoiceLogo: form.invoiceLogo.trim(),
      currency: form.currency.trim() || 'USD',
      taxRate: Number(form.taxRate || 0),
      exchangeRates: {},
      status: form.status,
    };

    const result = editingCompany
      ? await updateTenantCompany(editingCompany.id, payload)
      : await addTenantCompany(payload);

    if (!result.success) {
      setFormError(result.error || 'Could not save company.');
      return;
    }

    setShowModal(false);
  };

  const confirm = useConfirm();

  const handleDelete = async (id: string) => {
    const result = await confirm({
      title: 'Delete Company',
      description: 'Are you sure you want to delete this company? This will remove all associated data.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive'
    });
    if (result) {
      const res = await deleteTenantCompany(id);
      if (!res.success) {
        setFormError(res.error || 'Could not delete company.');
      }
    }
  };

  const getUserCount = (companyId: string) => users.filter(u => u.companyId === companyId).length;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Companies
          </h1>
          <p className="text-muted-foreground mt-1">Manage tenant companies using the system</p>
        </div>
        <Button onClick={openAdd} className="gap-2 shadow-md">
          <Plus size={18} /> Add Company
        </Button>
      </div>

      {/* Search */}
      <div className="relative w-full md:w-96">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search companies..."
          className="pl-9 h-11 bg-card border-border/50 shadow-sm"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Companies', value: allCompanies.length, colorClass: 'text-foreground' },
          { label: 'Active', value: allCompanies.filter(c => c.status === 'active').length, colorClass: 'text-emerald-500' },
          { label: 'Suspended', value: allCompanies.filter(c => c.status === 'suspended').length, colorClass: 'text-red-500' },
        ].map(stat => (
          <Card key={stat.label} className="p-6 border-border/50 shadow-sm bg-card">
            <div className={`text-4xl font-bold ${stat.colorClass}`}>{stat.value}</div>
            <div className="text-muted-foreground text-sm mt-1 font-medium">{stat.label}</div>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card className="border-border/50 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                {['Company Name', 'Owner', 'Email', 'Phone', 'Users', 'Status', 'Created', 'Actions'].map(h => (
                  <th key={h} className="px-6 py-4 text-left text-sm font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filtered.map((company) => (
                <tr key={company.id} className="hover:bg-muted/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center font-bold text-sm text-foreground">
                        {company.name.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="font-semibold text-foreground">{company.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-foreground/80">{company.ownerName}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{company.email}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{company.phone}</td>
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-1 text-sm font-medium text-foreground">
                      <Users size={14} className="text-muted-foreground" />{getUserCount(company.id)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="outline" className={`gap-1 pr-2.5 ${company.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-red-500/10 text-red-600 border-red-500/20'}`}>
                      {company.status === 'active' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                      {company.status.charAt(0).toUpperCase() + company.status.slice(1)}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground whitespace-nowrap">
                    <span className="flex items-center gap-1">
                      <Calendar size={13} /> {new Date(company.createdAt).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Button onClick={() => openEdit(company)} variant="ghost" size="icon" className="h-8 w-8 text-foreground hover:bg-muted">
                        <Edit size={16} />
                      </Button>
                      <Button onClick={() => handleDelete(company.id)} variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
              <Building2 className="h-12 w-12 mb-3 opacity-20" />
              <p>No companies found</p>
            </div>
          )}
        </div>
      </Card>

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="w-[min(96vw,56rem)] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">{editingCompany ? 'Edit Company' : 'Add New Company'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="pt-2">
              <div className="max-h-[calc(90vh-9rem)] overflow-y-auto pr-1 space-y-4">
                {formError && (
                  <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {formError}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-sm font-semibold text-foreground/80">Company Name</label>
                    <Input
                      value={form.name}
                      onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Acme Corp"
                      required
                      className="bg-background"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-foreground/80">Owner Name</label>
                    <Input
                      value={form.ownerName}
                      onChange={e => setForm(prev => ({ ...prev, ownerName: e.target.value }))}
                      placeholder="John Doe"
                      className="bg-background"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-foreground/80">Email</label>
                    <Input
                      value={form.email}
                      onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="owner@company.com"
                      className="bg-background"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-foreground/80">Phone</label>
                    <Input
                      value={form.phone}
                      onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+1 (555) 000-0000"
                      className="bg-background"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-sm font-semibold text-foreground/80">Address</label>
                    <Input
                      value={form.address}
                      onChange={e => setForm(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="123 Main St, City"
                      className="bg-background"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-foreground/80">VAT Number</label>
                    <Input
                      value={form.vatNumber}
                      onChange={e => setForm(prev => ({ ...prev, vatNumber: e.target.value }))}
                      placeholder="VAT-12345"
                      className="bg-background"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-foreground/80">Status</label>
                    <select
                      value={form.status}
                      onChange={e => setForm(prev => ({ ...prev, status: e.target.value as 'active' | 'suspended' }))}
                      className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-foreground/80">Currency</label>
                    <Input
                      value={form.currency}
                      onChange={e => setForm(prev => ({ ...prev, currency: e.target.value }))}
                      placeholder="USD"
                      className="bg-background"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-foreground/80">Tax Rate</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.taxRate}
                      onChange={e => setForm(prev => ({ ...prev, taxRate: e.target.value }))}
                      placeholder="0"
                      className="bg-background"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-sm font-semibold text-foreground/80">Logo URL</label>
                    <Input
                      value={form.logo}
                      onChange={e => setForm(prev => ({ ...prev, logo: e.target.value }))}
                      placeholder="/logo.png"
                      className="bg-background"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-sm font-semibold text-foreground/80">Invoice Logo URL</label>
                    <Input
                      value={form.invoiceLogo}
                      onChange={e => setForm(prev => ({ ...prev, invoiceLogo: e.target.value }))}
                      placeholder="/invoice-logo.png"
                      className="bg-background"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border/50 mt-4 bg-background">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="shadow-md">
                  {editingCompany ? 'Save Changes' : 'Add Company'}
                </Button>
              </div>
            </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
