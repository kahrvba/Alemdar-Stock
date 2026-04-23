"use client";

import Link from "next/link";
import { useState } from "react";
import { useNavigationOverlay } from "@/components/navigation-overlay-provider";
import { useToast } from "@/components/ui/toast";

interface Invoice {
  id: number;
  invoice_number: string;
  date_created: string;
  total_amount: number;
  status?: string;
  undone_at?: string | null;
  undoable?: boolean;
}

export function InvoicesClient({ invoices }: { invoices: Invoice[] }) {
  const { showOverlay } = useNavigationOverlay();
  const { showToast } = useToast();
  const [invoiceRows, setInvoiceRows] = useState<Invoice[]>(invoices);
  const [undoingId, setUndoingId] = useState<number | null>(null);

  const handleUndo = async (invoice: Invoice) => {
    if (undoingId !== null) return;

    setUndoingId(invoice.id);
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/undo`, { method: "POST" });
      const data = (await response.json().catch(() => null)) as
        | { success?: boolean; error?: string; status?: string; undoneAt?: string | null }
        | null;

      if (!response.ok || !data?.success) {
        throw new Error(data?.error ?? "Failed to undo invoice");
      }

      setInvoiceRows((current) =>
        current.map((row) =>
          row.id === invoice.id
            ? {
                ...row,
                status: data.status ?? "canceled",
                undone_at: data.undoneAt ?? new Date().toISOString(),
                undoable: false,
              }
            : row
        )
      );

      showToast("Invoice undone", "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to undo invoice";
      showToast(message, "error");
    } finally {
      setUndoingId(null);
    }
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-4 py-8 text-foreground sm:px-6 sm:py-12 lg:py-16">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-2xl font-bold">Invoices</h1>
        {invoiceRows.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">No invoices found.</div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border/60">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-muted/60">
                  <th className="border-b border-border/60 p-2 text-left text-xs font-semibold sm:p-3 sm:text-sm">Invoice #</th>
                  <th className="border-b border-border/60 p-2 text-left text-xs font-semibold sm:p-3 sm:text-sm">Date</th>
                  <th className="border-b border-border/60 p-2 text-right text-xs font-semibold sm:p-3 sm:text-sm">Total</th>
                  <th className="border-b border-border/60 p-2 text-center text-xs font-semibold sm:p-3 sm:text-sm">Status</th>
                  <th className="border-b border-border/60 p-2 text-center text-xs font-semibold sm:p-3 sm:text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoiceRows.map((inv) => {
                  const isCanceled = inv.status === "canceled";
                  const canUndo = !isCanceled && inv.undoable;
                  const isUndoing = undoingId === inv.id;

                  return (
                    <tr key={inv.id} className="transition-colors hover:bg-muted/30">
                      <td className="border-b border-border/60 p-2 text-xs sm:p-3 sm:text-sm">#{inv.id}</td>
                      <td className="border-b border-border/60 p-2 text-xs sm:p-3 sm:text-sm">
                        {new Date(inv.date_created).toLocaleString()}
                      </td>
                      <td className="border-b border-border/60 p-2 text-right text-xs font-medium sm:p-3 sm:text-sm">
                        ${inv.total_amount.toFixed(2)}
                      </td>
                      <td className="border-b border-border/60 p-2 text-center text-xs sm:p-3 sm:text-sm">
                        {isCanceled ? (
                          <span className="inline-flex rounded-full bg-red-500/10 px-2 py-1 text-[11px] font-semibold text-red-700">
                            Undone
                          </span>
                        ) : canUndo ? (
                          <span className="inline-flex rounded-full bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                            Completed
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-amber-500/10 px-2 py-1 text-[11px] font-semibold text-amber-700">
                            Legacy invoice
                          </span>
                        )}
                      </td>
                      <td className="border-b border-border/60 p-2 text-center text-xs sm:p-3 sm:text-sm">
                        <div className="flex items-center justify-center gap-3">
                          <Link
                            href={`/invoices/${inv.id}`}
                            onClick={(event) => {
                              if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                              showOverlay();
                            }}
                            className="font-medium text-primary hover:underline"
                          >
                            View
                          </Link>

                          <button
                            type="button"
                            onClick={() => void handleUndo(inv)}
                            disabled={!canUndo || isUndoing || undoingId !== null}
                            className="rounded-md border border-red-500/40 bg-red-600 px-2 py-1 text-[11px] font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:border-border/60 disabled:bg-muted disabled:text-muted-foreground"
                          >
                            {isUndoing ? "Undoing..." : canUndo ? "Undo" : isCanceled ? "Undone" : "Unavailable"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
