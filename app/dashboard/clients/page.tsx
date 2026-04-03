'use client';

import React, { useState } from 'react';
import { useInvoiceData } from '@/context/InvoiceContext';
import { ClientsResponsive } from '@/components/clients/clients-responsive';
import { ClientDialog } from '@/components/clients/client-dialog';
import { Client } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { ConfirmDeleteDialog } from '@/components/shared/confirm-delete-dialog';
import { toast } from 'sonner';

export default function ClientsPage() {
  const {
    clients,
    addClient,
    updateClient,
    deleteClient,
  } = useInvoiceData();

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Manage your clients and their information
          </p>
        </div>
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

      <ClientsResponsive
        clients={clients}
        onEdit={handleEdit}
        onDelete={confirmDeleteClient}
      />

      <ClientDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={(client) => {
          if (selectedClient) {
            updateClient(selectedClient.id, client as any);
          } else {
            addClient(client as any);
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
