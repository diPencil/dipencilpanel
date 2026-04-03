'use client';

import React from 'react';
import { InvoiceItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Plus } from 'lucide-react';
import { calculateLineItemSubtotal, calculateLineItemVAT, calculateLineItemTotal } from '@/lib/invoice-utils';
import { formatCurrency } from '@/lib/formatting';

interface InvoiceItemsEditorProps {
  items: InvoiceItem[];
  onItemsChange: (items: InvoiceItem[]) => void;
  currency?: string;
  /** From Settings → Default tax rate (%) */
  defaultVat?: number;
}

export function InvoiceItemsEditor({
  items,
  onItemsChange,
  currency = 'USD',
  defaultVat = 0,
}: InvoiceItemsEditorProps) {
  const handleAddItem = () => {
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      price: 0,
      discount: 0,
      vat: defaultVat,
    };
    onItemsChange([...items, newItem]);
  };

  const handleUpdateItem = (id: string, updates: Partial<InvoiceItem>) => {
    onItemsChange(
      items.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const handleRemoveItem = (id: string) => {
    onItemsChange(items.filter((item) => item.id !== id));
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + calculateLineItemTotal(item), 0);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold">Invoice Items</label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddItem}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Item
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-border bg-muted/50 p-8 text-center">
          <p className="text-sm text-muted-foreground mb-3">No items added yet</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddItem}
          >
            Add First Item
          </Button>
        </div>
      ) : (
        <div className="space-y-3 border border-border rounded-lg overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-12 gap-2 bg-muted/50 p-4 text-xs font-semibold">
            <div className="col-span-3">Description</div>
            <div className="col-span-1 text-right">Qty</div>
            <div className="col-span-2 text-right">Price</div>
            <div className="col-span-1 text-right">Disc %</div>
            <div className="col-span-1 text-right">VAT %</div>
            <div className="col-span-3 text-right">Total</div>
          </div>

          {/* Items */}
          {items.map((item) => (
            <div key={item.id} className="grid grid-cols-12 gap-2 p-4 border-t border-border items-end">
              <div className="col-span-3">
                <Input
                  type="text"
                  value={item.description}
                  onChange={(e) =>
                    handleUpdateItem(item.id, { description: e.target.value })
                  }
                  placeholder="Item description"
                  className="text-xs h-8"
                />
              </div>
              <div className="col-span-1">
                <Input
                  type="number"
                  value={item.quantity}
                  onChange={(e) =>
                    handleUpdateItem(item.id, {
                      quantity: Math.max(0, parseFloat(e.target.value)),
                    })
                  }
                  placeholder="0"
                  min="0"
                  step="0.01"
                  className="text-xs text-right h-8"
                />
              </div>
              <div className="col-span-2">
                <Input
                  type="number"
                  value={item.price}
                  onChange={(e) =>
                    handleUpdateItem(item.id, {
                      price: Math.max(0, parseFloat(e.target.value)),
                    })
                  }
                  placeholder="0"
                  min="0"
                  step="0.01"
                  className="text-xs text-right h-8"
                />
              </div>
              <div className="col-span-1">
                <Input
                  type="number"
                  value={item.discount}
                  onChange={(e) =>
                    handleUpdateItem(item.id, {
                      discount: Math.max(0, Math.min(100, parseFloat(e.target.value))),
                    })
                  }
                  placeholder="0"
                  min="0"
                  max="100"
                  step="0.01"
                  className="text-xs text-right h-8"
                />
              </div>
              <div className="col-span-1">
                <Input
                  type="number"
                  value={item.vat}
                  onChange={(e) =>
                    handleUpdateItem(item.id, {
                      vat: Math.max(0, Math.min(100, parseFloat(e.target.value))),
                    })
                  }
                  placeholder="0"
                  min="0"
                  max="100"
                  step="0.01"
                  className="text-xs text-right h-8"
                />
              </div>
              <div className="col-span-2 flex items-center justify-between">
                <span className="text-xs font-medium">
                  {formatCurrency(calculateLineItemTotal(item), currency)}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveItem(item.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          {/* Total */}
          <div className="flex justify-end gap-4 bg-muted/50 p-4 border-t border-border">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">Total:</span>
              <span className="text-lg font-bold">{formatCurrency(calculateTotal(), currency)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
