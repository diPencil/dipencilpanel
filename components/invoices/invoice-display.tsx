'use client';

import React from 'react';
import { Noto_Sans_SC } from 'next/font/google';
import { Invoice, Client, Company } from '@/lib/types';
import { formatCurrency, formatInvoiceDate, formatInvoiceNumber } from '@/lib/formatting';

const invoiceFont = Noto_Sans_SC({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
});

interface InvoiceDisplayProps {
  invoice: Invoice;
  client: Client;
  company: Company;
}

function splitAddressLines(address: string | undefined): string[] {
  if (!address?.trim()) return [];
  
  // Specific fix for the requested Cyprus address if it comes in as one line
  if (address.includes('61 Lordou Vironos Street') && address.includes('Cyprus') && !address.includes('\n') && !address.includes(',')) {
    return ['61 Lordou Vironos Street', 'Larnaca 6023', 'Cyprus'];
  }

  const byNl = address.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  if (byNl.length > 1) return byNl;
  return address.split(',').map((s) => s.trim()).filter(Boolean);
}

function hostingerOrderRef(invoice: Invoice): string {
  // Create a pseudo-random numeric ID from the invoice ID for a distinct Order Nr
  const charSum = invoice.id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const orderNum = (charSum * 179 + 10000001).toString().slice(-8);
  return `hb_${orderNum}`;
}

function invoiceVatPercent(invoice: Invoice, companyTax: number): number {
  const net = invoice.subtotal - invoice.discountAmount;
  if (net > 0 && invoice.vatAmount > 0) {
    return Math.round((invoice.vatAmount / net) * 1000) / 10;
  }
  const first = invoice.items[0]?.vat;
  if (typeof first === 'number' && first > 0) return first;
  return companyTax;
}

function paymentStatusLabel(invoice: Invoice): { text: string; className: string } {
  if (invoice.paymentStatus === 'paid' || invoice.status === 'paid') {
    return { text: 'PAID', className: 'text-[#39a85a]' };
  }
  if (invoice.status === 'overdue') {
    return { text: 'OVERDUE', className: 'text-red-600' };
  }
  return { text: 'UNPAID', className: 'text-amber-600' };
}

