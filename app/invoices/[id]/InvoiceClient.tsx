'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Activity } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigationOverlay } from '@/components/navigation-overlay-provider';
import InvoiceTemplate from '@/components/InvoiceTemplate';

interface InvoiceProduct {
  name: string;
  barcode: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface InvoiceData {
  invoiceNumber: string;
  date: string;
  products: InvoiceProduct[];
  subtotal: number;
  total: number;
}

export default function InvoiceClient({ id }: { id: string }) {
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { showOverlay } = useNavigationOverlay();

  useEffect(() => {
    if (!id) return;
    fetch(`/api/invoices/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Invoice not found');
        return res.json();
      })
      .then(setInvoice)
      .catch(err => setError(err.message));
  }, [id]);

  if (error) {
    return (
      <div className="max-w-xl mx-auto mt-20 text-center text-red-600">
        <h2 className="text-2xl font-bold mb-2">Invoice Not Found</h2>
        <p>Sorry, we couldn&apos;t find the invoice you are looking for.</p>
      </div>
    );
  }

  return (
    <>
      <Activity mode={!invoice ? "visible" : "hidden"}>
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/95 pointer-events-auto animate-slide-up">
          <div className="flex flex-col items-center gap-4 text-muted-foreground">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-muted/40 border-t-primary" />
            <span className="text-xs uppercase tracking-[0.35em]">Loading</span>
          </div>
        </div>
      </Activity>
      {invoice && (
        <div className="py-10">
          <div className="max-w-xl mx-auto mb-6">
            <Link
              href="/invoices"
              onClick={(event) => {
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                showOverlay();
              }}
              className="cursor-pointer"
            >
              <Button variant="outline" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Invoices
              </Button>
            </Link>
          </div>
          <InvoiceTemplate
            invoiceNumber={invoice.invoiceNumber}
            date={invoice.date}
            products={invoice.products}
            subtotal={invoice.subtotal}
            total={invoice.total}
          />
        </div>
      )}
    </>
  );
}

