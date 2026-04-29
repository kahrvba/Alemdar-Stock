"use client";

import { useState } from "react";
import { generateUniqueBarcode } from "@/lib/generate-barcode";
import { useToast } from "@/components/ui/toast";

type BarcodeFieldWithGenerateProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function BarcodeFieldWithGenerate({
  value,
  onChange,
  disabled = false,
}: BarcodeFieldWithGenerateProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { showToast } = useToast();

  const handleGenerate = async () => {
    if ((value || "").trim()) {
      showToast("Barcode already exists. Clear it first to generate a new one.", "error");
      return;
    }

    setIsGenerating(true);
    try {
      const barcode = await generateUniqueBarcode();
      onChange(barcode);
      showToast("Barcode generated", "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to generate barcode";
      showToast(message, "error");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <label className="flex flex-col gap-1 text-sm text-muted-foreground">
      Barcode
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 rounded-2xl border border-border/60 bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={handleGenerate}
          disabled={disabled || isGenerating}
          className="rounded-2xl border border-border/60 bg-transparent px-3 py-2 text-xs font-semibold text-foreground transition hover:border-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isGenerating ? "Generating..." : "Generate"}
        </button>
      </div>
    </label>
  );
}
