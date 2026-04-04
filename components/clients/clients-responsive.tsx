'use client';

import { Client } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Edit2, Trash2, Mail, Phone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useInvoiceData } from '@/context/InvoiceContext';

interface ClientsResponsiveProps {
  clients: Client[];
  onEdit?: (client: Client) => void;
  onDelete?: (id: string) => void;
}

export function ClientsResponsive({
  clients,
  onEdit,
  onDelete,
}: ClientsResponsiveProps) {
  const { clientGroups } = useInvoiceData();

  const getClientGroup = (clientId: string) => {
    return clientGroups.find((g) => g.clientIds.includes(clientId));
  };

  return (
    <div className="space-y-4">
      {/* Desktop table - hidden on mobile */}
      <div className="hidden md:block overflow-x-auto bg-white rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-white">
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">
                Name
              </th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">
                Email
              </th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">
                Phone
              </th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">
                Company
              </th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">
                Group
              </th>
              <th className="text-right py-3 px-4 font-semibold text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id} className="border-b border-border bg-white">
                <td className="py-3 px-4 font-medium">{client.name}</td>
                <td className="py-3 px-4 text-muted-foreground">{client.email}</td>
                <td className="py-3 px-4 text-muted-foreground">{client.phone}</td>
                <td className="py-3 px-4">{client.companyName}</td>
                <td className="py-3 px-4">
                  {getClientGroup(client.id) ? (
                    <Badge variant="secondary" className={`text-[10px] ${getClientGroup(client.id)?.color} bg-opacity-10`}>
                      {getClientGroup(client.id)?.name}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">Ungrouped</span>
                  )}
                </td>
                <td className="py-3 px-4">
                  <div className="flex gap-2 justify-end">
                    {onEdit && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => onEdit(client)}
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => onDelete(client.id)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: Card view - shown only on mobile */}
      <div className="md:hidden space-y-3">
        {clients.map((client) => (
          <Card key={client.id} className="p-4">
            <div className="space-y-3">
              <div>
                <p className="font-semibold text-sm">{client.name}</p>
                <p className="text-xs text-muted-foreground">{client.companyName}</p>
                {getClientGroup(client.id) && (
                  <Badge variant="secondary" className={`mt-1 text-[10px] ${getClientGroup(client.id)?.color} bg-opacity-10`}>
                    {getClientGroup(client.id)?.name}
                  </Badge>
                )}
              </div>

              <div className="space-y-2 text-xs">
                {client.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    {client.email}
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    {client.phone}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                {onEdit && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-8 text-xs"
                    onClick={() => onEdit(client)}
                  >
                    <Edit2 className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                )}
                {onDelete && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0"
                    onClick={() => onDelete(client.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {clients.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No clients found</p>
        </Card>
      )}
    </div>
  );
}
