'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 mb-6">
        <Search className="h-10 w-10 text-primary" />
      </div>
      <h1 className="text-4xl font-bold tracking-tight sm:text-6xl mb-4">404</h1>
      <h2 className="text-2xl font-semibold mb-2">Page not found</h2>
      <p className="text-muted-foreground max-w-md mb-8">
        The page you are looking for doesn't exist or has been moved to another URL.
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Link href="/dashboard">
          <Button className="gap-2 rounded-xl h-11 px-8">
            <Home className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
        <Link href="/dashboard/reach">
          <Button variant="outline" className="rounded-xl h-11 px-8">
            Contact Support
          </Button>
        </Link>
      </div>
    </div>
  );
}
