import Link from 'next/link';
import { fetchInvoices } from '@/lib/services/invoices';
import { InvoicesClient } from './InvoicesClient';

export default async function InvoicesPage() {
  const invoices = await fetchInvoices();

  return <InvoicesClient invoices={invoices} />;
}

