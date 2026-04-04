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
                fontWeight: i === 0 ? 700 : 400,
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
          <div style={{ marginBottom: '16px' }}>
            <img
              src={companyLogo}
              alt={company.name}
              style={{ height: '36px', maxWidth: '160px', objectFit: 'contain', display: 'block' }}
            />
          </div>

          {/* Seller address */}
          <div style={{ fontSize: '14px', lineHeight: '1.6', color: '#444444' }}>
            <p style={{ margin: '0 0 2px 0', fontWeight: 700, color: C_PRIMARY, fontFamily: FONT }}>
              {company.name?.trim() || 'Company'}
            </p>
            {sellerLines.map((line) => (
              <p key={line} style={{ margin: 0, fontFamily: FONT }}>{line}</p>
            ))}
            {company.vatNumber?.trim() && (
              <p style={{ margin: '6px 0 0 0', fontFamily: FONT }}>
                VAT Reg #:&nbsp;<strong style={{ color: C_PRIMARY }}>{company.vatNumber}</strong>
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

          <div style={{ fontSize: '14px', lineHeight: '1.8', color: C_PRIMARY, fontFamily: FONT }}>
            <p style={{ margin: 0 }}>
              <span style={{ color: C_SECONDARY }}>Invoice # </span>
              <strong>{formatInvoiceNumber(invoice.number)}</strong>
            </p>
            <p style={{ margin: 0 }}>
              <span style={{ color: C_SECONDARY }}>Invoice Issued # </span>
              <strong>{formatInvoiceDate(invoice.issueDate)}</strong>
            </p>
            <p style={{ margin: 0 }}>
              <span style={{ color: C_SECONDARY }}>Invoice Amount # </span>
              <strong>{formatCurrency(invoice.total, invoice.currency)} ({invoice.currency})</strong>
            </p>
            {invoice.nextBillingDate && (
              <p style={{ margin: 0 }}>
                <span style={{ color: C_SECONDARY }}>Next Billing Date # </span>
                <strong>{formatInvoiceDate(invoice.nextBillingDate)}</strong>
              </p>
            )}
            <p style={{ margin: 0 }}>
              <span style={{ color: C_SECONDARY }}>Order Nr. # </span>
              <strong>{orderRef}</strong>
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
          <p style={{ margin: 0, fontWeight: 600, color: C_PRIMARY }}>{client.name}</p>
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
      <div style={{ flex: 1 }}>
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
            <tr style={{ backgroundColor: C_TH_BG, borderBottom: `1px solid ${C_BORDER}` }}>
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
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '30px' }}>
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
      <div style={{ marginTop: 'auto', paddingTop: '20px' }}>
        <div
          style={{
            borderTop: `1px solid ${C_BORDER}`,
            paddingTop: '10px',
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


    return (
      <tr key={item.id} className="border-b border-gray-100 group">
        <td className="py-5 pr-4 align-top">
          {(item.description || '').split('\n').map((line, i) => (
            <div
              key={i}
              className={`leading-snug ${
                i === 0
                  ? 'text-[11px] font-bold text-black'
                  : 'text-[11px] font-normal text-gray-800 mt-0.5'
              }`}
            >
              {line}
            </div>
          ))}
          <div className="text-[9px] font-normal text-gray-500 leading-snug mt-1">
            {formatInvoiceDate(invoice.issueDate)} to{' '}
            {invoice.nextBillingDate ? formatInvoiceDate(invoice.nextBillingDate) : '—'}
          </div>
        </td>
        <td className={numericCellClass}>
          <span className="inline-flex items-center justify-end gap-1 whitespace-nowrap">
            <span>{formatCurrency(price, invoice.currency)}</span>
            <span>x</span>
            <span>{qty}</span>
          </span>
        </td>
        <td className={numericCellClass}>
          {item.discount && item.discount > 0 ? `(${formatCurrency(discountValue, invoice.currency)})` : '-'}
        </td>
        <td className={numericCellClass}>
          {formatCurrency(exclVat, invoice.currency)}
        </td>
        <td className={numericCellClass}>
          {formatCurrency(vatValue, invoice.currency)}
        </td>
        <td className="py-5 text-[11px] text-right align-middle font-bold text-black whitespace-nowrap tabular-nums [font-family:Arial,Helvetica,sans-serif]">
          {formatCurrency(finalAmount, invoice.currency)}
        </td>
      </tr>
    );
  };

  return (
    <div
      id="invoice-content"
      className="bg-white text-black mx-auto shadow-none box-border w-[794px] min-h-[1123px] max-w-none text-[11px] leading-[1.4] overflow-hidden px-10 pt-10 pb-8 flex flex-col"
      style={{ fontFamily: 'Arial, Helvetica, sans-serif', letterSpacing: '0', wordSpacing: 'normal' }}
    >
      {/* Top: seller left + invoice block right */}
      <div className="mb-6">
        <div className="flex justify-between items-start gap-8">
          <div className="flex flex-col gap-2.5 min-w-0 max-w-[48%]">
            <div className="flex items-start">
              {companyLogo ? (
                <img
                  src={companyLogo}
                  alt={company.name}
                  className="h-8 max-w-[150px] object-contain"
                />
              ) : (
                <div className="w-8 h-8 bg-black rounded-sm flex items-center justify-center">
                  <span className="text-white font-bold text-xl">
                    {company.name?.charAt(0).toUpperCase() || 'P'}
                  </span>
                </div>
              )}
            </div>

            <div className="text-[11px] leading-relaxed text-gray-800">
              <p className="font-medium text-gray-900">{company.name?.trim() || 'Company'}</p>
              {sellerAddressLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
              {company.vatNumber?.trim() ? (
                <p className="mt-1">
                  VAT Reg #:{' '}
                  <span className="font-bold uppercase">{company.vatNumber}</span>
                </p>
              ) : null}
              {company.email?.trim() ? <p className="mt-1">{company.email}</p> : null}
              {company.phone?.trim() ? <p>{company.phone}</p> : null}
            </div>
          </div>

          <div className="text-left shrink-0 min-w-[240px]">
            <h1 className="text-[32px] font-bold tracking-tight uppercase leading-none mb-3 text-black">INVOICE</h1>
            <div className="flex flex-col gap-y-0.5 text-[11px]">
              <p className="m-0">
                <span className="text-gray-500">Invoice # </span>
                <span className="font-bold text-gray-900">{formatInvoiceNumber(invoice.number)}</span>
              </p>
              <p className="m-0">
                <span className="text-gray-500">Invoice Issued # </span>
                <span className="font-bold text-gray-900">{formatInvoiceDate(invoice.issueDate)}</span>
              </p>
              <p className="m-0">
                <span className="text-gray-500">Invoice Amount # </span>
                <span className="font-bold text-gray-900 tabular-nums">
                  {formatCurrency(invoice.total, invoice.currency)} ({invoice.currency})
                </span>
              </p>
              {invoice.nextBillingDate ? (
                <p className="m-0">
                  <span className="text-gray-500">Next Billing Date # </span>
                  <span className="font-bold text-gray-900">{formatInvoiceDate(invoice.nextBillingDate)}</span>
                </p>
              ) : null}
              <p className="m-0">
                <span className="text-gray-500">Order Nr. # </span>
                <span className="font-bold text-gray-900 tabular-nums">{orderRef}</span>
              </p>
            </div>
            <p className={`font-bold mt-2 uppercase text-[13px] tracking-wide ${status.className}`}>
              {status.text}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col flex-1 min-h-0">
        {/* BILLED TO */}
        <div className="mb-7">
          <h3 className="text-[11px] font-bold uppercase pb-1 mb-1.5 tracking-tight border-b border-gray-300">BILLED TO</h3>
          <div className="text-[11px] text-gray-800 leading-relaxed">
            <p className="font-medium text-gray-900">{client.name}</p>
            {clientLines.length > 0 ? (
              clientLines.map((line) => <p key={line}>{line}</p>)
            ) : null}
            <p>{client.email}</p>
            {client.phone ? <p>{client.phone}</p> : null}
          </div>
        </div>

        {/* Line items */}
        <div className="mb-6">
          <table className="w-full text-left border-collapse table-fixed">
            <colgroup>
              <col className="w-[40%]" />
              <col className="w-[13%]" />
              <col className="w-[12%]" />
              <col className="w-[15%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-gray-300">
                <th className="py-2.5 text-[8px] font-bold uppercase tracking-[0.06em] text-black">DESCRIPTION</th>
                <th className="py-2.5 text-[8px] font-bold uppercase tracking-[0.06em] text-black text-right whitespace-nowrap">PRICE</th>
                <th className="py-2.5 text-[8px] font-bold uppercase tracking-[0.06em] text-black text-right whitespace-nowrap">DISCOUNT</th>
                <th className="py-2.5 text-[8px] font-bold uppercase tracking-[0.06em] text-black text-right whitespace-nowrap">TOTAL EXCL. VAT</th>
                <th className="py-2.5 text-[8px] font-bold uppercase tracking-[0.06em] text-black text-right whitespace-nowrap">VAT</th>
                <th className="py-2.5 text-[8px] font-bold uppercase tracking-[0.06em] text-black text-right whitespace-nowrap">
                  AMOUNT ({invoice.currency})
                </th>
              </tr>
            </thead>
            <tbody className="[&>tr:last-child]:border-b-0">
              {invoice.items.map((item) => renderItem(item))}
            </tbody>
          </table>
        </div>

        {/* Summary — right column like Hostinger */}
        <div className="flex justify-end pt-2">
          <div className="w-[300px] space-y-1.5">
            <div className="flex justify-between text-[11px]">
              <span className="text-gray-700 font-medium">Total excl. VAT</span>
              <span className="text-black font-medium font-mono whitespace-nowrap tabular-nums text-[11px]">
                {formatCurrency(invoice.subtotal - invoice.discountAmount, invoice.currency)}
              </span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-gray-700 font-medium">VAT @ {vatPct}%</span>
              <span className="text-black font-medium font-mono whitespace-nowrap tabular-nums text-[11px]">
                {formatCurrency(invoice.vatAmount, invoice.currency)}
              </span>
            </div>

            <div className="pt-2 border-t border-gray-100 flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[12px] font-bold uppercase">Total</span>
                <span className="text-[12px] font-semibold font-mono whitespace-nowrap tabular-nums">
                  {formatCurrency(invoice.total, invoice.currency)}
                </span>
              </div>
              <div className="flex justify-between items-center text-gray-500 italic">
                <span className="text-[11px]">Payments</span>
                <span className="text-[11px] font-mono whitespace-nowrap tabular-nums">
                  {isPaid ? `(${formatCurrency(invoice.total, invoice.currency)})` : '-'}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100">
              <div className="flex justify-between items-center">
                <span className="text-[12px] font-bold uppercase">
                  Amount Due ({invoice.currency})
                </span>
                <span className="text-[12px] font-bold font-mono whitespace-nowrap tabular-nums">
                  {formatCurrency(amountDue, invoice.currency)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {invoice.notes && (
          <div className="border-t border-gray-300 pt-4 mt-5">
            <h4 className="text-[12px] font-semibold mb-1.5">Notes:</h4>
            <p className="text-[11px] text-gray-700 whitespace-pre-wrap leading-relaxed">{invoice.notes}</p>
          </div>
        )}

        <div className="mt-auto pt-4 pb-1 text-gray-500 opacity-70">
          <div
            className="border-t border-gray-200 pt-2.5 grid grid-cols-[1fr_auto] gap-5 items-end text-[9px] leading-[1.35]"
            style={{
              fontFamily: 'Arial, Helvetica, sans-serif',
              letterSpacing: '0.01em',
              wordSpacing: '0.08em',
              fontVariantLigatures: 'none',
            }}
          >
            <div className="min-w-0">
              <p className="m-0 max-w-[360px] whitespace-normal break-normal">
                Hostinger International Ltd.
              </p>
              <p className="m-0 mt-0.5 max-w-[360px] whitespace-normal break-normal">
                If you would like assistance with renewal or have any questions, please contact our exclusive service middle east agent.
              </p>
            </div>
            <div className="text-right whitespace-nowrap">
              <p className="m-0 mt-0.5">Engineer Mahmoud El-Sabbagh</p>
              <p className="m-0 mt-0.5">Technical Agent Provider in the Middle East @Pencil Studio.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
