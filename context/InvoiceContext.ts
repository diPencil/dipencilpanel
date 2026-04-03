import { useContext } from 'react';
import { InvoiceContext, InvoiceProvider } from './InvoiceContext.tsx';

export { InvoiceProvider };

export function useInvoiceData() {
	const context = useContext(InvoiceContext);
	if (context === undefined) {
		throw new Error('useInvoiceData must be used within an InvoiceProvider');
	}
	return context;
}
