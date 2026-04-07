'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ClientForm } from './client-form';
import { Client } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface ClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client;
  onSubmit: (data: Omit<Client, 'id' | 'createdAt'>) => void;
}

export function ClientDialog({
  open,
  onOpenChange,
  client,
  onSubmit,
}: ClientDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (data: Omit<Client, 'id' | 'createdAt'>) => {
    setIsLoading(true);
    try {
      onSubmit(data);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save client',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{client ? 'Edit Client' : 'Add New Client'}</DialogTitle>
          <DialogDescription>
            {client
              ? 'Update client information below.'
              : 'Add a new client to your contacts below.'}
          </DialogDescription>
        </DialogHeader>
        <ClientForm
          client={client}
          onSubmit={handleSubmit}
          isLoading={isLoading}
        />
      </DialogContent>
    </Dialog>
  );
}
