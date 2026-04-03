'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Monitor, 
  Globe, 
  User, 
  FileText, 
  Layout, 
  ArrowRight,
  Loader2,
  Mail,
  Zap,
  Smartphone,
  Command as CommandIcon 
} from 'lucide-react';
import { 
  CommandDialog, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList,
  CommandSeparator
} from '@/components/ui/command';
import { globalSearch, SearchResult } from '@/app/actions/search';
import { useRouter } from 'next/navigation';
import { Kbd } from '@/components/ui/kbd';

interface SearchPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchPalette({ open, onOpenChange }: SearchPaletteProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchResults = async () => {
      if (query.length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const data = await globalSearch(query);
        setResults(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchResults, 200);
    return () => clearTimeout(timer);
  }, [query]);

  const onSelect = useCallback((url: string) => {
    onOpenChange(false);
    router.push(url);
  }, [router, onOpenChange]);

  // Type-based grouping
  const grouped = results.reduce((acc, curr) => {
    if (!acc[curr.type]) acc[curr.type] = [];
    acc[curr.type].push(curr);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  const getIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'page': return <Layout className="mr-2 h-4 w-4 text-blue-500" />;
      case 'client': return <User className="mr-2 h-4 w-4 text-green-500" />;
      case 'website': return <Monitor className="mr-2 h-4 w-4 text-purple-500" />;
      case 'domain': return <Globe className="mr-2 h-4 w-4 text-amber-500" />;
      case 'vps': return <Monitor className="mr-2 h-4 w-4 text-slate-500" />;
      case 'email': return <Mail className="mr-2 h-4 w-4 text-blue-400" />;
      case 'invoice': return <FileText className="mr-2 h-4 w-4 text-red-500" />;
      case 'subscription': return <Zap className="mr-2 h-4 w-4 text-amber-400" />;
      case 'app': return <Smartphone className="mr-2 h-4 w-4 text-indigo-500" />;
      case 'user': return <User className="mr-2 h-4 w-4 text-slate-400" />;
      default: return <FileText className="mr-2 h-4 w-4" />;
    }
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} shouldFilter={false}>
      <div className="flex items-center border-b px-3">
        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
        <CommandInput 
          placeholder="Search for anything (pages, clients, websites...)" 
          value={query}
          onValueChange={setQuery}
          className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
        />
        {loading && <Loader2 className="h-4 w-4 animate-spin opacity-50" />}
        <Kbd className="ml-2 hidden md:inline-flex">ESC</Kbd>
      </div>
      <CommandList className="max-h-[450px] overflow-y-auto scrollbar-thin">
        <CommandEmpty className="py-12 text-center flex flex-col items-center">
          <Search className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground px-10">
            {query.length < 2 ? "Type shared keywords to see instant results..." : "No results found for this search."}
          </p>
        </CommandEmpty>

        {Object.entries(grouped).map(([type, items]) => (
          <React.Fragment key={type}>
            <CommandGroup 
              heading={<span className="text-[10px] uppercase tracking-widest font-black text-muted-foreground/50">{type}s</span>}
              className="p-1.5"
            >
              {items.map((item) => (
                <CommandItem
                  key={item.id}
                  onSelect={() => onSelect(item.url)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-default focus:bg-accent group transition-all"
                >
                  <div className="p-2 rounded-lg bg-background border border-border/50 shadow-xs group-hover:scale-110 transition-transform">
                    {getIcon(item.type)}
                  </div>
                  <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground leading-none">{item.title}</p>
                    {item.subtitle && <p className="text-[11px] text-muted-foreground truncate">{item.subtitle}</p>}
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator className="mx-2" />
          </React.Fragment>
        ))}

        <div className="p-4 flex items-center justify-between text-[10px] text-muted-foreground/60 border-t mt-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><CommandIcon className="h-3 w-3" /> Search</span>
            <span className="flex items-center gap-1 font-mono bg-muted px-1.5 py-0.5 rounded border border-border/50">Enter</span> to select
          </div>
          <div className="flex items-center gap-4 font-bold uppercase tracking-wider">
            Powered by diPencil Search
          </div>
        </div>
      </CommandList>
    </CommandDialog>
  );
}
