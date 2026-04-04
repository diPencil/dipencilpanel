'use client';

import React from 'react';
import { Invoice, Client, Company } from '@/lib/types';
import { formatCurrency, formatInvoiceDate, formatInvoiceNumber } from '@/lib/formatting';

interface InvoiceDisplayProps {
  invoice: Invoice;
  client: Client;
  company: Company;
}

const FONT = 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';
const C_PRIMARY   = '#111111';
const C_SECONDARY = '#666666';
const C_LIGHT     = '#999999';
const C_BORDER    = '#e5e5e5';
const C_TH_BG     = '#f2f2f2';
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

  // ─── render one table row ───────────────────────────────────────────────────
  const renderItem = (item: Invoice['items'][number]) => {
    const qty          = item.quantity || 1;
    const price        = item.price || 0;
    const discountAmt  = item.discount ? price * qty * (item.discount / 100) : 0;
    const exclVat      = price * qty - discountAmt;
    const vatAmt       = exclVat * ((item.vat || 0) / 100);
    const total        = exclVat + vatAmt;

    const descLines = (item.description || '').split('\n').filter(Boolean);

    const numCell: React.CSSProperties = {
      padding: '16px 10px',
      textAlign: 'right',
      verticalAlign: 'middle',
      fontSize: '14px',
      fontWeight: 500,
      color: C_PRIMARY,
      whiteSpace: 'nowrap',
      fontFamily: FONT,
      borderBottom: `1px solid ${C_BORDER}`,
    };

    return (
      <tr key={item.id}>
        {/* Description */}
        <td style={{ padding: '16px 10px', verticalAlign: 'top', borderBottom: `1px solid ${C_BORDER}` }}>
          {descLines.map((line, i) => (
            <div
              key={i}
              style={{
                fontSize: i === 0 ? '14px' : '13px',
                fontWeight: i === 0 ? 600 : 400,
                color: i === 0 ? C_PRIMARY : '#444444',
                lineHeight: 1.4,
                marginTop: i > 0 ? '2px' : 0,
                fontFamily: FONT,
              }}
            >
              {line}
            </div>
          ))}
          <div style={{ fontSize: '12px', color: '#888888', marginTop: '5px', lineHeight: 1.4, fontFamily: FONT }}>
            {formatInvoiceDate(invoice.issueDate)} to{' '}
            {invoice.nextBillingDate ? formatInvoiceDate(invoice.nextBillingDate) : '—'}
          </div>
        </td>

        {/* Price × qty */}
        <td style={numCell}>
          {formatCurrency(price, invoice.currency)}&nbsp;×&nbsp;{qty}
        </td>

        {/* Discount */}
        <td style={numCell}>
          {item.discount && item.discount > 0
            ? `(${formatCurrency(discountAmt, invoice.currency)})`
            : '—'}
        </td>

        {/* Total excl. VAT */}
        <td style={numCell}>{formatCurrency(exclVat, invoice.currency)}</td>

        {/* VAT */}
        <td style={numCell}>{formatCurrency(vatAmt, invoice.currency)}</td>

        {/* Amount */}
        <td style={{ ...numCell, fontWeight: 700 }}>{formatCurrency(total, invoice.currency)}</td>
      </tr>
    );
  };

  // ─── root styles shared between screen + PDF ────────────────────────────────
  const root: React.CSSProperties = {
    fontFamily: FONT,
    backgroundColor: '#ffffff',
    color: C_PRIMARY,
    width: '794px',
    minHeight: '1123px',
    margin: '0 auto',
    padding: '40px',
    boxSizing: 'border-box',
    fontSize: '14px',
    lineHeight: '1.5',
    display: 'flex',
    flexDirection: 'column',
  };

  return (
    <div id="invoice-content" style={root}>

      {/* ════════════════════════════════════════════════════════════
          HEADER  —  logo/seller LEFT  |  INVOICE title/meta RIGHT
      ════════════════════════════════════════════════════════════ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '40px', marginBottom: '32px' }}>

        {/* ── LEFT: logo + seller ── */}
        <div style={{ flex: '1 1 auto', minWidth: 0 }}>
          {/* Logo */}
          <div style={{ marginBottom: '10px' }}>
            <img
              src={companyLogo}
              alt={company.name}
              style={{ height: '24px', maxWidth: '118px', objectFit: 'contain', display: 'block' }}
            />
          </div>

          {/* Seller address */}
          <div style={{ fontSize: '14px', lineHeight: '1.6', color: '#444444' }}>
            <p style={{ margin: '0 0 2px 0', fontWeight: 400, color: C_PRIMARY, fontFamily: FONT }}>
              {company.name?.trim() || 'Company'}
            </p>
            {sellerLines.map((line) => (
              <p key={line} style={{ margin: 0, fontFamily: FONT }}>{line}</p>
            ))}
            {company.vatNumber?.trim() && (
              <p style={{ margin: '6px 0 0 0', fontFamily: FONT }}>
                VAT Reg #:&nbsp;<strong style={{ color: C_PRIMARY, fontWeight: 500 }}>{company.vatNumber}</strong>
              </p>
            )}
            {company.email?.trim() && (
              <p style={{ margin: '3px 0 0 0', fontFamily: FONT }}>{company.email}</p>
            )}
            {company.phone?.trim() && (
              <p style={{ margin: '2px 0 0 0', fontFamily: FONT }}>{company.phone}</p>
            )}
          </div>
        </div>

        {/* ── RIGHT: INVOICE title + meta ── */}
        <div style={{ flexShrink: 0, minWidth: '260px' }}>
          <h1
            style={{
              fontSize: '28px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '-0.5px',
              color: C_PRIMARY,
              margin: '0 0 14px 0',
              lineHeight: 1,
              fontFamily: FONT,
            }}
          >
            INVOICE
          </h1>

          <div style={{ fontSize: '14px', lineHeight: '1.7', color: C_PRIMARY, fontFamily: FONT }}>
            <p style={{ margin: 0 }}>
              <span style={{ color: C_SECONDARY }}>Invoice # </span>
              <strong style={{ fontWeight: 500 }}>{formatInvoiceNumber(invoice.number)}</strong>
            </p>
            <p style={{ margin: 0 }}>
              <span style={{ color: C_SECONDARY }}>Invoice Issued # </span>
              <strong style={{ fontWeight: 500 }}>{formatInvoiceDate(invoice.issueDate)}</strong>
            </p>
            <p style={{ margin: 0 }}>
              <span style={{ color: C_SECONDARY }}>Invoice Amount # </span>
              <strong style={{ fontWeight: 500 }}>{formatCurrency(invoice.total, invoice.currency)} ({invoice.currency})</strong>
            </p>
            {invoice.nextBillingDate && (
              <p style={{ margin: 0 }}>
                <span style={{ color: C_SECONDARY }}>Next Billing Date # </span>
                <strong style={{ fontWeight: 500 }}>{formatInvoiceDate(invoice.nextBillingDate)}</strong>
              </p>
            )}
            <p style={{ margin: 0 }}>
              <span style={{ color: C_SECONDARY }}>Order Nr. # </span>
              <strong style={{ fontWeight: 500 }}>{orderRef}</strong>
            </p>
          </div>

          <p
            style={{
              margin: '10px 0 0 0',
              fontSize: '14px',
              fontWeight: 700,
              textTransform: 'uppercase',
              color: status.color,
              letterSpacing: '0.05em',
              fontFamily: FONT,
            }}
          >
            {status.text}
          </p>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          BILLED TO
      ════════════════════════════════════════════════════════════ */}
      <div style={{ marginBottom: '28px' }}>
        <h3
          style={{
            fontSize: '12px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: C_PRIMARY,
            margin: '0 0 8px 0',
            paddingBottom: '6px',
            borderBottom: `1px solid ${C_BORDER}`,
            fontFamily: FONT,
          }}
        >
          BILLED TO
        </h3>
        <div style={{ fontSize: '14px', lineHeight: '1.6', color: '#444444', fontFamily: FONT }}>
          <p style={{ margin: 0, fontWeight: 400, color: C_PRIMARY }}>{client.name}</p>
          {clientLines.map((line) => (
            <p key={line} style={{ margin: 0 }}>{line}</p>
          ))}
          <p style={{ margin: 0 }}>{client.email}</p>
          {client.phone && <p style={{ margin: 0 }}>{client.phone}</p>}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          TABLE
      ════════════════════════════════════════════════════════════ */}
      <div style={{ marginBottom: '14px' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            tableLayout: 'fixed',
            fontSize: '14px',
            fontFamily: FONT,
          }}
        >
          <colgroup>
            <col style={{ width: '38%' }} />
            <col style={{ width: '13%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '17%' }} />
            <col style={{ width: '8%'  }} />
            <col style={{ width: '12%' }} />
          </colgroup>

          <thead>
            <tr style={{ backgroundColor: '#ffffff', borderBottom: `1px solid ${C_BORDER}` }}>
              {(
                [
                  ['DESCRIPTION',      'left'  ],
                  ['PRICE',            'right' ],
                  ['DISCOUNT',         'right' ],
                  ['TOTAL EXCL. VAT',  'right' ],
                  ['VAT',              'right' ],
                  [`AMOUNT (${invoice.currency})`, 'right'],
                ] as [string, 'left' | 'right'][]
              ).map(([label, align]) => (
                <th
                  key={label}
                  style={{
                    padding: '12px 10px',
                    fontSize: '12px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: C_PRIMARY,
                    textAlign: align,
                    whiteSpace: 'nowrap',
                    fontFamily: FONT,
                  }}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>{invoice.items.map(renderItem)}</tbody>
        </table>
      </div>

      {/* ════════════════════════════════════════════════════════════
          TOTALS  (right-aligned)
      ════════════════════════════════════════════════════════════ */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
        <div style={{ width: '320px', fontFamily: FONT }}>

          {/* Total excl. VAT */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '10px' }}>
            <span style={{ color: C_SECONDARY }}>Total excl. VAT</span>
            <span style={{ color: C_PRIMARY, fontWeight: 500 }}>
              {formatCurrency(invoice.subtotal - invoice.discountAmount, invoice.currency)}
            </span>
          </div>

          {/* VAT */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '10px' }}>
            <span style={{ color: C_SECONDARY }}>VAT @ {vatPct}%</span>
            <span style={{ color: C_PRIMARY, fontWeight: 500 }}>
              {formatCurrency(invoice.vatAmount, invoice.currency)}
            </span>
          </div>

          <div style={{ borderTop: `1px solid ${C_BORDER}`, margin: '10px 0' }} />

          {/* Total */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 700, color: C_PRIMARY, marginBottom: '10px' }}>
            <span>Total</span>
            <span>{formatCurrency(invoice.total, invoice.currency)}</span>
          </div>

          {/* Payments */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: C_SECONDARY, marginBottom: '10px' }}>
            <span>Payments</span>
            <span>{isPaid ? `(${formatCurrency(invoice.total, invoice.currency)})` : '—'}</span>
          </div>

          <div style={{ borderTop: `1px solid ${C_BORDER}`, margin: '10px 0' }} />

          {/* Amount Due */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 700, color: C_PRIMARY }}>
            <span>Amount Due ({invoice.currency})</span>
            <span>{formatCurrency(amountDue, invoice.currency)}</span>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          NOTES
      ════════════════════════════════════════════════════════════ */}
      {invoice.notes && (
        <div style={{ borderTop: `1px solid ${C_BORDER}`, marginTop: '24px', paddingTop: '14px' }}>
          <h4
            style={{
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              margin: '0 0 8px 0',
              color: C_PRIMARY,
              fontFamily: FONT,
            }}
          >
            Notes
          </h4>
          <p style={{ fontSize: '13px', color: '#555555', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0, fontFamily: FONT }}>
            {invoice.notes}
          </p>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          FOOTER
      ════════════════════════════════════════════════════════════ */}
      <div style={{ marginTop: '30px', paddingTop: '0' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            fontSize: '11px',
            lineHeight: '1.5',
            color: C_LIGHT,
            fontFamily: 'Arial, Helvetica, sans-serif',
            letterSpacing: '0.01em',
          }}
        >
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
