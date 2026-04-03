'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, Lock } from 'lucide-react';

export default function AgentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-bold tracking-tight">Agents</h1>
        <Badge variant="destructive">Beta</Badge>
      </div>
      <p className="text-muted-foreground">Automate your hosting tasks with AI-powered agents</p>

      <Card className="p-8 text-center">
        <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
        <h3 className="text-lg font-semibold mb-2">Coming Soon</h3>
        <p className="text-muted-foreground">
          Agents are currently in beta and will be available soon. This feature will allow you to
          automate repetitive tasks with AI-powered assistants.
        </p>
      </Card>

      <Card className="p-6 border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
        <div className="flex gap-3">
          <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-900 dark:text-blue-100">Beta Program</h4>
            <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
              Interested in beta testing? Join our beta program to get early access to agents and help
              shape the future of automation in our platform.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
