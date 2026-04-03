'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Client } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ClientDialog } from './client-dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Trash2, Edit2, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ClientsTableProps {
  clients: Client[];
  onAddClient: (data: Omit<Client, 'id' | 'createdAt'>) => void;
  onUpdateClient: (id: string, data: Partial<Client>) => void;
  onDeleteClient: (id: string) => void;
}

export function ClientsTable({
  clients,
  onAddClient,
  onUpdateClient,
  onDeleteClient,
}: ClientsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | undefined>();
  const [deletingClient, setDeletingClient] = useState<Client | undefined>();
  const { toast } = useToast();

  const filteredClients = useMemo(
    () =>
      clients.filter(
        (client) =>
          client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          client.companyName.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [clients, searchTerm]
  );

  const handleAddClick = () => {
    setEditingClient(undefined);
    setOpenDialog(true);
  };

  const handleEditClick = (client: Client) => {
    setEditingClient(client);
    setOpenDialog(true);
  };

  const handleDialogSubmit = (data: Omit<Client, 'id' | 'createdAt'>) => {
    if (editingClient) {
      onUpdateClient(editingClient.id, data);
    } else {
      onAddClient(data);
    }
  };

  const handleDelete = (client: Client) => {
    onDeleteClient(client.id);
    setDeletingClient(undefined);
    toast({
      title: 'Deleted',
      description: 'Client has been deleted.',
    });
  };

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Clients</h2>
            <p className="text-sm text-muted-foreground">
              Manage your clients and their contact information
            </p>
          </div>
          <Button onClick={handleAddClick} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Client
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by name, email, or company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Table */}
        <div className="rounded-lg border border-border overflow-hidden">
          {filteredClients.length === 0 ? (
            <div className="py-12 text-center bg-card">
              <p className="text-muted-foreground">
                {searchTerm ? 'No clients found' : 'No clients yet. Add one to get started.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left font-semibold py-3 px-4">Name</th>
                    <th className="text-left font-semibold py-3 px-4">Company</th>
                    <th className="text-left font-semibold py-3 px-4">Email</th>
                    <th className="text-left font-semibold py-3 px-4">Phone</th>
                    <th className="text-left font-semibold py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((client) => (
                    <tr
                      key={client.id}
                      className="border-b border-border hover:bg-muted/50 transition-colors"
                    >
                      <td className="py-3 px-4 font-medium">{client.name}</td>
                      <td className="py-3 px-4">{client.companyName}</td>
                      <td className="py-3 px-4">
                        <a href={`mailto:${client.email}`} className="text-primary hover:underline">
                          {client.email}
                        </a>
                      </td>
                      <td className="py-3 px-4">{client.phone}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Link href={`/dashboard/clients/${client.id}`}>
                            <Button variant="ghost" size="sm" className="gap-1 text-primary hover:text-primary hover:bg-primary/10">
                              <Search className="h-4 w-4" />
                              <span className="hidden sm:inline">Profile</span>
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(client)}
                            className="gap-1"
                          >
                            <Edit2 className="h-4 w-4" />
                            <span className="hidden sm:inline">Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingClient(client)}
                            className="gap-1 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="hidden sm:inline">Delete</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <ClientDialog
        open={openDialog}
        onOpenChange={setOpenDialog}
        client={editingClient}
        onSubmit={handleDialogSubmit}
      />

      <AlertDialog open={!!deletingClient} onOpenChange={(open) => !open && setDeletingClient(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {deletingClient?.name} and all associated invoices.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingClient && handleDelete(deletingClient)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
