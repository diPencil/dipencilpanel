import { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  children?: ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  children,
}: EmptyStateProps) {
  return (
    <Card className="p-8 sm:p-12 text-center">
      {Icon && (
        <div className="flex justify-center mb-4">
          <Icon className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground/50" />
        </div>
      )}
      <h3 className="text-lg sm:text-xl font-semibold mb-2">{title}</h3>
      {description && (
        <p className="text-sm sm:text-base text-muted-foreground mb-6">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick} asChild={!!action.href}>
          {action.href ? (
            <a href={action.href}>{action.label}</a>
          ) : (
            action.label
          )}
        </Button>
      )}
      {children}
    </Card>
  );
}
