"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast";

type CopyBarcodeButtonProps = {
  barcode: string | null | undefined;
};

export const BARCODE_COPIED_EVENT = "barcode-copied-to-checkout";

export function CopyBarcodeButton({ barcode }: CopyBarcodeButtonProps) {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const value = (barcode ?? "").trim();
    if (!value) {
      showToast("No barcode to copy", "error");
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      window.dispatchEvent(new CustomEvent<string>(BARCODE_COPIED_EVENT, { detail: value }));
      showToast("Barcode copied", "success");
      setCopied(true);
      setTimeout(() => setCopied(false), 1000);
    } catch {
      showToast("Failed to copy barcode", "error");
    }
  };

  return (
    <button
      type="button"
      onClick={(event) => void handleCopy(event)}
      className="ml-1 inline-flex h-4 w-4 cursor-pointer items-center justify-center align-middle text-muted-foreground"
      aria-label="Copy barcode"
      title="Copy barcode"
    >
      {copied ? (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4 text-emerald-600" fill="currentColor">
          <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
          <path d="M16 1H4a2 2 0 0 0-2 2v12h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11v14z" />
        </svg>
      )}
    </button>
  );
}