export function InvoiceDisplay({ invoice, client, company }: InvoiceDisplayProps) {
  const companyLogo = company.invoiceLogo && company.invoiceLogo !== '/logo.png'
    ? company.invoiceLogo
    : (company.logo && company.logo !== '/logo.png' ? company.logo : '/pencil-logo.png');

  const companyLines = splitAddressLines(company.address);
  const defaultSellerLines = ['61 Lordou Vironos Street', 'Larnaca 6023', 'Cyprus'];
  const sellerAddressLines = companyLines.length > 0 ? companyLines : defaultSellerLines;

  const clientLines = splitAddressLines(client.address);
  const vatPct = invoiceVatPercent(invoice, company.taxRate ?? 0);
  const status = paymentStatusLabel(invoice);
  const isPaid = invoice.paymentStatus === 'paid' || invoice.status === 'paid';
  const amountDue = isPaid ? 0 : invoice.total;
  const orderRef = hostingerOrderRef(invoice);
  const generatedOn = new Date(invoice.createdAt).toLocaleString('en-US');

  const renderItem = (item: Invoice['items'][number]) => {
    const qty = item.quantity || 1;
    const price = item.price || 0;
    const discountValue = item.discount ? (price * qty) * (item.discount / 100) : 0;
    const exclVat = (price * qty) - discountValue;
    const vatValue = exclVat * ((item.vat || 0) / 100);
    const finalAmount = exclVat + vatValue;

    return (
      <tr key={item.id} className="border-b border-gray-100 group">
        <td className="py-4 pr-4 align-top">
          <div className="text-[13px] font-bold text-black mb-0.5 leading-tight">{item.description}</div>
          <div className="text-[10px] font-normal text-gray-500 leading-snug">
            {formatInvoiceDate(invoice.issueDate)} to{' '}
            {invoice.nextBillingDate ? formatInvoiceDate(invoice.nextBillingDate) : '—'}
          </div>
        </td>
        <td className="py-4 text-[11px] text-right align-middle text-gray-800 font-medium font-mono whitespace-nowrap tabular-nums">
          {formatCurrency(price, invoice.currency)} x {qty}
        </td>
        <td className="py-4 text-[11px] text-right align-middle text-gray-800 font-medium whitespace-nowrap font-mono tabular-nums">
          {item.discount && item.discount > 0 ? `(${formatCurrency(discountValue, invoice.currency)})` : '-'}
        </td>
        <td className="py-4 text-[11px] text-right align-middle text-gray-800 font-medium font-mono whitespace-nowrap tabular-nums">
          {formatCurrency(exclVat, invoice.currency)}
        </td>
        <td className="py-4 text-[11px] text-right align-middle text-gray-800 font-medium font-mono whitespace-nowrap tabular-nums">
          {formatCurrency(vatValue, invoice.currency)}
        </td>
        <td className="py-4 text-[11px] text-right align-middle font-bold text-black font-mono whitespace-nowrap tabular-nums">
          {formatCurrency(finalAmount, invoice.currency)}
        </td>
      </tr>
    );
  };

  return (
    <div
      id="invoice-content"
      className={`${invoiceFont.className} bg-white text-black mx-auto shadow-none box-border w-[794px] min-h-[1123px] max-w-none text-[12px] leading-[1.28] overflow-hidden px-5 pt-[13px] pb-8 flex flex-col`}
      style={{ fontFamily: '"Noto Sans SC", Arial, Helvetica, sans-serif', letterSpacing: '0', wordSpacing: 'normal' }}
    >
      {/* Top: seller (left) + INVOICE meta (right) */}
      <div className="flex justify-between items-start gap-8 mb-6">
        <div className="flex flex-col gap-2.5 min-w-0 max-w-[48%]">
          <div className="flex items-center gap-2">
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
          <div className="text-[12px] leading-relaxed text-gray-800">
            <p className="font-medium text-gray-900">{company.name?.trim() || 'Company'}</p>
            {sellerAddressLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
            {company.vatNumber?.trim() ? (
              <p className="mt-1">
                VAT Reg #:{' '}
                <span className="font-medium uppercase">{company.vatNumber}</span>
              </p>
            ) : null}
            {company.email?.trim() ? <p className="mt-1">{company.email}</p> : null}
            {company.phone?.trim() ? <p>{company.phone}</p> : null}
          </div>
        </div>

        <div className="text-left shrink-0 min-w-[240px]">
          <h1 className="text-[28px] font-bold tracking-tight uppercase leading-none mb-2.5 text-black">INVOICE</h1>
          <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-[12px] items-baseline">
            <span className="text-gray-500">Invoice #</span>
            <span className="font-bold text-gray-900 whitespace-nowrap">{formatInvoiceNumber(invoice.number)}</span>
            <span className="text-gray-500">Invoice Issued #</span>
            <span className="font-bold text-gray-900 whitespace-nowrap">{formatInvoiceDate(invoice.issueDate)}</span>
            <span className="text-gray-500">Invoice Amount #</span>
            <span className="font-bold font-mono text-gray-900 whitespace-nowrap tabular-nums">
              {formatCurrency(invoice.total, invoice.currency)} ({invoice.currency})
            </span>
            {invoice.nextBillingDate ? (
              <>
                <span className="text-gray-500">Next Billing Date #</span>
                <span className="font-bold text-gray-900 whitespace-nowrap">{formatInvoiceDate(invoice.nextBillingDate)}</span>
              </>
            ) : null}
            <span className="text-gray-500">Order Nr. #</span>
            <span className="font-bold font-mono text-gray-900 whitespace-nowrap tabular-nums">{orderRef}</span>
          </div>
          <p className={`font-bold mt-2.5 uppercase text-[14px] tracking-wide ${status.className}`}>
            {status.text}
          </p>
        </div>
      </div>

      <div className="flex flex-col flex-1 min-h-0">
        {/* BILLED TO */}
        <div className="mb-7">
          <h3 className="text-[13px] font-bold uppercase mb-1.5 tracking-tight">BILLED TO</h3>
          <div className="text-[12px] text-gray-800 leading-relaxed">
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
              <col className="w-[38%]" />
              <col className="w-[12%]" />
              <col className="w-[12%]" />
              <col className="w-[15%]" />
              <col className="w-[11%]" />
              <col className="w-[12%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-gray-200">
                <th className="py-2 text-[9px] font-bold uppercase tracking-[0.05em] text-black">DESCRIPTION</th>
                <th className="py-2 text-[9px] font-bold uppercase tracking-[0.05em] text-black text-right whitespace-nowrap">PRICE</th>
                <th className="py-2 text-[9px] font-bold uppercase tracking-[0.05em] text-black text-right whitespace-nowrap">DISCOUNT</th>
                <th className="py-2 text-[9px] font-bold uppercase tracking-[0.05em] text-black text-right whitespace-nowrap">TOTAL EXCL. VAT</th>
                <th className="py-2 text-[9px] font-bold uppercase tracking-[0.05em] text-black text-right whitespace-nowrap">VAT</th>
                <th className="py-2 text-[9px] font-bold uppercase tracking-[0.05em] text-black text-right whitespace-nowrap">
                  AMOUNT ({invoice.currency})
                </th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item) => renderItem(item))}
            </tbody>
          </table>
        </div>

        {/* Summary — right column like Hostinger */}
        <div className="flex justify-end pt-2">
          <div className="w-[300px] space-y-1.5">
            <div className="flex justify-between text-[12px]">
              <span className="text-gray-700 font-medium">Total excl. VAT</span>
              <span className="text-black font-semibold font-mono whitespace-nowrap tabular-nums">
                {formatCurrency(invoice.subtotal - invoice.discountAmount, invoice.currency)}
              </span>
            </div>
            <div className="flex justify-between text-[12px]">
              <span className="text-gray-700 font-medium">VAT @ {vatPct}%</span>
              <span className="text-black font-semibold font-mono whitespace-nowrap tabular-nums">
                {formatCurrency(invoice.vatAmount, invoice.currency)}
              </span>
            </div>

            <div className="pt-2 border-t border-gray-100 flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[13px] font-bold uppercase">Total</span>
                <span className="text-[13px] font-bold font-mono whitespace-nowrap tabular-nums">
                  {formatCurrency(invoice.total, invoice.currency)}
                </span>
              </div>
              <div className="flex justify-between items-center text-gray-500 italic">
                <span className="text-[12px]">Payments</span>
                <span className="text-[12px] font-mono whitespace-nowrap tabular-nums">
                  {isPaid ? `(${formatCurrency(invoice.total, invoice.currency)})` : '-'}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100">
              <div className="flex justify-between items-center">
                <span className="text-[13px] font-bold uppercase">
                  Amount Due ({invoice.currency})
                </span>
                <span className="text-[13px] font-bold font-mono whitespace-nowrap tabular-nums">
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

        <div className="mt-auto pt-5 pb-1 text-gray-500 opacity-70">
          <div className="border-t border-gray-200 pt-3 grid grid-cols-[1fr_auto] gap-6 items-end text-[11px] leading-tight">
            <div className="min-w-0">
              <p className="m-0 max-w-[360px]">
                This is a non-binding quotation valid until the expiration date.
              </p>
              <p className="m-0 mt-1 max-w-[360px]">
                Need help with renewal or billing? Contact our service agent below.
              </p>
            </div>
            <div className="text-right whitespace-nowrap">
              <p className="m-0">{company.name?.trim() || 'diPencil'}</p>
              <p className="m-0 mt-1">Generated on {generatedOn}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
