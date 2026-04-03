'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Company } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CURRENCIES } from '@/lib/constants';
import { RefreshCw, TrendingUp, Info } from 'lucide-react';

interface CurrencyConverterProps {
  company: Company;
  onUpdateRates: (rates: Record<string, number>) => void;
  isLoading?: boolean;
}

export function CurrencyConverter({ company, onUpdateRates, isLoading }: CurrencyConverterProps) {
  const [rates, setRates] = useState<Record<string, number>>(company.exchangeRates || {});
  const baseCurrency = company.currency || 'USD';
  const isDirtyRef = useRef(false);

  // Sync from company prop whenever it loads/changes from DB (only if user isn't mid-edit)
  useEffect(() => {
    if (!isDirtyRef.current) {
      setRates(company.exchangeRates || {});
    }
  }, [company.exchangeRates]);

  const handleRateChange = (currency: string, value: string) => {
    isDirtyRef.current = true;
    const numValue = parseFloat(value) || 0;
    setRates(prev => ({ ...prev, [currency]: numValue }));
  };

  const handleSave = () => {
    isDirtyRef.current = false;
    onUpdateRates(rates);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold">Exchange Rates</h3>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={isLoading}
          size="sm"
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Update Rates
        </Button>
      </div>

      <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-primary mt-0.5" />
        <div className="text-sm">
          <p className="font-bold text-primary mb-1 text-xs uppercase tracking-wider">Base Currency: {baseCurrency}</p>
          <p className="text-muted-foreground text-xs leading-relaxed">
            These rates are used to calculate prices when switching currencies. 
            For example, if 1 {baseCurrency} = 50.00 EGP, a $10 invoice will show as 500 EGP.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {CURRENCIES.filter(curr => curr !== baseCurrency).map((curr) => (
          <div key={curr} className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <label className="text-sm font-bold text-gray-700">1 {baseCurrency} =</label>
              <span className="text-[10px] font-bold bg-gray-100 px-2 py-0.5 rounded text-gray-500 uppercase tracking-[0.05em]">{curr}</span>
            </div>
            <div className="relative group">
               <Input
                type="number"
                value={rates[curr] || ''}
                onChange={(e) => handleRateChange(curr, e.target.value)}
                placeholder="0.00"
                step="0.01"
                className="pl-3 h-11 font-mono text-base font-semibold border-gray-200 group-hover:border-primary/30 transition-all"
                disabled={isLoading}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold pointer-events-none text-xs">
                {curr}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
