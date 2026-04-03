'use client';

import React, { Suspense } from 'react';
import { Sidebar, MobileSidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { SidebarProvider, useSidebar } from '@/context/SidebarContext';
import { ConfirmationProvider, useConfirmation } from '@/context/ConfirmationContext';
import { InvoiceProvider } from '@/context/InvoiceContext';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

function ConfirmationDialog() {
  const { isOpen, options, confirmAction, cancelAction } = useConfirmation();
  if (!options) return null;
  return (
    <Dialog open={isOpen} onOpenChange={(v) => { if (!v) cancelAction(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{options.title}</DialogTitle>
          {options.description && (
            <DialogDescription className="pt-1">{options.description}</DialogDescription>
          )}
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={cancelAction}>{options.cancelText ?? 'Cancel'}</Button>
          <Button variant={options.variant === 'destructive' ? 'destructive' : 'default'} onClick={confirmAction}>
            {options.confirmText ?? 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { isFolded } = useSidebar();

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden selection:bg-primary/10">
      <Suspense fallback={<div className="w-20 lg:w-64 bg-card border-r border-border h-full shrink-0" />}>
        <MobileSidebar />
        <Sidebar />
      </Suspense>
      
      {/* 
          Main Content Area 
          Always fills the remaining screen width
          left margin changes based on sidebar collapsed state
      */}
      <main 
        className={cn(
          "flex-1 flex flex-col h-full overflow-hidden transition-all duration-300 ease-in-out",
          isFolded ? "lg:ml-20" : "lg:ml-64"
        )}
      >
        <Header />
        
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {/* Content Wrapper (Full Width Fluid Layout) */}
          <div className="p-4 sm:p-6 lg:p-8 xl:p-10 w-full animate-in fade-in slide-in-from-bottom-2 duration-500">
            {children}
          </div>
        </div>
      </main>
      
      <Toaster position="top-right" expand={false} richColors />
      <ConfirmationDialog />
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <InvoiceProvider>
      <ConfirmationProvider>
        <SidebarProvider>
          <DashboardContent>{children}</DashboardContent>
        </SidebarProvider>
      </ConfirmationProvider>
    </InvoiceProvider>
  );
}
