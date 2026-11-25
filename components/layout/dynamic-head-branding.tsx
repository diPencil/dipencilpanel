'use client';

import { useEffect } from 'react';
import { useInvoiceData } from '@/context/InvoiceContext';

export function DynamicHeadBranding() {
  const { company } = useInvoiceData();

  useEffect(() => {
    if (typeof document === 'undefined') return;

    if (company.projectName) {
      document.title = `${company.projectName} · Hosting & System Provider`;
    }

    if (company.favicon) {
      let iconLink = document.querySelector<HTMLLinkElement>("link[rel*='icon']");
      if (!iconLink) {
        iconLink = document.createElement('link');
        iconLink.rel = 'shortcut icon';
        document.head.appendChild(iconLink);
      }
      iconLink.href = company.favicon;
    }
  }, [company.projectName, company.favicon]);

  return null;
}

