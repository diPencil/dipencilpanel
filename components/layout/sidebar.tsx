'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Monitor,
  Globe,
  Mail,
  Settings,
  HelpCircle,
  Zap,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  X,
  CreditCard,
  Users,
  HardDrive,
  ShieldCheck,
  Smartphone,
  Server,
  BarChart2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/context/SidebarContext';
import { useInvoiceData } from '@/context/InvoiceContext';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { useUser } from '@/context/UserContext';
import { CollapsibleMenuItem } from './collapsible-menu-item';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { 
    label: 'Websites', 
    icon: Monitor,
    items: [
      { label: 'All Websites', href: '/dashboard/websites' },
      { label: 'Add Website', href: '/dashboard/websites/new' },
      { label: 'WordPress', href: '/dashboard/websites?type=wordpress' },
      { label: 'Node.js', href: '/dashboard/websites?type=node' },
      { label: 'PHP/HTML', href: '/dashboard/websites?type=php' },
      { label: 'Migrations', href: '/dashboard/websites/migrate' },
    ]
  },
  {
    label: 'Mobile Apps',
    icon: Smartphone,
    items: [
      { label: 'All Applications', href: '/dashboard/mobile-apps' },
      { label: 'Add Application', href: '/dashboard/mobile-apps/new' },
    ]
  },
  { 
    label: 'Domains', 
    icon: Globe,
    items: [
      { label: 'Domain Portfolio', href: '/dashboard/domains' },
      { label: 'Create a Domain', href: '/dashboard/domains/new' },
      { label: 'Transfers', href: '/dashboard/domains/transfer' },
      { label: 'DNS/Nameservers', href: '/dashboard/domains/dns' },
    ]
  },
  { 
    label: 'Hosting', 
    icon: HardDrive,
    items: [
      { label: 'Hosting Overview', href: '/dashboard/hosting' },
      { label: 'Add Hosting', href: '/dashboard/hosting/new' },
      { label: 'Hosting Plans', href: '/dashboard/hosting/plans' },
    ]
  },
  { 
    label: 'Email', 
    icon: Mail,
    items: [
      { label: 'Email Overview', href: '/dashboard/emails' },
      { label: 'Email Plans', href: '/dashboard/emails/plans' },
      { label: 'Email Configuration', href: '/dashboard/emails/configuration' },
    ]
  },
  { 
    label: 'VPS', 
    icon: Server,
    items: [
      { label: 'VPS Overview', href: '/dashboard/vps' },
      { label: 'Add VPS', href: '/dashboard/vps/new' },
      { label: 'VPS Plans', href: '/dashboard/vps/plans' },
    ]
  },
  {
    label: 'Resources',
    icon: BarChart2,
    items: [
      { label: 'Storage Overview', href: '/dashboard/resources/storage' },
      { label: 'Usage', href: '/dashboard/resources/usage' },
    ],
  },
  { 
    label: 'Clients', 
    icon: Users,
    items: [
      { label: 'All Clients', href: '/dashboard/clients' },
      { label: 'Client Groups', href: '/dashboard/clients/groups' },
    ]
  },
  { 
    label: 'Billing', 
    icon: CreditCard,
    items: [
      { label: 'Overview', href: '/dashboard/billing' },
      { label: 'Subscriptions', href: '/dashboard/billing/subscriptions' },
      { label: 'Invoices', href: '/dashboard/billing/invoices' },
      { label: 'Payment History', href: '/dashboard/billing/payments' },
      { label: 'Sub. Reminders', href: '/dashboard/billing/reminders' },
      { label: 'Business Emails', href: '/dashboard/billing/business-emails' },
      { label: 'Financial Summary', href: '/dashboard/billing/financial-summary' },
    ]
  },
  { 
    label: 'Management', 
    icon: ShieldCheck,
    items: [
      { label: 'Companies', href: '/dashboard/management/companies' },
      { label: 'Users', href: '/dashboard/management/users' },
      { label: 'Roles & Permissions', href: '/dashboard/management/roles' },
    ]
  },
  { label: 'Help Center', href: '/dashboard/help', icon: HelpCircle },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
];

