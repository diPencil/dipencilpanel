'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MenuItem {
  label: string;
  href: string;
  badge?: string;
}

interface CollapsibleMenuItemProps {
  title: string;
  items: MenuItem[];
  icon: React.ReactNode;
  defaultOpen?: boolean;
  isOpen?: boolean;
  onToggle?: () => void;
  onItemClick?: () => void;
}

export function CollapsibleMenuItem({
  title,
  items,
  icon,
  defaultOpen = false,
  isOpen: controlledIsOpen,
  onToggle,
  onItemClick,
}: CollapsibleMenuItemProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const currentUrl = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
  
  const checkIsActive = (href: string) => {
    // Exact match
    if (href === currentUrl) return true;
    
    // Check if the only difference is the absence of query params on the item but present in currentUrl
    const [path, query] = href.split('?');
    if (path !== pathname) return false;
    
    // If the sidebar link has a query string, it must match currentURL exactly (already did above, or let's do a param check if order differs)
    if (query) {
      const hrefParams = new URLSearchParams(query);
      for (const [key, value] of hrefParams.entries()) {
        if (searchParams.get(key) !== value) return false;
      }
      return true;
    }
    
    // If the sidebar link does NOT have a query string (e.g. /dashboard/websites),
    // it should only be active if the currentURL also NO query parameters that define sub-pages.
    if (!query && searchParams.get('type')) return false;
    return true; // Match path and no conflicting query params
  };

  const isActive = items.some(item => checkIsActive(item.href));
  const [internalOpen, setInternalOpen] = useState(defaultOpen || isActive);
  const isControlled = typeof controlledIsOpen === 'boolean';
  const isOpen = isControlled ? controlledIsOpen : internalOpen;

  useEffect(() => {
    if (isActive && !isControlled) {
      setInternalOpen(true);
    }
  }, [isActive, isControlled]);

  const handleToggle = () => {
    if (onToggle) {
      onToggle();
      return;
    }

    setInternalOpen((prev) => !prev);
  };

  return (
    <div className="space-y-1">
      <button
        onClick={handleToggle}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
          isActive 
            ? "bg-accent/50 text-accent-foreground" 
            : "text-muted-foreground hover:bg-accent/30 hover:text-foreground"
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn("w-5 h-5 flex items-center justify-center transition-transform", isOpen ? "scale-110" : "")}>
            {icon}
          </div>
          <span className="font-semibold tracking-wide">{title}</span>
        </div>
        <ChevronRight
          className={cn('w-4 h-4 transition-transform duration-300 opacity-60', isOpen && 'rotate-90 opacity-100')}
        />
      </button>

      {isOpen && (
        <div className="ml-4 pl-4 border-l border-border/50 py-1 space-y-1 animate-in slide-in-from-top-1 duration-200">
          {items.map((item) => {
            const isSubActive = checkIsActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onItemClick}
                className={cn(
                  "flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all relative overflow-hidden group",
                  isSubActive 
                    ? "text-primary font-bold bg-primary/5" 
                    : "text-muted-foreground hover:bg-accent/30 hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-2">
                  {isSubActive && <div className="absolute left-0 w-1 h-4 bg-primary rounded-r-full" />}
                  <span className={cn(isSubActive ? "" : "group-hover:translate-x-1 transition-transform")}>
                    {item.label}
                  </span>
                </div>
                {item.badge && (
                  <span className="px-2 py-0.5 text-[10px] uppercase font-bold bg-primary text-primary-foreground rounded-md shadow-sm">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
