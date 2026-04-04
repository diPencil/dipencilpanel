'use client';

import React from 'react';
import { Invoice, Client, Company } from '@/lib/types';
import { formatCurrency, formatInvoiceDate, formatInvoiceNumber } from '@/lib/formatting';

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

  const renderItem = (item: Invoice['items'][number]) => {
    const qty = item.quantity || 1;
    const price = item.price || 0;
    const discountValue = item.discount ? (price * qty) * (item.discount / 100) : 0;
    const exclVat = (price * qty) - discountValue;
    const vatValue = exclVat * ((item.vat || 0) / 100);
    const finalAmount = exclVat + vatValue;

    return (
      <tr key={item.id} className="border-b border-gray-100 group">
        <td className="py-5 pr-4 align-top">
          <div className="text-[14px] font-bold text-black mb-1 leading-tight">{item.description}</div>
          <div className="text-[11px] font-normal text-gray-500 leading-snug">
            {formatInvoiceDate(invoice.issueDate)} to{' '}
            {invoice.nextBillingDate ? formatInvoiceDate(invoice.nextBillingDate) : '—'}
          </div>
        </td>
        <td className="py-5 text-[13px] text-right align-middle text-gray-800 font-medium font-mono">
          {formatCurrency(price, invoice.currency)} x {qty}
        </td>
        <td className="py-5 text-[13px] text-right align-middle text-gray-800 font-medium whitespace-nowrap font-mono">
          {item.discount && item.discount > 0 ? `(${formatCurrency(discountValue, invoice.currency)})` : '-'}
        </td>
        <td className="py-5 text-[13px] text-right align-middle text-gray-800 font-medium font-mono">
          {formatCurrency(exclVat, invoice.currency)}
        </td>
        <td className="py-5 text-[13px] text-right align-middle text-gray-800 font-medium font-mono">
          {formatCurrency(vatValue, invoice.currency)}
        </td>
        <td className="py-5 text-[13px] text-right align-middle font-bold text-black font-mono">
          {formatCurrency(finalAmount, invoice.currency)}
        </td>
      </tr>
    );
  };

  return (
    <div
      id="invoice-content"
      className="bg-white text-black mx-auto shadow-sm font-sans box-border w-[210mm] min-h-[297mm] p-[16mm] max-w-full"
    >
      {/* Top: seller (left) + INVOICE meta (right) — Hostinger layout */}
      <div className="flex justify-between items-start mb-12">
        <div className="flex flex-col gap-4 max-w-[55%]">
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
          <div className="text-[13px] leading-relaxed text-gray-800">
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

        <div className="text-left shrink-0 pl-4 pr-[160px]">
          <h1 className="text-[32px] font-bold tracking-tight uppercase leading-none mb-4 text-black">INVOICE</h1>
          <div className="space-y-1 text-[13px]">
            <p>
              <span className="text-gray-500">Invoice #</span>{' '}
              <span className="font-bold text-gray-900">{formatInvoiceNumber(invoice.number)}</span>
            </p>
            <p>
              <span className="text-gray-500">Invoice Issued #</span>{' '}
              <span className="font-bold text-gray-900">{formatInvoiceDate(invoice.issueDate)}</span>
            </p>
            <p>
              <span className="text-gray-500">Invoice Amount #</span>{' '}
              <span className="font-bold font-mono text-gray-900">
                {formatCurrency(invoice.total, invoice.currency)} ({invoice.currency})
              </span>
            </p>
            {invoice.nextBillingDate && (
              <p>
                <span className="text-gray-500">Next Billing Date #</span>{' '}
                <span className="font-bold text-gray-900">{formatInvoiceDate(invoice.nextBillingDate)}</span>
              </p>
            )}
            <p>
              <span className="text-gray-500">Order Nr. #</span>{' '}
              <span className="font-bold font-mono text-gray-900">{orderRef}</span>
            </p>
            <p className={`font-bold mt-3 uppercase text-[15px] tracking-wide ${status.className}`}>
              {status.text}
            </p>
          </div>
        </div>
      </div>

      {/* BILLED TO */}
      <div className="mb-12">
        <h3 className="text-[14px] font-bold uppercase mb-2 tracking-tight">BILLED TO</h3>
        <div className="text-[13px] text-gray-800 leading-relaxed">
          <p className="font-medium text-gray-900">{client.name}</p>
          {clientLines.length > 0 ? (
            clientLines.map((line) => <p key={line}>{line}</p>)
          ) : null}
          <p>{client.email}</p>
          {client.phone ? <p>{client.phone}</p> : null}
        </div>
      </div>

      {/* Line items */}
      <div className="mb-8">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="py-2 text-[10px] font-bold uppercase tracking-[0.05em] text-black">DESCRIPTION</th>
              <th className="py-2 text-[10px] font-bold uppercase tracking-[0.05em] text-black text-right">PRICE</th>
              <th className="py-2 text-[10px] font-bold uppercase tracking-[0.05em] text-black text-right">DISCOUNT</th>
              <th className="py-2 text-[10px] font-bold uppercase tracking-[0.05em] text-black text-right">TOTAL EXCL. VAT</th>
              <th className="py-2 text-[10px] font-bold uppercase tracking-[0.05em] text-black text-right">VAT</th>
              <th className="py-3 text-[10px] font-bold uppercase tracking-[0.05em] text-black text-right">
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
      <div className="flex justify-end pt-4">
        <div className="w-[320px] space-y-2">
          <div className="flex justify-between text-[13px]">
            <span className="text-gray-700 font-medium">Total excl. VAT</span>
            <span className="text-black font-semibold font-mono">
              {formatCurrency(invoice.subtotal - invoice.discountAmount, invoice.currency)}
            </span>
          </div>
          <div className="flex justify-between text-[13px]">
            <span className="text-gray-700 font-medium">VAT @ {vatPct}%</span>
            <span className="text-black font-semibold font-mono">
              {formatCurrency(invoice.vatAmount, invoice.currency)}
            </span>
          </div>

          <div className="pt-2 border-t border-gray-100 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-[14px] font-bold uppercase">Total</span>
              <span className="text-[14px] font-bold font-mono">
                {formatCurrency(invoice.total, invoice.currency)}
              </span>
            </div>
            <div className="flex justify-between items-center text-gray-500 italic">
              <span className="text-[13px]">Payments</span>
              <span className="text-[13px] font-mono">
                {isPaid ? `(${formatCurrency(invoice.total, invoice.currency)})` : '-'}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-gray-100">
            <div className="flex justify-between items-center">
              <span className="text-[14px] font-bold uppercase">
                Amount Due ({invoice.currency})
              </span>
              <span className="text-[14px] font-bold font-mono">
                {formatCurrency(amountDue, invoice.currency)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {invoice.notes && (
        <div className="border-t border-gray-300 pt-6 mt-8">
          <h4 className="text-sm font-semibold mb-2">Notes:</h4>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{invoice.notes}</p>
        </div>
      )}

      <div className="mt-24 pt-10 pb-2 text-gray-500">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 max-w-4xl mx-auto items-start">
          <div className="flex flex-col gap-1 text-left [&_p]:m-0">
            <p className="text-[11px] leading-tight text-gray-600">
              Thank you for your business! <span className="mx-1 text-gray-400">|</span>{' '}
              {company.name?.trim() || 'Company'}
            </p>
            <p className="text-[10px] leading-snug text-gray-500">
              If you would like assistance with renewal or have any questions, please contact our exclusive service agent:
            </p>
          </div>
          <div className="flex flex-col gap-0.5 text-left text-[10px] leading-tight border-t border-gray-200 pt-4 md:border-t-0 md:border-l md:border-gray-200 md:pl-8 md:pt-0 [&_p]:m-0">
            <p className="font-medium text-gray-600">
              Engineer Mahmoud El-Sabbagh — Technical Agent, diPencil
            </p>
            <p>Phone: +201003778273</p>
            <p>
              Email:{' '}
              <a
                href="mailto:elsabbagh@dipencil.com"
                className="text-gray-600 underline underline-offset-1 hover:text-gray-900"
              >
                elsabbagh@dipencil.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
