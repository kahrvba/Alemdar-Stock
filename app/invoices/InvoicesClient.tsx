"use client";

import Link from 'next/link';
import { useNavigationOverlay } from '@/components/navigation-overlay-provider';

interface Invoice {
  id: number;
  invoice_number: string;
  date_created: string;
  total_amount: number;
  status?: string;
}

export function InvoicesClient({ invoices }: { invoices: Invoice[] }) {
  const { showOverlay } = useNavigationOverlay();

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-4 py-8 text-foreground sm:px-6 sm:py-12 lg:py-16">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-2xl font-bold">Invoices</h1>
        {invoices.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No invoices found.</div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border/60">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-muted/60">
                  <th className="border-b border-border/60 p-2 text-left text-xs font-semibold sm:p-3 sm:text-sm">Invoice #</th>
                  <th className="border-b border-border/60 p-2 text-left text-xs font-semibold sm:p-3 sm:text-sm">Date</th>
                  <th className="border-b border-border/60 p-2 text-right text-xs font-semibold sm:p-3 sm:text-sm">Total</th>
                  <th className="border-b border-border/60 p-2 text-center text-xs font-semibold sm:p-3 sm:text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                    <td className="border-b border-border/60 p-2 text-xs sm:p-3 sm:text-sm">#{inv.id}</td>
                    <td className="border-b border-border/60 p-2 text-xs sm:p-3 sm:text-sm">
                      {new Date(inv.date_created).toLocaleString()}
                    </td>
                    <td className="border-b border-border/60 p-2 text-right text-xs font-medium sm:p-3 sm:text-sm">
                      ${inv.total_amount.toFixed(2)}
                    </td>
                    <td className="border-b border-border/60 p-2 text-center text-xs sm:p-3 sm:text-sm">
                      <Link
                        href={`/invoices/${inv.id}`}
                        onClick={(event) => {
                          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                          showOverlay();
                        }}
                        className="text-primary hover:underline font-medium"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
