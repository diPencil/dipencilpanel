/**
 * Format currency amount with proper localization
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/**
 * Format date to readable string (e.g., "January 15, 2024")
 */
export function formatDate(date: string | Date): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(date));
  } catch {
    return new Date(date).toLocaleDateString();
  }
}

/**
 * Hostinger-style invoice dates: "Mar 08, 2025" (short month, zero-padded day)
 */
export function formatInvoiceDate(date: string | Date): string {
  try {
    const d = new Date(date);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const m = months[d.getMonth()];
    const day = String(d.getDate()).padStart(2, '0');
    return `${m} ${day}, ${d.getFullYear()}`;
  } catch {
    return formatDate(date);
  }
}

/**
 * Format date for input fields (YYYY-MM-DD)
 */
export function formatDateForInput(date: string | Date): string {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

/**
 * Format time to readable string (e.g., "2:30 PM")
 */
export function formatTime(date: string | Date): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(date));
  } catch {
    return new Date(date).toLocaleTimeString();
  }
}

/**
 * Format a number with commas
 */
export function formatNumber(num: number, decimals: number = 2): string {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 0): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Truncate text to specified length
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Capitalize first letter of string
 */
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Format phone number
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

/**
 * Get relative time (e.g., "2 days ago")
 */
export function getRelativeTime(date: string | Date): string {
  const now = new Date();
  const targetDate = new Date(date);
  const diffMs = now.getTime() - targetDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

/**
 * Format invoice number (strip extra hyphens if they are in the INV-YYYY-XXXX pattern)
 */
export function formatInvoiceNumber(num: string): string {
  if (!num) return '';
  
  // 1. Handle Old Format: INV-YYYY-XXXX -> INV-YYYYXXXX
  let normalized = num.replace(/^INV-(\d{4})-(\d{4,8})$/, 'INV-$1$2');

  // 2. Randomize Sequential Display: If it's a short sequence (e.g., 0001), make it look random (deterministic)
  const match = normalized.match(/^INV-(\d{4})(\d{4,8})$/);
  if (match) {
    const year = match[1];
    const seqStr = match[2];
    const seq = parseInt(seqStr, 10);
    
    // If it looks like a sequential number (starts with zeros or very small)
    if (seq < 10000 && seqStr.length <= 4) {
      // Create a deterministic "random" number based on the sequence
      // Use a hash to map 1, 2, 3... to a consistent 4-digit range (1000-9999)
      const hash = ((seq * 7919) % 9000 + 1000).toString();
      return `INV-${year}${hash}`;
    }
  }
  
  return normalized;
}
