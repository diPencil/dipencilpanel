'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useTheme } from '@/components/theme-provider';
import Link from 'next/link';
import { 
  Moon, 
  Sun, 
  Menu, 
  Bell, 
  Search, 
  Globe, 
  User, 
  ChevronDown,
  LayoutGrid,
  Home as HomeIcon,
  HelpCircle,
  Settings,
  LogOut,
  UserCircle,
  Loader2,
} from 'lucide-react';
import { logoutAction } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/context/SidebarContext';
import { usePathname } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export function Header() {
  const { theme, setTheme } = useTheme();
  const { toggleOpen, isFolded } = useSidebar();
  const { user, initials } = useUser();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isLoggingOut, startLogout] = useTransition();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const handleLogout = () => {
    startLogout(async () => {
      await logoutAction();
    });
  };

  // Simple breadcrumb generator
  const paths = pathname.split('/').filter(p => p);
  
  return (
    <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border shadow-sm">
      <div className="flex h-16 items-center justify-between px-6">
        
        {/* Left section: Toggle + Breadcrumbs */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleOpen}
            className="lg:hidden rounded-full hover:bg-accent"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="hidden md:block">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/dashboard" className="flex items-center gap-2">
                    <HomeIcon className="h-4 w-4" />
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {paths.map((path, idx) => {
                  if (path === 'dashboard') return null;
                  const href = `/${paths.slice(0, idx + 1).join('/')}`;
                  const isLast = idx === paths.length - 1;
                  const label = path.charAt(0).toUpperCase() + path.slice(1);

                  return (
                    <React.Fragment key={path}>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        {isLast ? (
                          <BreadcrumbPage className="font-semibold text-foreground capitalize">
                            {label}
                          </BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink href={href} className="capitalize hover:text-primary transition-colors">
                            {label}
                          </BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                    </React.Fragment>
                  );
                })}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </div>

        {/* Right section: Search + Notifications + Theme + User */}
        <div className="flex items-center gap-2 md:gap-4 ml-auto">
          
          {/* Global Search Button (Action added) */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="hidden sm:flex rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={() => {
              const searchInput = document.querySelector('input[placeholder*="Search"]');
              if (searchInput) (searchInput as HTMLInputElement).focus();
              else import('sonner').then(m => m.toast.info("Search functionality is active within specific lists below."));
            }}
          >
            <Search className="h-5 w-5" />
          </Button>

          {/* Notifications */}
          <div className="relative">
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
              onClick={() => import('sonner').then(m => m.toast.info("No new notifications.", { description: "Your system is up to date." }))}
            >
              <Bell className="h-5 w-5" />
            </Button>
            <span className="absolute top-2 right-2 flex h-2 w-2 rounded-full bg-red-500 border-2 border-background" />
          </div>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          <div className="h-4 w-px bg-border/40 mx-1 md:block hidden" />

          {/* User Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative flex items-center gap-2 rounded-full p-1 pl-3 transition-all hover:bg-accent pr-1 group">
                <span className="hidden sm:inline-block text-sm font-medium mr-1 text-foreground/80 group-hover:text-foreground">{user?.name || 'Admin'}</span>
                <div className="h-8 w-8 rounded-full bg-primary/10 border border-border overflow-hidden shadow-sm flex items-center justify-center">
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt=""
                      width={32}
                      height={32}
                      className="h-full w-full object-cover"
                      decoding="async"
                    />
                  ) : (
                    <span className="text-xs font-bold text-primary">{initials}</span>
                  )}
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180 mr-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 mt-2 p-1 rounded-2xl border-border animate-in fade-in-0 zoom-in-95 shadow-lg">
              <DropdownMenuLabel className="font-normal px-3 py-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 border border-border overflow-hidden flex items-center justify-center shrink-0">
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
                      <span className="text-sm font-bold text-primary">{initials}</span>
                    )}
                  </div>
                  <div className="flex flex-col space-y-0.5">
                    <p className="text-sm font-bold leading-none">{user?.name || 'diPencil Panel'}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user?.email || 'noreply@dipencil.com'}</p>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="mx-1 bg-border" />
              <div className="py-1">
                <Link href="/dashboard/settings" passHref>
                  <DropdownMenuItem className="rounded-xl px-3 py-2 cursor-pointer gap-2 focus:bg-accent">
                    <Settings className="w-4 h-4 text-muted-foreground" />
                    <span>Panel Settings</span>
                  </DropdownMenuItem>
                </Link>
                <Link href="/dashboard/settings/account" passHref>
                  <DropdownMenuItem className="rounded-xl px-3 py-2 cursor-pointer gap-2 focus:bg-accent">
                    <UserCircle className="w-4 h-4 text-muted-foreground" />
                    <span>Account Preferences</span>
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator className="mx-1 bg-border" />
                <DropdownMenuItem
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="rounded-xl px-3 py-2 cursor-pointer gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
                >
                  {isLoggingOut ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <LogOut className="w-4 h-4" />
                  )}
                  <span>{isLoggingOut ? 'Signing out…' : 'Logout'}</span>
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

