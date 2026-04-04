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

// All fonts are system fonts (Arial/Helvetica) — no @font-face rules to preserve
function shouldKeepFontStyleTag(_node: Element): boolean {
  return false;
}

/**
 * Renders the element to a single-page A4 PDF via html2canvas.
 * The onclone handler strips Tailwind stylesheets and copies resolved RGB styles
 * so html2canvas never sees lab()/oklch() values.
 */
export async function exportElementToPdf(element: HTMLElement, filename: string): Promise<void> {
  const html2canvas = (await import('html2canvas')).default;
  // @ts-ignore — force the browser ES build; the node build breaks Next/Turbopack SSR
  const { default: jsPDF } = await import('jspdf/dist/jspdf.es.min.js');

  /** A4 at 96dpi — matches jsPDF `format: 'a4'` (210×297mm). */
  const pageWidthPx = 794;
  const pageHeightPx = 1123;

  const prevInline = {
    width: element.style.width,
    minHeight: element.style.minHeight,
    maxWidth: element.style.maxWidth,
  };

  element.style.width = `${pageWidthPx}px`;
  element.style.maxWidth = `${pageWidthPx}px`;
  // Keep the capture at least one A4 page tall, but allow the content to fit on a single page.
  const captureHeight = Math.max(element.scrollHeight, pageHeightPx);
  element.style.minHeight = `${captureHeight}px`;

  const renderWidth = pageWidthPx;
  const renderHeight = captureHeight;

  let canvas: HTMLCanvasElement;
  try {
    canvas = await html2canvas(element, {
      scale: 1.75,
      width: renderWidth,
      height: renderHeight,
      windowWidth: renderWidth,
      windowHeight: renderHeight,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      foreignObjectRendering: false,
      onclone: (clonedDoc, clonedElement) => {
        // 1. Remove every stylesheet so html2canvas never parses lab()/oklch()
        clonedDoc
          .querySelectorAll('link[rel="stylesheet"], link[rel="preload"][as="style"], style')
          .forEach((el) => {
            if (shouldKeepFontStyleTag(el)) return;
            el.remove();
          });

        // 2. Force safe backgrounds on root elements
        clonedDoc.documentElement.style.cssText = 'background:#ffffff !important;';
        clonedDoc.body.style.cssText = 'background:#ffffff !important; margin:0; padding:0;';

        // 3. Copy resolved rgb() computed values from the live DOM onto the clone
        flattenCloneForCanvas(element, clonedElement);
      },
    });
  } finally {
    element.style.width = prevInline.width;
    element.style.minHeight = prevInline.minHeight;
    element.style.maxWidth = prevInline.maxWidth;
  }

  // PNG keeps invoice text sharper vs JPEG (Hostinger PDFs are vector; this is the closest raster match)
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const scale = Math.min(pageW / canvas.width, pageH / canvas.height);
  const pdfWidth = canvas.width * scale;
  const pdfHeight = canvas.height * scale;
  const offsetX = (pageW - pdfWidth) / 2;
  const offsetY = (pageH - pdfHeight) / 2;

  pdf.addImage(imgData, 'PNG', offsetX, offsetY, pdfWidth, pdfHeight);

  pdf.save(filename);
}

// Keep exportInvoiceToPdf as a thin wrapper so the page import still compiles
export { exportElementToPdf as exportInvoiceToPdf };

export function invoicePdfFilename(invoiceNumber: string): string {
  const safe = invoiceNumber.replace(/[^\w.-]+/g, '-').replace(/^-|-$/g, '') || 'invoice';
  return `${safe}.pdf`;
}
