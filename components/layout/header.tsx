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
  Mail,
  Shield,
  ArrowRight,
} from 'lucide-react';
import { logoutAction } from '@/app/actions/auth';
import { getNotifications, NotificationItem, markNotificationsAsRead, markNotificationsAsCleared } from '@/app/actions/notifications';
import { getRelativeTime } from '@/lib/formatting';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { SearchPalette } from './search-palette';
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
import { cn } from "@/lib/utils";
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
  const { toggleOpen, toggleFold, isFolded } = useSidebar();
  const { user, initials } = useUser();
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isLoggingOut, startLogout] = useTransition();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsSearchOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchNotifications = async () => {
    setIsLoadingNotifications(true);
    try {
      const data = await getNotifications();
      setNotifications(data);
      const unread = data.filter(n => n.status === 'unread').length;
      setUnreadCount(unread);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const res = await markNotificationsAsRead();
      if (res.success) {
        setUnreadCount(0);
        setNotifications(prev => prev.map(n => ({ ...n, status: 'read' as const })));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearAll = async () => {
    try {
      const res = await markNotificationsAsCleared();
      if (res.success) {
        setUnreadCount(0);
        setNotifications([]); // Clear dropdown list immediately
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (mounted) fetchNotifications();
  }, [mounted, pathname]);

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

          <div className="flex items-center gap-1.5">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleFold}
              className="hidden lg:flex rounded-full hover:bg-accent h-9 w-9 text-muted-foreground mr-1"
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/dashboard" className="flex items-center gap-2">
                    <div className="p-1.5 rounded-full bg-accent/50 text-muted-foreground hover:text-primary transition-colors">
                      <HomeIcon className="h-4 w-4" />
                    </div>
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
            onClick={() => setIsSearchOpen(true)}
          >
            <Search className="h-5 w-5" />
          </Button>

          {/* Notifications */}
          <DropdownMenu onOpenChange={(open) => open && fetchNotifications()}>
            <DropdownMenuTrigger asChild>
              <div className="relative">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <Bell className="h-5 w-5" />
                </Button>
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 flex h-2 w-2 rounded-full bg-red-500 border-2 border-background" />
                )}
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 mt-2 p-1 rounded-2xl border-border animate-in fade-in-0 zoom-in-95 shadow-lg">
              <div className="flex items-center justify-between px-4 py-3">
                <h3 className="font-bold text-sm">Notifications</h3>
                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">{unreadCount} New</span>
              </div>
              <DropdownMenuSeparator className="mx-1 bg-border" />
              <div className="max-h-[350px] overflow-y-auto scrollbar-thin py-1">
                {isLoadingNotifications ? (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mb-2" />
                    <p className="text-xs font-medium">Fetching updates...</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                    <Bell className="h-8 w-8 mb-2 opacity-20" />
                    <p className="text-xs font-medium">No new notifications</p>
                  </div>
                ) : (
                  notifications.map((notif) => {
                    let Icon = Bell;
                    let iconColor = "text-primary";
                    let bgColor = "bg-primary/10";

                    if (notif.type === 'subscription') {
                      iconColor = "text-red-500";
                      bgColor = "bg-red-500/10";
                      Icon = Shield;
                    } else if (notif.type === 'user_activity') {
                      iconColor = notif.title.includes('Login') ? "text-green-500" : "text-slate-400";
                      bgColor = notif.title.includes('Login') ? "bg-green-500/10" : "bg-slate-400/10";
                      Icon = User;
                    } else if (notif.type === 'invoice_sent' || notif.type === 'business_email') {
                      iconColor = "text-blue-500";
                      bgColor = "bg-blue-500/10";
                      Icon = Mail;
                    }

                    return (
                      <DropdownMenuItem 
                        key={notif.id} 
                        onClick={() => router.push(notif.redirectUrl)}
                        className={cn(
                          "flex gap-3 px-4 py-3 cursor-pointer focus:bg-accent rounded-xl mx-1 mb-1 items-start transition-colors",
                          notif.status === 'unread' && "bg-primary/5"
                        )}
                      >
                        <div className={cn(
                          "p-2 rounded-xl shrink-0 transition-transform",
                          bgColor,
                          iconColor,
                          notif.status === 'unread' && "scale-110"
                        )}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <p className="text-sm font-bold leading-none">{notif.title}</p>
                          <p className="text-xs text-muted-foreground leading-snug line-clamp-2">{notif.description}</p>
                          <p className="text-[10px] text-muted-foreground mt-1 font-medium">{getRelativeTime(notif.time)}</p>
                        </div>
                        <ArrowRight className="h-3 w-3 ml-auto text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </DropdownMenuItem>
                    );
                  })
                )}
              </div>
              <DropdownMenuSeparator className="mx-1 bg-border" />
              <div className="p-1.5 px-2 pb-2">
                <div className="grid grid-cols-3 gap-1.5">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleMarkAllAsRead();
                    }}
                    className="h-8 p-0 text-[10px] font-bold text-primary hover:bg-primary/5 rounded-lg border border-primary/10 transition-all active:scale-95"
                  >
                    Read All
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleClearAll();
                    }}
                    className="h-8 p-0 text-[10px] font-bold text-muted-foreground hover:bg-destructive/5 hover:text-destructive rounded-lg border border-border transition-all active:scale-95"
                  >
                    Clear All
                  </Button>
                  <Link href="/dashboard/settings/notifications" passHref className="block">
                    <Button 
                      variant="outline" 
                      className="w-full h-8 p-0 text-[10px] font-bold text-foreground hover:bg-accent rounded-lg border border-border shadow-xs transition-all active:scale-95 whitespace-nowrap overflow-hidden"
                    >
                      History →
                    </Button>
                  </Link>
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

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
                <span className="hidden sm:inline-block text-sm font-medium mr-1 text-foreground/80 group-hover:text-foreground">{user?.name || 'User'}</span>
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
                    <p className="text-sm font-bold leading-none">{user?.name || 'My Account'}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user?.email || ''}</p>
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
      <SearchPalette open={isSearchOpen} onOpenChange={setIsSearchOpen} />
    </header>
  );
}

