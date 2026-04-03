'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCcw, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10 mb-6 font-bold">
        <AlertTriangle className="h-10 w-10 text-destructive" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4 text-balance">Something went wrong!</h1>
      <p className="text-muted-foreground max-w-md mb-8 leading-relaxed">
        An unexpected error occurred while rendering this page. 
        We have been notified and are working on a fix.
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Button onClick={() => reset()} className="gap-2 rounded-xl h-11 px-8">
          <RefreshCcw className="h-4 w-4" />
          Try again
        </Button>
        <Link href="/dashboard">
          <Button variant="outline" className="rounded-xl h-11 px-8">
            Return Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
