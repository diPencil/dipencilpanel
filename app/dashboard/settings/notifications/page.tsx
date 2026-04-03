'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Bell, 
  Search, 
  Shield, 
  User, 
  Mail, 
  ArrowRight,
  Filter,
  Calendar,
  Clock
} from 'lucide-react';
import { getNotifications, NotificationItem } from '@/app/actions/notifications';
import { getRelativeTime, formatDate } from '@/lib/formatting';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    const fetchAll = async () => {
      setIsLoading(true);
      try {
        const data = await getNotifications('full');
        setNotifications(data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAll();
  }, []);

  const filtered = useMemo(() => {
    return notifications.filter(n => {
      const matchesSearch = 
        n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = filterType === 'all' || n.type === filterType;

      return matchesSearch && matchesType;
    });
  }, [notifications, searchTerm, filterType]);

  const typeIcons = {
    subscription: { Icon: Shield, color: 'text-red-500', bg: 'bg-red-500/10' },
    user_activity: { Icon: User, color: 'text-green-500', bg: 'bg-green-500/10' },
    invoice_sent: { Icon: Mail, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    business_email: { Icon: Mail, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-2 px-1">
        <h1 className="text-3xl font-bold">System Notifications</h1>
        <p className="text-muted-foreground">The complete log of all activities and alerts across your diPencil Panel</p>
      </div>

      <Card className="p-4 border-border/50 shadow-sm bg-card/50 backdrop-blur-sm">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search notifications..." 
              className="pl-10 h-11 rounded-xl bg-background border-border/40 focus:ring-primary/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2 shrink-0 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {['all', 'subscription', 'user_activity', 'invoice_sent', 'business_email'].map(type => (
              <Button
                key={type}
                variant={filterType === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType(type)}
                className="rounded-full h-11 px-6 capitalize font-semibold shadow-sm transition-all"
              >
                {type.replace('_', ' ')}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-muted/40 animate-pulse border border-border/20" />
          ))
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center bg-card rounded-3xl border border-dashed border-border/60 shadow-xs">
            <div className="p-6 rounded-full bg-muted/30 mb-4 animate-bounce">
              <Bell className="h-10 w-10 text-muted-foreground opacity-30" />
            </div>
            <h3 className="text-xl font-bold text-foreground/80">No matches found</h3>
            <p className="text-muted-foreground max-w-xs mt-2 italic px-6">
              Try adjusting your search term or filters to find what you&apos;re looking for.
            </p>
          </div>
        ) : (
          filtered.map((notif) => {
            const { Icon, color, bg } = typeIcons[notif.type] || typeIcons.subscription;
            
            return (
              <Link 
                key={notif.id} 
                href={notif.redirectUrl}
                className="block group"
              >
                <div className="flex gap-4 p-5 rounded-2xl bg-card border border-border/40 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 relative overflow-hidden">
                  <div className={cn("p-3.5 rounded-2xl shrink-0 transition-transform group-hover:scale-110", bg, color)}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0 pr-10">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-lg font-bold text-foreground leading-none">{notif.title}</h4>
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter",
                        notif.priority === 'high' ? 'bg-red-500/10 text-red-500' : 
                        notif.priority === 'medium' ? 'bg-amber-500/10 text-amber-500' : 
                        'bg-slate-500/10 text-slate-500'
                      )}>
                        {notif.priority}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground font-medium leading-relaxed mb-3">{notif.description}</p>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground/70">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <Clock className="h-3.5 w-3.5" />
                        {getRelativeTime(notif.time)}
                      </div>
                      <div className="flex items-center gap-1.5 font-semibold">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(notif.time)}
                      </div>
                    </div>
                  </div>
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 translate-x-4 transition-all duration-300">
                    <div className="p-2 rounded-full bg-primary/10 text-primary">
                      <ArrowRight className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
