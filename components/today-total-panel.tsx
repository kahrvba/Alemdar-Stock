"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);

export function TodayTotalPanel() {
  const [totalPassword, setTotalPassword] = useState("");
  const [isLoadingDayTotal, setIsLoadingDayTotal] = useState(false);
  const [dayTotal, setDayTotal] = useState<number | null>(null);
  const { showToast } = useToast();

  const handleRevealDayTotal = async () => {
    if (!totalPassword.trim()) {
      showToast("Password is required", "error");
      return;
    }

    setIsLoadingDayTotal(true);
    try {
      const response = await fetch("/api/day-total", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: totalPassword.trim() }),
      });

      const data = (await response.json().catch(() => null)) as
        | { success?: boolean; total?: number; error?: string }
        | null;

      if (!response.ok || !data?.success || typeof data.total !== "number") {
        throw new Error(data?.error ?? "Failed to load day total");
      }

      setDayTotal(data.total);
      showToast("Day total unlocked", "success");
    } catch (loadError) {
      setDayTotal(null);
      const message = loadError instanceof Error ? loadError.message : "Failed to load day total";
      showToast(message, "error");
    } finally {
      setIsLoadingDayTotal(false);
    }
  };

  return (
    <aside className="w-full rounded-2xl border border-border/60 bg-card/70 p-4">
      <p className="text-sm font-semibold text-foreground">Today Total</p>
      <div className="mt-2 flex items-center gap-2">
        <input
          type="password"
          autoComplete="new-password"
          value={totalPassword}
          onChange={(event) => setTotalPassword(event.target.value)}
          placeholder="Password"
          className="h-10 flex-1 rounded-xl border border-border/60 bg-background px-3 text-sm outline-none ring-0 transition focus:border-foreground/40"
        />
        <button
          type="button"
          onClick={() => void handleRevealDayTotal()}
          disabled={isLoadingDayTotal}
          className="h-10 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoadingDayTotal ? "Checking..." : "Show"}
        </button>
      </div>
      {dayTotal !== null ? (
        <p className="mt-3 text-lg font-bold text-emerald-600">{formatCurrency(dayTotal)}</p>
      ) : null}
    </aside>
  );
}
