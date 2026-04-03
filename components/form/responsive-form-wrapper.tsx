import { ReactNode } from 'react';
import { Card } from '@/components/ui/card';

interface ResponsiveFormWrapperProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg';
}

export function ResponsiveFormWrapper({
  title,
  subtitle,
  children,
  maxWidth = 'md',
}: ResponsiveFormWrapperProps) {
  const maxWidthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
  }[maxWidth];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-muted-foreground text-sm sm:text-base">{subtitle}</p>}
      </div>

      <Card className="p-4 sm:p-6 md:p-8">
        <div className={`mx-auto ${maxWidthClass}`}>
          {children}
        </div>
      </Card>
    </div>
  );
}
