import InvoiceClient from './InvoiceClient';

export default async function InvoiceViewPage(props: any) {
  const { params } = props as { params: Promise<{ id: string }> };
  const resolvedParams = await params;
  return <InvoiceClient id={resolvedParams.id} />;
}

