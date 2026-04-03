import React from 'react';
import { cn } from '@/lib/utils';

type Status = 'paid' | 'pending' | 'overdue' | 'unpaid';

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const statusStyles: Record<Status, string> = {
    paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    pending: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    overdue: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    unpaid: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  };

  const statusLabels: Record<Status, string> = {
    paid: 'Paid',
    pending: 'Pending',
    overdue: 'Overdue',
    unpaid: 'Unpaid',
  };

  return (
    <span
      className={cn(
        'px-3 py-1 rounded-full text-xs font-medium inline-block',
        statusStyles[status],
        className
      )}
    >
      {statusLabels[status]}
    </span>
  );
}
