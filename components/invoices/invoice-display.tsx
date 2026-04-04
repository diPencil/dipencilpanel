'use client';

import React from 'react';
import { Invoice, Client, Company } from '@/lib/types';
import { formatCurrency, formatInvoiceDate, formatInvoiceNumber } from '@/lib/formatting';

interface InvoiceDisplayProps {
  invoice: Invoice;
  client: Client;
  company: Company;
}

/* ─── Design tokens (pixel-perfect Hostinger match) ───────────────────────── */
const FONT = 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif';
const C_PRIMARY   = '#111111';
const C_SECONDARY = '#555555';
const C_LIGHT     = '#888888';
const C_BORDER    = '#e5e5e5';
const C_TH_BG     = '#f5f5f5';
const C_TH_BORDER = '#dddddd';
const C_ROW_BD    = '#eeeeee';
const C_PAID      = '#16a34a';
const C_OVERDUE   = '#dc2626';
const C_UNPAID    = '#d97706';

function splitAddressLines(address: string | undefined): string[] {
  if (!address?.trim()) return [];
  if (
    address.includes('61 Lordou Vironos Street') &&
    address.includes('Cyprus') &&
    !address.includes('\n') &&
    !address.includes(',')
  ) {
    return ['61 Lordou Vironos Street', 'Larnaca 6023', 'Cyprus'];
  }
  const byNl = address.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  if (byNl.length > 1) return byNl;
  return address.split(',').map((s) => s.trim()).filter(Boolean);
}

function hostingerOrderRef(invoice: Invoice): string {
  const charSum = invoice.id.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return `hb_${(charSum * 179 + 10000001).toString().slice(-8)}`;
}

function invoiceVatPercent(invoice: Invoice, companyTax: number): number {
  const net = invoice.subtotal - invoice.discountAmount;
  if (net > 0 && invoice.vatAmount > 0) return Math.round((invoice.vatAmount / net) * 1000) / 10;
  const first = invoice.items[0]?.vat;
  if (typeof first === 'number' && first > 0) return first;
  return companyTax;
}

function statusInfo(invoice: Invoice): { text: string; color: string } {
  if (invoice.paymentStatus === 'paid' || invoice.status === 'paid')
    return { text: 'PAID', color: C_PAID };
  if (invoice.status === 'overdue')
    return { text: 'OVERDUE', color: C_OVERDUE };
  return { text: 'UNPAID', color: C_UNPAID };
}

/* re-export token so export-invoice-pdf can reference it if needed */
export { FONT as INVOICE_FONT };

