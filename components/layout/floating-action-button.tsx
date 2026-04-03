'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, FileText, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function FloatingActionButton() {
  const [isOpen, setIsOpen] = useState(false);

  const actions = [
    {
      label: 'Create Invoice',
      href: '/dashboard/invoices/create',
      icon: FileText,
    },
    {
      label: 'Add Client',
      href: '/dashboard/clients',
      icon: Users,
    },
  ];

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <button
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/20 md:hidden z-30"
          aria-hidden="true"
        />
      )}

      {/* Action buttons */}
      <div className="fixed bottom-20 right-4 md:hidden z-40 flex flex-col gap-3">
        {isOpen &&
          actions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 bg-primary text-primary-foreground px-4 py-2 rounded-full shadow-lg hover:shadow-xl transition-all text-sm font-medium"
              >
                <Icon className="h-4 w-4" />
                {action.label}
              </Link>
            );
          })}
      </div>

      {/* Main FAB button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'fixed bottom-20 right-4 md:hidden z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all flex items-center justify-center',
          isOpen && 'bg-destructive'
        )}
        aria-label="Create new"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
      </button>
    </>
  );
}
