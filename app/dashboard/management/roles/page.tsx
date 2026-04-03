'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useInvoiceData } from '@/context/InvoiceContext';
import { useConfirm } from '@/context/ConfirmationContext';
import { Role, PermissionModule, ModulePermissions } from '@/lib/types';
import { Shield, Plus, Edit, Trash2, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const MODULES: PermissionModule[] = ['dashboard', 'clients', 'domains', 'hosting', 'emails', 'vps', 'websites', 'mobile_apps', 'billing', 'users', 'companies', 'roles'];

const MODULE_LABELS: Record<PermissionModule, string> = {
  dashboard: 'Dashboard', clients: 'Clients', domains: 'Domains', hosting: 'Hosting',
  emails: 'Emails', vps: 'VPS', websites: 'Websites', mobile_apps: 'Mobile Apps',
  billing: 'Billing', users: 'Users', companies: 'Companies', roles: 'Roles'
};

const defaultPermissions = (): Record<PermissionModule, ModulePermissions> => ({
  dashboard: { view: true, create: false, edit: false, delete: false },
  clients: { view: true, create: true, edit: true, delete: false },
  domains: { view: true, create: true, edit: true, delete: false },
  hosting: { view: true, create: true, edit: true, delete: false },
  emails: { view: true, create: true, edit: true, delete: false },
  vps: { view: true, create: true, edit: true, delete: false },
  websites: { view: true, create: true, edit: true, delete: false },
  mobile_apps: { view: true, create: true, edit: true, delete: false },
  billing: { view: true, create: false, edit: false, delete: false },
  users: { view: false, create: false, edit: false, delete: false },
  companies: { view: false, create: false, edit: false, delete: false },
  roles: { view: false, create: false, edit: false, delete: false },
});

export default function RolesPage() {
  const { roles, addRole, updateRole, deleteRole } = useInvoiceData();
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', permissions: defaultPermissions() });

  const openAdd = () => {
    setEditingRole(null);
    setForm({ name: '', description: '', permissions: defaultPermissions() });
    setFormError('');
    setShowModal(true);
  };

  const confirm = useConfirm();

  const openEdit = (role: Role) => {
    setEditingRole(role);
    setForm({ name: role.name, description: role.description, permissions: role.permissions });
    setFormError('');
    setShowModal(true);
  };

  const handleDeleteRole = async (id: string) => {
    const result = await confirm({
      title: 'Delete Role',
      description: 'Are you sure you want to delete this role? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive'
    });
    if (result) {
      const res = await deleteRole(id);
      if (!res.success) toast.error(res.error || 'Could not delete role.');
      else toast.success('Role deleted.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!form.name.trim()) {
      setFormError('Role name is required.');
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      permissions: form.permissions,
    };

    setIsSubmitting(true);
    const result = editingRole
      ? await updateRole(editingRole.id, payload)
      : await addRole(payload);
    setIsSubmitting(false);

    if (!result.success) {
      setFormError(result.error || 'Could not save role.');
      return;
    }

    toast.success(editingRole ? 'Role updated.' : 'Role created.');
    setShowModal(false);
  };

  const togglePerm = (module: PermissionModule, action: keyof ModulePermissions) => {
    setForm(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [module]: {
          ...prev.permissions[module],
          [action]: !prev.permissions[module][action]
        }
      }
    }));
  };

  const PermCheck = ({ val }: { val: boolean }) => (
    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md ${
      val ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-500'
    }`}>
      {val ? <Check size={14} /> : <X size={14} />}
    </span>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Roles & Permissions
          </h1>
          <p className="text-muted-foreground mt-1">Define access control roles for your team</p>
        </div>
        <Button onClick={openAdd} className="gap-2 shadow-md">
          <Plus size={18} /> Add Role
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-lg">
        <Card className="p-6 border-border/50 shadow-sm bg-card">
          <div className="text-4xl font-bold text-foreground">{roles.length}</div>
          <div className="text-muted-foreground text-sm mt-1 font-medium">Total Roles</div>
        </Card>
        <Card className="p-6 border-border/50 shadow-sm bg-card">
          <div className="text-4xl font-bold text-foreground">{MODULES.length}</div>
          <div className="text-muted-foreground text-sm mt-1 font-medium">Modules</div>
        </Card>
      </div>

      {/* Roles List */}
      <div className="flex flex-col gap-4">
        {roles.map(role => (
          <Card key={role.id} className="border-border/50 overflow-hidden shadow-sm bg-card">
            <div className="p-5 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="h-11 w-11 rounded-xl bg-muted flex items-center justify-center text-foreground">
                  <Shield size={24} />
                </div>
                <div>
                  <div className="font-bold text-foreground text-lg">{role.name}</div>
                  <div className="text-muted-foreground text-sm mt-0.5">{role.description}</div>
                  {role.userCount !== undefined && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {role.userCount} {role.userCount === 1 ? 'user' : 'users'} assigned
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2 items-center">
                <Button 
                  onClick={() => setExpandedRole(expandedRole === role.id ? null : role.id)}
                  variant="outline"
                  className="gap-2 text-foreground hover:bg-muted"
                  size="sm"
                >
                  Permissions {expandedRole === role.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </Button>
                <Button onClick={() => openEdit(role)} variant="ghost" size="icon" className="h-9 w-9 text-foreground hover:bg-muted">
                  <Edit size={16} />
                </Button>
                <Button onClick={() => handleDeleteRole(role.id)} variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>

            {/* Permissions Table */}
            {expandedRole === role.id && (
              <div className="border-t border-border/50 p-6 bg-muted/20 overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-left py-2 px-3 text-muted-foreground text-xs font-semibold uppercase tracking-wider">Module</th>
                      {(['view', 'create', 'edit', 'delete'] as (keyof ModulePermissions)[]).map(a => (
                        <th key={a} className="text-center py-2 px-3 text-muted-foreground text-xs font-semibold uppercase tracking-wider">{a}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {MODULES.map(mod => (
                      <tr key={mod} className="border-b border-border/30 last:border-0 hover:bg-muted/30">
                        <td className="py-2.5 px-3 text-sm font-medium text-foreground/80">{MODULE_LABELS[mod]}</td>
                        {(['view', 'create', 'edit', 'delete'] as (keyof ModulePermissions)[]).map(a => (
                          <td key={a} className="text-center py-2.5 px-3">
                            <PermCheck val={role.permissions[mod]?.[a] ?? false} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        ))}

        {roles.length === 0 && (
          <Card className="p-12 text-center border-border/50 shadow-sm bg-card flex flex-col items-center">
            <Shield className="h-12 w-12 mb-3 text-muted-foreground opacity-20" />
            <p className="text-muted-foreground">No roles defined yet</p>
          </Card>
        )}
      </div>

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">{editingRole ? 'Edit Role' : 'Add New Role'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              {formError && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {formError}
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground/80">Role Name</label>
                <Input 
                  value={form.name} 
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))} 
                  placeholder="e.g. Editor" 
                  required
                  className="bg-background" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground/80">Description</label>
                <Input 
                  value={form.description} 
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))} 
                  placeholder="Brief description of this role"
                  className="bg-background" 
                />
              </div>

              {/* Permissions Grid */}
              <div className="space-y-2 pt-2">
                <label className="text-sm font-semibold text-foreground/80">Permissions Config</label>
                <div className="bg-background rounded-md border border-border/50 overflow-x-auto shadow-sm">
                  <table className="w-full">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th className="text-left py-3 px-4 text-muted-foreground text-xs font-semibold uppercase tracking-wider">Module</th>
                        {(['view', 'create', 'edit', 'delete'] as (keyof ModulePermissions)[]).map(a => (
                          <th key={a} className="text-center py-3 px-2 text-muted-foreground text-xs font-semibold uppercase tracking-wider">{a}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {MODULES.map((mod) => (
                        <tr key={mod} className="hover:bg-muted/20">
                          <td className="py-2 px-4 text-sm font-medium text-foreground/80">{MODULE_LABELS[mod]}</td>
                          {(['view', 'create', 'edit', 'delete'] as (keyof ModulePermissions)[]).map(action => (
                            <td key={action} className="text-center py-2 px-2">
                              <button 
                                type="button" 
                                onClick={() => togglePerm(mod, action)}
                                className={`inline-flex shrink-0 items-center justify-center w-7 h-7 rounded-md transition-all ${
                                  form.permissions[mod]?.[action] 
                                    ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20' 
                                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                }`}
                              >
                                {form.permissions[mod]?.[action] ? <Check size={14} /> : <X size={14} />}
                              </button>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border/40">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="shadow-md" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving…' : editingRole ? 'Save Changes' : 'Create Role'}
                </Button>
              </div>
            </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
