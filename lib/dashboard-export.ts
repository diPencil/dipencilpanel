/** Escape a field for RFC-style CSV (comma-separated). */
function csvEscape(value: string): string {
  // Leading = + - @ can be interpreted as formulas in Excel — tab prefix forces text
  let s = value;
  if (/^[=+\-@]/.test(s.trimStart())) {
    s = `\t${s}`;
  }
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function flattenCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

/** Build a CSV string from heterogeneous object rows (nested values JSON-encoded). */
export function rowsToCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';

  const flatRows = rows.map((row) => {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) {
      out[k] = flattenCell(v);
    }
    return out;
  });

  const headers = Array.from(new Set(flatRows.flatMap((r) => Object.keys(r)))).sort();

  const lines = [
    headers.map(csvEscape).join(','),
    ...flatRows.map((row) => headers.map((h) => csvEscape(row[h] ?? '')).join(',')),
  ];

  return lines.join('\r\n');
}

/** Replacer for JSON.stringify — Dates and BigInt values from APIs/DB. */
export function dashboardExportJsonReplacer(_key: string, value: unknown): unknown {
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return value.toISOString();
  return value;
}

export function safeJsonStringify(value: unknown, space?: number): string {
  return JSON.stringify(value, dashboardExportJsonReplacer, space);
}

/**
 * Trigger a file download. Revokes the object URL after a short delay so the
 * browser can start reading the blob (immediate revoke can truncate/cancel downloads).
 */
export function downloadTextFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2500);
}

/** Space out multiple downloads so Chrome/Safari do not block after the first file. */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