export function InvoiceDisplay({ invoice, client, company }: InvoiceDisplayProps) {
  const companyLogo =
    company.invoiceLogo && company.invoiceLogo !== '/logo.png'
      ? company.invoiceLogo
      : company.logo && company.logo !== '/logo.png'
      ? company.logo
      : '/pencil-logo.png';

  const sellerLines =
    splitAddressLines(company.address).length > 0
      ? splitAddressLines(company.address)
      : ['61 Lordou Vironos Street', 'Larnaca 6023', 'Cyprus'];

  const clientLines  = splitAddressLines(client.address);
  const vatPct       = invoiceVatPercent(invoice, company.taxRate ?? 0);
  const status       = statusInfo(invoice);
  const isPaid       = invoice.paymentStatus === 'paid' || invoice.status === 'paid';
  const amountDue    = isPaid ? 0 : invoice.total;
  const orderRef     = hostingerOrderRef(invoice);

  /* ── one table row ── */
  const renderItem = (item: Invoice['items'][number]) => {
    const qty         = item.quantity || 1;
    const price       = item.price || 0;
    const discountAmt = item.discount ? price * qty * (item.discount / 100) : 0;
    const exclVat     = price * qty - discountAmt;
    const vatAmt      = exclVat * ((item.vat || 0) / 100);
    const total       = exclVat + vatAmt;
    const descLines   = (item.description || '').split('\n').filter(Boolean);

    const N: React.CSSProperties = {
      padding: '14px 8px',
      textAlign: 'right',
      verticalAlign: 'top',
      fontSize: '13px',
      fontWeight: 500,
      color: C_PRIMARY,
      whiteSpace: 'nowrap',
      fontFamily: FONT,
      borderBottom: `1px solid ${C_ROW_BD}`,
    };

    return (
      <tr key={item.id}>
        {/* Description */}
        <td style={{ padding: '14px 8px', verticalAlign: 'top', borderBottom: `1px solid ${C_ROW_BD}`, fontFamily: FONT }}>
          {descLines.map((line, i) => (
            <div key={i} style={{
              fontSize:   i === 0 ? '14px' : '13px',
              fontWeight: i === 0 ? 600    : 400,
              color:      i === 0 ? C_PRIMARY : '#444444',
              lineHeight: 1.4,
              marginTop:  i > 0 ? '2px' : 0,
            }}>
              {line}
            </div>
          ))}
          <div style={{ fontSize: '11px', color: C_LIGHT, marginTop: '4px', lineHeight: 1.4 }}>
            {formatInvoiceDate(invoice.issueDate)} to{' '}
            {invoice.nextBillingDate ? formatInvoiceDate(invoice.nextBillingDate) : '—'}
          </div>
        </td>
        <td style={N}>{formatCurrency(price, invoice.currency)}&nbsp;×&nbsp;{qty}</td>
        <td style={N}>
          {item.discount && item.discount > 0 ? `(${formatCurrency(discountAmt, invoice.currency)})` : '—'}
        </td>
        <td style={N}>{formatCurrency(exclVat, invoice.currency)}</td>
        <td style={N}>{formatCurrency(vatAmt,  invoice.currency)}</td>
        <td style={{ ...N, fontWeight: 700 }}>{formatCurrency(total, invoice.currency)}</td>
      </tr>
    );
  };

  /* ── thin divider ── */
  const Divider = () => <div style={{ height: '1px', background: C_ROW_BD, margin: '12px 0' }} />;

  /* ── root container ── */
  const root: React.CSSProperties = {
    fontFamily: FONT,
    backgroundColor: '#ffffff',
    color: C_PRIMARY,
    width: '860px',
    minHeight: '1123px',
    margin: '40px auto',
    padding: '32px 40px',
    boxSizing: 'border-box',
    fontSize: '13px',
    lineHeight: '1.5',
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid #eaeaea',
    borderRadius: '6px',
  };

  return (
    <div id="invoice-content" style={root}>

      {/* ═══════════════════════════════════════
          HEADER
      ═══════════════════════════════════════ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>

        {/* LEFT — logo + seller */}
        <div style={{ flex: '1 1 auto', minWidth: 0, paddingRight: '40px' }}>
          <div style={{ marginBottom: '12px' }}>
            <img
              src={companyLogo}
              alt={company.name}
              style={{ height: '28px', maxWidth: '120px', objectFit: 'contain', display: 'block' }}
            />
          </div>
          <div style={{ fontSize: '13px', lineHeight: '1.5', color: '#333333', fontFamily: FONT }}>
            <p style={{ margin: 0 }}>{company.name?.trim() || 'Company'}</p>
            {sellerLines.map((l) => <p key={l} style={{ margin: 0 }}>{l}</p>)}
            {company.vatNumber?.trim() && (
              <p style={{ margin: '4px 0 0 0' }}>
                VAT Reg #:&nbsp;<strong style={{ color: C_PRIMARY }}>{company.vatNumber}</strong>
              </p>
            )}
            {company.email?.trim() && <p style={{ margin: '2px 0 0 0' }}>{company.email}</p>}
            {company.phone?.trim() && <p style={{ margin: '1px 0 0 0' }}>{company.phone}</p>}
          </div>
        </div>

        {/* RIGHT — INVOICE title + meta */}
        <div style={{ flexShrink: 0, minWidth: '260px' }}>
          <h1 style={{
            margin: '0 0 12px 0',
            fontSize: '26px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '-0.3px',
            color: C_PRIMARY,
            lineHeight: 1,
            fontFamily: FONT,
          }}>
            INVOICE
          </h1>

          <div style={{ fontSize: '13px', lineHeight: '1.7', color: C_PRIMARY, fontFamily: FONT }}>
            <p style={{ margin: 0 }}>
              <strong style={{ fontWeight: 700 }}>Invoice # </strong>
              <span style={{ fontWeight: 400, color: C_SECONDARY }}>{formatInvoiceNumber(invoice.number)}</span>
            </p>
            <p style={{ margin: 0 }}>
              <strong style={{ fontWeight: 700 }}>Invoice Issued # </strong>
              <span style={{ fontWeight: 400, color: C_SECONDARY }}>{formatInvoiceDate(invoice.issueDate)}</span>
            </p>
            <p style={{ margin: 0 }}>
              <strong style={{ fontWeight: 700 }}>Invoice Amount # </strong>
              <span style={{ fontWeight: 400, color: C_SECONDARY }}>{formatCurrency(invoice.total, invoice.currency)} ({invoice.currency})</span>
            </p>
            {invoice.nextBillingDate && (
              <p style={{ margin: 0 }}>
                <strong style={{ fontWeight: 700 }}>Next Billing Date # </strong>
                <span style={{ fontWeight: 400, color: C_SECONDARY }}>{formatInvoiceDate(invoice.nextBillingDate)}</span>
              </p>
            )}
            <p style={{ margin: 0 }}>
              <strong style={{ fontWeight: 700 }}>Order Nr. # </strong>
              <span style={{ fontWeight: 400, color: C_SECONDARY }}>{orderRef}</span>
            </p>
          </div>

          <p style={{
            margin: '6px 0 0 0',
            fontSize: '13px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: status.color,
            fontFamily: FONT,
          }}>
            {status.text}
          </p>
        </div>
      </div>

      {/* ═══════════════════════════════════════
          BILLED TO
      ═══════════════════════════════════════ */}
      <div style={{ marginTop: '28px' }}>
        <p style={{
          margin: '0 0 6px 0',
          fontSize: '12px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          color: C_PRIMARY,
          fontFamily: FONT,
        }}>
          BILLED TO
        </p>
        <div style={{ fontSize: '13px', lineHeight: '1.6', color: '#222222', fontFamily: FONT }}>
          <p style={{ margin: 0, fontWeight: 600 }}>{client.name}</p>
          {clientLines.map((l) => <p key={l} style={{ margin: 0 }}>{l}</p>)}
          <p style={{ margin: 0 }}>{client.email}</p>
          {client.phone && <p style={{ margin: 0 }}>{client.phone}</p>}
        </div>
      </div>

      {/* ═══════════════════════════════════════
          TABLE
      ═══════════════════════════════════════ */}
      <div style={{ marginTop: '24px' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          tableLayout: 'fixed',
          fontFamily: FONT,
        }}>
          <colgroup>
            <col style={{ width: '36%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '16%' }} />
            <col style={{ width: '8%'  }} />
            <col style={{ width: '14%' }} />
          </colgroup>

          <thead>
            <tr style={{ backgroundColor: C_TH_BG, borderBottom: `1px solid ${C_TH_BORDER}` }}>
              {([ ['DESCRIPTION','left'], ['PRICE','right'], ['DISCOUNT','right'],
                  ['TOTAL EXCL. VAT','right'], ['VAT','right'],
                  [`AMOUNT (${invoice.currency})`, 'right'],
              ] as [string,'left'|'right'][]).map(([label, align]) => (
                <th key={label} style={{
                  padding: '10px 8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                  color: '#444444',
                  textAlign: align,
                  whiteSpace: 'nowrap',
                  fontFamily: FONT,
                }}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>{invoice.items.map(renderItem)}</tbody>
        </table>
      </div>

      {/* ═══════════════════════════════════════
          TOTALS
      ═══════════════════════════════════════ */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
        <div style={{ width: '280px', fontFamily: FONT }}>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
            <span style={{ color: C_SECONDARY }}>Total excl. VAT</span>
            <span style={{ fontWeight: 500 }}>{formatCurrency(invoice.subtotal - invoice.discountAmount, invoice.currency)}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
            <span style={{ color: C_SECONDARY }}>VAT @ {vatPct}%</span>
            <span style={{ fontWeight: 500 }}>{formatCurrency(invoice.vatAmount, invoice.currency)}</span>
          </div>

          <Divider />

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>
            <span>Total</span>
            <span>{formatCurrency(invoice.total, invoice.currency)}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: C_SECONDARY, marginBottom: '8px' }}>
            <span>Payments</span>
            <span>{isPaid ? `(${formatCurrency(invoice.total, invoice.currency)})` : '—'}</span>
          </div>

          <Divider />

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 600 }}>
            <span>Amount Due ({invoice.currency})</span>
            <span>{formatCurrency(amountDue, invoice.currency)}</span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════
          NOTES (optional)
      ═══════════════════════════════════════ */}
      {invoice.notes && (
        <div style={{ borderTop: `1px solid ${C_BORDER}`, marginTop: '24px', paddingTop: '14px' }}>
          <p style={{ margin: '0 0 6px 0', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: C_PRIMARY, fontFamily: FONT }}>
            Notes
          </p>
          <p style={{ margin: 0, fontSize: '13px', color: '#555555', lineHeight: 1.6, whiteSpace: 'pre-wrap', fontFamily: FONT }}>
            {invoice.notes}
          </p>
        </div>
      )}

      {/* ═══════════════════════════════════════
          FOOTER
      ═══════════════════════════════════════ */}
      <div style={{ marginTop: 'auto', paddingTop: '28px' }}>
        <div style={{
          borderTop: `1px solid ${C_BORDER}`,
          paddingTop: '10px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          fontSize: '11px',
          lineHeight: '1.5',
          color: C_LIGHT,
          fontFamily: 'Arial, Helvetica, sans-serif',
        }}>
          <div style={{ maxWidth: '400px' }}>
            <p style={{ margin: 0 }}>Hostinger International Ltd.</p>
            <p style={{ margin: '3px 0 0 0' }}>
              If you would like assistance with renewal or have any questions, please contact our exclusive service middle east agent.
            </p>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '20px' }}>
            <p style={{ margin: 0 }}>Engineer Mahmoud El-Sabbagh</p>
            <p style={{ margin: '3px 0 0 0' }}>Technical Agent Provider in the Middle East @Pencil Studio.</p>
          </div>
        </div>
      </div>

    </div>
  );
}
