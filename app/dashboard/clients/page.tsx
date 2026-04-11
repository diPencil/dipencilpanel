'use client';

import React, { useMemo, useState } from 'react';
import { useInvoiceData } from '@/context/InvoiceContext';
import { ClientsResponsive } from '@/components/clients/clients-responsive';
import { ClientDialog } from '@/components/clients/client-dialog';
import { Client } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
import { ConfirmDeleteDialog } from '@/components/shared/confirm-delete-dialog';
import { toast } from 'sonner';

export default function ClientsPage() {
  const {
    clients,
    clientGroups,
    currentCompany,
    addClient,
    updateClient,
    deleteClient,
  } = useInvoiceData();

  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | undefined>();

  // Delete Dialog State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [targetClient, setTargetClient] = useState<Client | null>(null);

  const confirmDeleteClient = (id: string) => {
    const client = clients.find(c => c.id === id);
    if (client) {
      setTargetClient(client);
      setDeleteDialogOpen(true);
    }
  };

  const handleDeleteConfirm = () => {
    if (targetClient) {
      deleteClient(targetClient.id);
      toast.success(`Client ${targetClient.name} deleted.`);
      setTargetClient(null);
    }
  };

  const handleEdit = (client: Client) => {
    setSelectedClient(client);
    setIsDialogOpen(true);
  };

  const filteredClients = useMemo(() => {
    const pool = clients.filter((c) => !c.isDipencilInternal);
    const query = searchTerm.trim().toLowerCase();
    if (!query) return pool;

    return pool.filter((client) => {
      const groupName = clientGroups.find((group) => group.clientIds.includes(client.id))?.name ?? 'Ungrouped';

      return (
        client.name.toLowerCase().includes(query) ||
        client.email.toLowerCase().includes(query) ||
        client.phone.toLowerCase().includes(query) ||
        client.companyName.toLowerCase().includes(query) ||
        groupName.toLowerCase().includes(query)
      );
    });
  }, [clients, clientGroups, searchTerm]);

  const emptyMessage = searchTerm.trim()
    ? 'No clients found'
    : 'No clients yet. Add one to get started.';

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Manage your clients and their information
          </p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full lg:w-auto lg:justify-end">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              className="pl-9 bg-card"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-describedby="clients-search-count"
            />
          </div>
          <Badge
            variant="outline"
            className="h-10 min-w-12 justify-center px-3 whitespace-nowrap tabular-nums"
            aria-label={`${filteredClients.length} clients`}
          >
            {filteredClients.length}
          </Badge>
          <Button
            onClick={() => {
              setSelectedClient(undefined);
              setIsDialogOpen(true);
            }}
            className="w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Client
          </Button>
        </div>
      </div>

      <ClientsResponsive
        clients={filteredClients}
        onEdit={handleEdit}
        onDelete={confirmDeleteClient}
        emptyMessage={emptyMessage}
      />

      <ClientDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={(client) => {
          if (selectedClient) {
            updateClient(selectedClient.id, client as any);
          } else {
            addClient({
              ...client,
              companyId: currentCompany?.id || client.companyId,
              companyName: currentCompany?.name || client.companyName,
            } as any);
          }
          setIsDialogOpen(false);
        }}
        client={selectedClient}
      />

      <ConfirmDeleteDialog
        isOpen={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Client?"
        description={`Are you sure you want to delete ${targetClient?.name}? This will also delete all their invoices and records. This action cannot be undone.`}
      />
    </div>
  );
}
