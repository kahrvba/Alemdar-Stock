import { fetchInvoices } from '@/lib/services/invoices';
import { InvoicesClient } from './InvoicesClient';

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function InvoicesPage() {
  const invoices = await fetchInvoices();

  return <InvoicesClient invoices={invoices} />;
}
