'use client';

import { useState, useMemo } from 'react';
import { useInvoiceData } from '@/context/InvoiceContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useConfirm } from '@/context/ConfirmationContext';
import { ClientGroup, Client } from '@/lib/types';
import { Plus, Pencil, Trash2, Users, Search, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';

const GROUP_COLORS = [
  { label: 'Slate', value: 'bg-slate-100 text-slate-700 border-slate-200' },
  { label: 'Blue', value: 'bg-blue-50 text-blue-700 border-blue-200' },
  { label: 'Green', value: 'bg-green-50 text-green-700 border-green-200' },
  { label: 'Amber', value: 'bg-amber-50 text-amber-700 border-amber-200' },
  { label: 'Purple', value: 'bg-purple-50 text-purple-700 border-purple-200' },
];

export default function ClientGroupsPage() {
  const { clients, clientGroups, addClientGroup, updateClientGroup, deleteClientGroup, toggleClientInGroup } = useInvoiceData();
  const groups = clientGroups;
  const setGroups = () => {}; // No-op since we use actions now
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ClientGroup | null>(null);
  const [form, setForm] = useState({ name: '', description: '', color: GROUP_COLORS[0].value });
  const [assignDialog, setAssignDialog] = useState<{ open: boolean; groupId: string | null }>({ open: false, groupId: null });
  const [clientSearch, setClientSearch] = useState('');

  const filteredGroups = useMemo(() =>
    groups.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [groups, searchQuery]
  );

  const getGroupClients = (group: ClientGroup): Client[] =>
    clients.filter(c => group.clientIds?.includes(c.id));

  const ungroupedClients = useMemo(() => {
    const allGroupedIds = new Set(groups.flatMap(g => g.clientIds || []));
    return clients.filter(c => !allGroupedIds.has(c.id));
  }, [groups, clients]);

  function openCreate() {
    setEditingGroup(null);
    setForm({ name: '', description: '', color: GROUP_COLORS[0].value });
    setIsDialogOpen(true);
  }

  function openEdit(group: ClientGroup) {
    setEditingGroup(group);
    setForm({ name: group.name, description: group.description || '', color: group.color || GROUP_COLORS[0].value });
    setIsDialogOpen(true);
  }

  function handleSave() {
    if (!form.name.trim()) { toast.error('Group name is required'); return; }
    if (editingGroup) {
      updateClientGroup(editingGroup.id, form);
      toast.success('Group updated!');
    } else {
      addClientGroup({
        name: form.name,
        description: form.description,
        color: form.color,
        clientIds: []
      });
      toast.success('Group created!');
    }
    setIsDialogOpen(false);
  }

  const confirm = useConfirm();

  async function handleDelete(id: string) {
    const result = await confirm({
      title: 'Delete Group',
      description: 'Are you sure you want to delete this group? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive'
    });
    if (!result) return;
    deleteClientGroup(id);
    toast.success('Group deleted successfully');
  }

  const assigningGroup = groups.find(g => g.id === assignDialog.groupId);
  const filteredClients = clients.filter(c =>
    `${c.name} ${c.companyName} ${c.email}`.toLowerCase().includes(clientSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Client Groups</h1>
          <p className="text-muted-foreground mt-1">Organize clients into segments for easier management</p>
        </div>
        <Button onClick={openCreate} className="gap-2 bg-foreground text-background hover:bg-foreground/90">
          <Plus size={16} /> New Group
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Total Groups</p>
          <p className="text-3xl font-black mt-1">{groups.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Total Clients</p>
          <p className="text-3xl font-black mt-1">{clients.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Assigned</p>
          <p className="text-3xl font-black mt-1">{clients.length - ungroupedClients.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Ungrouped</p>
          <p className="text-3xl font-black mt-1">{ungroupedClients.length}</p>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search groups..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Groups grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredGroups.map(group => {
          const groupClients = getGroupClients(group);
          return (
            <Card key={group.id} className="p-5 flex flex-col gap-4 border border-border/60 hover:border-foreground/20 transition-all hover:shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${group.color || GROUP_COLORS[0].value}`}>
                    <FolderOpen size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-base">{group.name}</h3>
                    {group.description && <p className="text-xs text-muted-foreground mt-0.5">{group.description}</p>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(group)}>
                    <Pencil size={14} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(group.id)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users size={14} />
                  <span>{groupClients.length} client{groupClients.length !== 1 ? 's' : ''}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => { setAssignDialog({ open: true, groupId: group.id }); setClientSearch(''); }}
                >
                  Manage Clients
                </Button>
              </div>

              {groupClients.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/40">
                  {groupClients.slice(0, 4).map(c => (
                    <Badge key={c.id} variant="secondary" className="text-[10px] font-medium">
                      {c.name}
                    </Badge>
                  ))}
                  {groupClients.length > 4 && (
                    <Badge variant="outline" className="text-[10px]">+{groupClients.length - 4} more</Badge>
                  )}
                </div>
              )}
            </Card>
          );
        })}

        {/* Add Group Card */}
        <Card
          onClick={openCreate}
          className="p-5 border-2 border-dashed border-border/40 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-foreground/30 hover:bg-muted/20 transition-all min-h-[160px]"
        >
          <div className="w-10 h-10 rounded-xl border border-border/60 flex items-center justify-center">
            <Plus size={18} className="text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">Create New Group</p>
        </Card>
      </div>

      {/* Ungrouped Clients */}
      {ungroupedClients.length > 0 && (
        <Card className="p-5 border border-amber-200 bg-amber-50/30">
          <div className="flex items-center gap-2 mb-3">
            <Users size={16} className="text-amber-600" />
            <h3 className="font-semibold text-sm">Ungrouped Clients ({ungroupedClients.length})</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {ungroupedClients.map(c => (
              <Badge key={c.id} variant="outline" className="text-xs">{c.name}</Badge>
            ))}
          </div>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingGroup ? 'Edit Group' : 'Create Client Group'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Group Name *</label>
              <Input placeholder="e.g. Enterprise, SMB, Startup..." value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</label>
              <Input placeholder="Optional description..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Color</label>
              <div className="flex gap-2">
                {GROUP_COLORS.map(c => (
                  <button
                    key={c.value}
                    onClick={() => setForm(f => ({ ...f, color: c.value }))}
                    className={`w-8 h-8 rounded-lg border-2 transition-all ${c.value} ${form.color === c.value ? 'ring-2 ring-foreground ring-offset-2' : ''}`}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editingGroup ? 'Save Changes' : 'Create Group'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Clients Dialog */}
      <Dialog open={assignDialog.open} onOpenChange={v => setAssignDialog({ open: v, groupId: null })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Clients — {assigningGroup?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search clients..." value={clientSearch} onChange={e => setClientSearch(e.target.value)} className="pl-9 h-9" />
            </div>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {filteredClients.map(client => {
                const isInGroup = assigningGroup?.clientIds?.includes(client.id);
                return (
                  <button
                    key={client.id}
                    onClick={() => toggleClientInGroup(assignDialog.groupId!, client.id)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-left transition-all text-sm ${
                      isInGroup ? 'bg-foreground/5 border-foreground/20' : 'bg-background border-border/40 hover:bg-muted/30'
                    }`}
                  >
                    <div>
                      <p className="font-medium">{client.name}</p>
                      <p className="text-xs text-muted-foreground">{client.companyName}</p>
                    </div>
                    {isInGroup && <Badge className="text-[10px] bg-foreground text-background">Assigned</Badge>}
                  </button>
                );
              })}
              {filteredClients.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-4">No clients found</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setAssignDialog({ open: false, groupId: null })}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
