/**
 * Invoice PDF export — screenshots the live #invoice-content DOM element so the
 * PDF is pixel-perfect identical to the on-screen preview.
 *
 * Tailwind v4 uses lab()/oklch() colors that html2canvas can't parse.
 * Fix: in onclone we (1) strip all stylesheets, (2) force safe hex backgrounds on
 * root elements, and (3) copy resolved rgb() computed values inline on every element.
 */

/** Returns true if the CSS value contains a color function html2canvas can't parse. */
function hasUnsupportedColorFn(value: string): boolean {
  return /\b(oklch|oklab|lab|lch|color)\s*\(/.test(value);
}

function copyComputedStylesInline(orig: HTMLElement, clone: HTMLElement): void {
  const cs = window.getComputedStyle(orig);
  for (let i = 0; i < cs.length; i++) {
    const prop = cs.item(i);
    if (!prop || prop.startsWith('--')) continue;
    const val = cs.getPropertyValue(prop);
    if (hasUnsupportedColorFn(val)) continue;
    try {
      clone.style.setProperty(prop, val, cs.getPropertyPriority(prop) || undefined);
    } catch {
      /* ignore read-only or unknown properties */
    }
  }
}

function flattenCloneForCanvas(origRoot: HTMLElement, cloneRoot: HTMLElement): void {
  const walk = (orig: Element, clone: Element) => {
    if (!(orig instanceof HTMLElement) || !(clone instanceof HTMLElement)) return;
    clone.removeAttribute('class');
    clone.removeAttribute('id');
    copyComputedStylesInline(orig, clone);
    const oc = Array.from(orig.children);
    const cc = Array.from(clone.children);
    const len = Math.min(oc.length, cc.length);
    for (let i = 0; i < len; i++) walk(oc[i], cc[i]);
  };
  walk(origRoot, cloneRoot);
  // Restore the id so html2canvas can locate the root
  cloneRoot.setAttribute('id', 'invoice-content');
}

/**
 * Renders the element to a multi-page A4 PDF via html2canvas.
 * The onclone handler strips Tailwind stylesheets and copies resolved RGB styles
 * so html2canvas never sees lab()/oklch() values.
 */
export async function exportElementToPdf(element: HTMLElement, filename: string): Promise<void> {
  const html2canvas = (await import('html2canvas')).default;
  // @ts-ignore — force the browser ES build; the node build breaks Next/Turbopack SSR
  const { default: jsPDF } = await import('jspdf/dist/jspdf.es.min.js');

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    logging: false,
    backgroundColor: '#ffffff',
    foreignObjectRendering: false,
    onclone: (clonedDoc, clonedElement) => {
      // 1. Remove every stylesheet so html2canvas never parses lab()/oklch()
      clonedDoc
        .querySelectorAll('link[rel="stylesheet"], link[rel="preload"][as="style"], style')
        .forEach((el) => el.remove());

      // 2. Force safe backgrounds on root elements
      clonedDoc.documentElement.style.cssText = 'background:#ffffff !important;';
      clonedDoc.body.style.cssText = 'background:#ffffff !important; margin:0; padding:0;';

      // 3. Copy resolved rgb() computed values from the live DOM onto the clone
      flattenCloneForCanvas(element, clonedElement);
    },
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const imgH = (canvas.height * pageW) / canvas.width;

  let remaining = imgH;
  let offset = 0;

  pdf.addImage(imgData, 'JPEG', 0, offset, pageW, imgH);
  remaining -= pageH;

  while (remaining > 0) {
    offset = remaining - imgH;
    pdf.addPage();
    pdf.addImage(imgData, 'JPEG', 0, offset, pageW, imgH);
    remaining -= pageH;
  }

  pdf.save(filename);
}

// Keep exportInvoiceToPdf as a thin wrapper so the page import still compiles
export { exportElementToPdf as exportInvoiceToPdf };

export function invoicePdfFilename(invoiceNumber: string): string {
  const safe = invoiceNumber.replace(/[^\w.-]+/g, '-').replace(/^-|-$/g, '') || 'invoice';
  return `${safe}.pdf`;
}