function normalizeHref(href?: string) {
  return href ? href.split('?')[0] : '';
}

function isPathActive(pathname: string, href?: string) {
  return normalizeHref(href) === pathname;
}

function getSystemLogo(logo?: string) {
  if (!logo || logo === '/logo.png') return '/pencil-logo.png';
  return logo;
}

function findActiveSection(pathname: string) {
  const activeSection = navItems.find((item) =>
    item.items?.some((subItem) => isPathActive(pathname, subItem.href))
  );

  return activeSection?.label ?? null;
}

export function Sidebar() {
  const pathname = usePathname();
  const { isFolded, toggleFold } = useSidebar();
  const { company } = useInvoiceData();
  const { user, initials } = useUser();
  const systemLogo = getSystemLogo(company.logo);
  const systemFavicon = '/favicon.svg';
  const [mounted, setMounted] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setOpenSection(findActiveSection(pathname));
  }, [pathname]);

  const handleSectionToggle = (label: string) => {
    setOpenSection((prev) => (prev === label ? null : label));
  };

  if (!mounted) return null;

  return (
    <aside 
      className={cn(
        "hidden lg:flex flex-col fixed inset-y-0 left-0 z-50 bg-card border-r border-border transition-all duration-300 ease-in-out",
        isFolded ? "w-20" : "w-64"
      )}
    >
      {/* Brand */}
      <div className="h-16 flex items-center px-4 border-b border-border overflow-hidden">
        <Link href="/dashboard" className={cn("flex items-center", isFolded ? "justify-center w-full" : "w-full") }>
          {isFolded ? (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl overflow-hidden border border-border/70 bg-background shadow-sm">
              <img src={systemFavicon} alt="System favicon" className="h-full w-full object-contain p-1.5" />
            </div>
          ) : (
            <img src={systemLogo} alt="System logo" className="h-9 w-auto max-w-[180px] object-contain" />
          )}
        </Link>
      </div>

      {/* Collapse Toggle Button */}
      <button
        onClick={toggleFold}
        className="absolute -right-3 top-8 z-50 flex h-6 w-6 items-center justify-center rounded-full bg-card border border-border shadow-md hover:bg-accent text-muted-foreground transition-all duration-200"
      >
        {isFolded ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Navigation */}
      <TooltipProvider delayDuration={0}>
        <nav className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-1 scrollbar-thin">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = isPathActive(pathname, item.href) || (item.items && item.items.some((sub) => isPathActive(pathname, sub.href)));

            if (item.items && !isFolded) {
              return (
                <CollapsibleMenuItem
                  key={item.label}
                  title={item.label}
                  icon={<Icon className="w-5 h-5" />}
                  items={item.items}
                  isOpen={openSection === item.label}
                  onToggle={() => handleSectionToggle(item.label)}
                />
              );
            }

            if (item.items && isFolded) {
              return (
                <HoverCard key={item.label} openDelay={120} closeDelay={80}>
                  <HoverCardTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        'w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all group relative',
                        isActive
                          ? 'bg-foreground/10 text-foreground font-semibold shadow-sm'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                      )}
                    >
                      <Icon className={cn('h-5 w-5 shrink-0', isActive ? '' : 'group-hover:scale-110 transition-transform')} />
                      {isFolded && isActive && (
                        <div className="absolute left-0 w-1 h-6 bg-foreground rounded-r-full" />
                      )}
                    </button>
                  </HoverCardTrigger>
                  <HoverCardContent side="right" align="start" sideOffset={10} className="w-64 p-2">
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {item.label}
                    </div>
                    <div className="space-y-1">
                      {item.items.map((subItem) => {
                        const isSubActive = isPathActive(pathname, subItem.href);
                        return (
                          <Link
                            key={subItem.href}
                            href={subItem.href}
                            className={cn(
                              'flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors',
                              isSubActive
                                ? 'bg-foreground/10 text-foreground font-semibold'
                                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                            )}
                          >
                            {isSubActive && <ChevronRight className="h-3.5 w-3.5" />}
                            {subItem.label}
                          </Link>
                        );
                      })}
                    </div>
                  </HoverCardContent>
                </HoverCard>
              );
            }

            return (
              <Tooltip key={item.label}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href || '#'}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all group relative",
                      isActive 
                        ? "bg-foreground/10 text-foreground font-semibold shadow-sm" 
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <Icon className={cn("h-5 w-5 shrink-0", isActive ? "" : "group-hover:scale-110 transition-transform")} />
                    {!isFolded && <span>{item.label}</span>}
                    {isFolded && isActive && (
                      <div className="absolute left-0 w-1 h-6 bg-foreground rounded-r-full" />
                    )}
                  </Link>
                </TooltipTrigger>
                {isFolded && (
                  <TooltipContent side="right" sideOffset={10} className="bg-popover text-popover-foreground border-border font-medium">
                    <span className="inline-flex items-center gap-1.5">
                      {isActive && <ChevronRight className="h-3.5 w-3.5" />}
                      {item.label}
                    </span>
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </nav>
      </TooltipProvider>

      {/* Footer / User Profile */}
      <div className="p-4 border-t border-border mt-auto">
        {!isFolded ? (
          <div className="flex items-center gap-3 p-2 rounded-xl bg-muted/50 border border-border/50">
            <div className="h-9 w-9 rounded-full bg-primary/10 border border-border overflow-hidden flex items-center justify-center shrink-0 shadow-sm">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt=""
                  width={36}
                  height={36}
                  className="h-full w-full object-cover"
                  decoding="async"
                />
              ) : (
                <span className="text-xs font-bold text-primary">{initials}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate leading-none mb-1">{user?.name || 'diPencil Panel'}</p>
              <p className="text-xs text-muted-foreground truncate font-medium">{user?.email || 'noreply@dipencil.com'}</p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="h-10 w-10 rounded-full bg-primary/10 border border-border overflow-hidden flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity shadow-sm">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt=""
                  width={40}
                  height={40}
                  className="h-full w-full object-cover"
                  decoding="async"
                />
              ) : (
                <span className="text-xs font-bold text-primary">{initials}</span>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

export function MobileSidebar() {
  const { isOpen, toggleOpen } = useSidebar();
  const { company } = useInvoiceData();
  const systemLogo = getSystemLogo(company.logo);
  const pathname = usePathname();
  const [openSection, setOpenSection] = useState<string | null>(null);

  useEffect(() => {
    setOpenSection(findActiveSection(pathname));
  }, [pathname]);

  const handleSectionToggle = (label: string) => {
    setOpenSection((prev) => (prev === label ? null : label));
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-60 lg:hidden"
        onClick={toggleOpen}
      />
      <aside className="fixed inset-y-0 left-0 w-[280px] bg-card border-r border-border z-70 lg:hidden animate-in slide-in-from-left duration-300 shadow-2xl">
        <div className="h-16 flex items-center justify-between px-6 border-b border-border">
           <Link href="/dashboard" className="flex items-center">
            <img src={systemLogo} alt="System logo" className="h-9 w-auto max-w-[170px] object-contain" />
          </Link>
          <Button variant="ghost" size="icon" onClick={toggleOpen} className="rounded-full">
            <X className="h-5 w-5" />
          </Button>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
           {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = isPathActive(pathname, item.href) || (item.items && item.items.some((sub) => isPathActive(pathname, sub.href)));

            if (item.items) {
               return (
                <CollapsibleMenuItem
                  key={item.label}
                  title={item.label}
                  icon={<Icon className="w-5 h-5" />}
                  items={item.items}
                  isOpen={openSection === item.label}
                  onToggle={() => handleSectionToggle(item.label)}
                  onItemClick={toggleOpen}
                />
              );
            }

            return (
              <Link
                key={item.label}
                href={item.href || '#'}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-foreground/10 text-foreground font-semibold shadow-sm" 
                    : "text-muted-foreground hover:bg-accent"
                )}
                onClick={toggleOpen}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
