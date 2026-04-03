'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Monitor,
  DollarSign,
  Users,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  {
    label: 'Home',
    href: '/dashboard',
    icon: Home,
  },
  {
    label: 'Websites',
    href: '/dashboard/websites',
    icon: Monitor,
  },
  {
    label: 'Billing',
    href: '/dashboard/billing',
    icon: DollarSign,
  },
  {
    label: 'Clients',
    href: '/dashboard/clients',
    icon: Users,
  },
  {
    label: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
  },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-background border-t border-border flex justify-around items-center h-16 z-40 safe-area-inset-bottom">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center justify-center flex-1 h-full gap-0.5 text-xs font-medium transition-colors touch-manipulation',
              isActive
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground active:bg-muted'
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="text-[10px] leading-none">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
