'use server';

import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export interface NotificationItem {
  id: string;
  type: 'subscription' | 'user_activity' | 'invoice_sent' | 'business_email';
  title: string;
  description: string;
  time: Date;
  status?: 'unread' | 'read';
  priority: 'low' | 'medium' | 'high';
  redirectUrl: string;
}

export async function getNotifications(mode: 'dropdown' | 'full' = 'dropdown'): Promise<NotificationItem[]> {
  const session = await getSession();
  if (!session) return [];

  const notifications: NotificationItem[] = [];

  try {
    // Get user's check times
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { lastNotificationCheck: true, lastNotificationClearCheck: true }
    });

    const lastCheck = user?.lastNotificationCheck || new Date(0);
    const lastClear = mode === 'dropdown' ? (user?.lastNotificationClearCheck || new Date(0)) : new Date(0);

    // Filter helper: skip if older than lastClear when in dropdown mode
    const isNewerThanClear = (date: Date) => date > lastClear;

    // 1. Subscriptions expiring in next 7 days
    const expiringSubscriptions = await prisma.subscription.findMany({
      where: {
        endDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        status: 'active',
      },
      take: mode === 'dropdown' ? 10 : 50,
    });

    expiringSubscriptions.forEach(sub => {
      if (isNewerThanClear(sub.endDate)) {
        notifications.push({
          id: `sub-${sub.id}`,
          type: 'subscription',
          title: 'Subscription Expiring',
          description: `${sub.serviceName || sub.serviceType} plan "${sub.planName}" expires on ${sub.endDate.toLocaleDateString()}`,
          time: sub.endDate,
          priority: 'high',
          status: sub.endDate > lastCheck ? 'unread' : 'read',
          redirectUrl: `/dashboard/billing/subscriptions`,
        });
      }
    });

    // 2. User Activity (Recent logins/logouts)
    const recentUsers = await prisma.user.findMany({
      where: {
        OR: [
          { lastLogin: { gte: lastClear } },
          { lastLogoutAt: { gte: lastClear } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      take: mode === 'dropdown' ? 10 : 100,
    });

    recentUsers.forEach(u => {
      if (u.lastLogin && isNewerThanClear(u.lastLogin) && (!u.lastLogoutAt || u.lastLogin > u.lastLogoutAt)) {
        notifications.push({
          id: `login-${u.id}-${u.lastLogin.getTime()}`,
          type: 'user_activity',
          title: 'User Login',
          description: `${u.name} (@${u.username}) opened the system.`,
          time: u.lastLogin,
          priority: 'medium',
          status: u.lastLogin > lastCheck ? 'unread' : 'read',
          redirectUrl: `/dashboard/management/users`,
        });
      } else if (u.lastLogoutAt && isNewerThanClear(u.lastLogoutAt)) {
        notifications.push({
          id: `logout-${u.id}-${u.lastLogoutAt.getTime()}`,
          type: 'user_activity',
          title: 'User Logout',
          description: `${u.name} (@${u.username}) closed the system.`,
          time: u.lastLogoutAt,
          priority: 'low',
          status: u.lastLogoutAt > lastCheck ? 'unread' : 'read',
          redirectUrl: `/dashboard/management/users`,
        });
      }
    });

    // 3. Invoices Sent (via ReminderLog)
    const sentInvoices = await prisma.reminderLog.findMany({
      where: mode === 'dropdown' ? { sentAt: { gte: lastClear } } : {},
      orderBy: { sentAt: 'desc' },
      take: mode === 'dropdown' ? 10 : 100,
    });

    sentInvoices.forEach(log => {
      notifications.push({
        id: `inv-${log.id}`,
        type: 'invoice_sent',
        title: 'Invoice Sent',
        description: `Reminder for ${log.serviceName} sent to client.`,
        time: log.sentAt,
        priority: 'medium',
        status: log.sentAt > lastCheck ? 'unread' : 'read',
        redirectUrl: `/dashboard/billing/invoices`,
      });
    });

    // 4. Business Emails Sent
    const sentBusinessEmails = await prisma.businessEmail.findMany({
      where: { 
        status: 'sent',
        ...(mode === 'dropdown' ? { sentAt: { gte: lastClear } } : {})
      },
      orderBy: { sentAt: 'desc' },
      take: mode === 'dropdown' ? 10 : 100,
    });

    sentBusinessEmails.forEach(email => {
      if (email.sentAt) {
        notifications.push({
          id: `bus-${email.id}`,
          type: 'business_email',
          title: 'Business Email Sent',
          description: `"${email.subject}" was successfully sent.`,
          time: email.sentAt,
          priority: 'low',
          status: email.sentAt > lastCheck ? 'unread' : 'read',
          redirectUrl: `/dashboard/services/email`,
        });
      }
    });

    // Sort all by time descending
    return notifications.sort((a, b) => b.time.getTime() - a.time.getTime());

  } catch (err) {
    console.error('[getNotifications]', err);
    return [];
  }
}

export async function markNotificationsAsRead() {
  const session = await getSession();
  if (!session) return { success: false };

  try {
    await prisma.user.update({
      where: { id: session.userId },
      data: { lastNotificationCheck: new Date() }
    });
    return { success: true };
  } catch (err) {
    console.error('[markNotificationsAsRead]', err);
    return { success: false };
  }
}

export async function markNotificationsAsCleared() {
  const session = await getSession();
  if (!session) return { success: false };

  try {
    await prisma.user.update({
      where: { id: session.userId },
      data: { 
        lastNotificationClearCheck: new Date(),
        lastNotificationCheck: new Date(), // Marking as cleared also means marking as read
      }
    });
    return { success: true };
  } catch (err) {
    console.error('[markNotificationsAsCleared]', err);
    return { success: false };
  }
}
