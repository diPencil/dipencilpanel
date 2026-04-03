import { Company } from './types';

/**
 * Convert an amount from one currency to another using the company's exchange rates.
 * If rates are missing, returns the original amount.
 */
export function convertCurrency(
  amount: number,
  from: string,
  to: string,
  company: Company
): number {
  if (from === to) return amount;
  
  const rates = company.exchangeRates || {};
  
  // Logic: 
  // 1. If 'from' is base (e.g. USD), multiply by 'to' rate.
  // 2. If 'to' is base (e.g. USD), divide by 'from' rate.
  // 3. Cross conversion: Convert 'from' to USD, then USD to 'to'.
  
  const baseCurrency = company.currency || 'USD';
  
  let amountInBase = amount;
  
  // Step 1: Convert to base (USD)
  if (from !== baseCurrency) {
    const rateToFrom = rates[from] || 1;
    amountInBase = amount / rateToFrom;
  }
  
  // Step 2: Convert from base to target
  if (to === baseCurrency) {
    return amountInBase;
  } else {
    const rateToTarget = rates[to] || 1;
    return amountInBase * rateToTarget;
  }
}
