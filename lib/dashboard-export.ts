/** Escape a field for RFC-style CSV (comma-separated). */
function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function flattenCell(value: unknown): string {
  if (value === null || value === undefined) return '';
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
  URL.revokeObjectURL(url);
}
