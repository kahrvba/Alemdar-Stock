"use client";

import React, { Activity, useState, useCallback, useEffect, Suspense } from "react";
import Image from "next/image";
import { Settings, Download, FileSpreadsheet, ChevronDown } from "lucide-react";
import { ProductCard } from "@/components/batteries/product-card";
import { PaginationControls } from "@/components/batteries/pagination-controls";
import { ArduinoSearch } from "@/components/arduino/arduino-search";
import { cn } from "@/lib/utils";
import { useBatteriesInventory } from "@/hooks/use-batteries-inventory";
import { downloadExcel, highlightExcel } from "@/lib/excel-export";
import { WebSerialController } from "@/lib/webSerial";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/toast";
import { Checkbox } from "@/components/ui/checkbox";
import type { BatteryProduct } from "@/lib/services/batteries";

type BatteryInventoryClientProps = {
  items: BatteryProduct[];
  page: number;
  totalPages: number;
  previousPage: number;
  nextPage: number;
  query: string | null;
  field: string | null;
};

export function BatteriesInventoryClient({
  items,
  page,
  totalPages,
  previousPage,
  nextPage,
  query,
  field,
}: BatteryInventoryClientProps) {
  const {
    isSearching,
    editingProduct,
    isAddingProduct,
    formState,
    isSaving,
    isUploading,
    isDeleting,
    deletingProductId,
    errorMessage,
    selectedImageFile,
    imagePreviewUrl,
    fileInputRef,
    setIsSearching,
    setEditingProduct,
    setIsAddingProduct,
    handleFormChange,
    handleImageSelect,
    handleDrop,
    handleDragOver,
    openFileDialog,
    handleEditSubmit,
    handleAddSubmit,
    handleAddToCart,
    handleDelete,
  } = useBatteriesInventory();

  const [isExporting, setIsExporting] = useState(false);
  const [highlightQuantity, setHighlightQuantity] = useState(false);

  // Serial connection state
  const [serialConnected, setSerialConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [serialController] = useState(() => new WebSerialController());
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const { showToast: showAlert } = useToast();

  const fetchAllProducts = async (): Promise<BatteryProduct[]> => {
    try {
      const response = await fetch("/api/batteries?pageSize=10000");
      if (!response.ok) {
        throw new Error("Failed to fetch products");
      }
      const data = await response.json();
      return data.items || [];
    } catch (error) {
      console.error("Failed to fetch all products:", error);
      return [];
    }
  };

  const handleDownloadExcel = async () => {
    setIsExporting(true);
    try {
      const allProducts = await fetchAllProducts();
      await downloadExcel(allProducts);
    } catch (error) {
      console.error("Failed to export Excel:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleHighlightExcel = async () => {
    setIsExporting(true);
    try {
      const allProducts = await fetchAllProducts();
      await highlightExcel(allProducts);
    } catch (error) {
      console.error("Failed to export highlighted Excel:", error);
    } finally {
      setIsExporting(false);
    }
  };

  // Serial connection function - opens port selection and auto-connects
  const handleConnectArduino = useCallback(async () => {
    setIsConnecting(true);
    setConnectionStatus('connecting');
    
    try {
      // This will open the browser's port selection dialog
      const ports = await serialController.listPorts();
      
      if (ports.length === 0) {
        setConnectionStatus('error');
        showAlert('No port selected', 'error');
        setIsConnecting(false);
        return;
      }

      // Auto-connect after port selection
      await serialController.connect();
      setSerialConnected(true);
      setConnectionStatus('connected');
      showAlert('Connected to Arduino!', 'success');
    } catch (error) {
      console.error('Connection error:', error);
      setConnectionStatus('error');
      setSerialConnected(false);
      showAlert(`Failed to connect: ${error instanceof Error ? error.message : String(error)}`, 'error');
    } finally {
      setIsConnecting(false);
    }
  }, [serialController, showAlert]);

  const sendToArduino = useCallback(async (product: BatteryProduct) => {
    if (!serialConnected) {
      showAlert('Please connect to Arduino first', 'error');
      return;
    }

    try {
      const message = `1*${product.id}*\n`;
      await serialController.write(message);
    } catch (error) {
      showAlert('Failed to send to Arduino', 'error');
      setSerialConnected(false);
      setConnectionStatus('error');
    }
  }, [serialConnected, serialController, showAlert]);

  // Update connection status based on state
  useEffect(() => {
    if (serialConnected) {
      setConnectionStatus('connected');
    } else if (isConnecting) {
      setConnectionStatus('connecting');
    } else {
      setConnectionStatus('disconnected');
    }
  }, [serialConnected, isConnecting]);

  return (
    <>
    <div className="flex flex-col gap-12">
      <header className="flex flex-col items-start gap-4 text-left">
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold uppercase tracking-[0.35em] text-muted-foreground">
              Arduino Inventory
            </h1>
            <div className="flex items-center gap-2">
              {/* Excel Export Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={isExporting}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>Export</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem
                    onClick={handleDownloadExcel}
                    disabled={isExporting}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    <span>{isExporting ? "Exporting..." : "Full Excel Sheet"}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleHighlightExcel}
                    disabled={isExporting}
                    className="flex items-center gap-2"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>{isExporting ? "Exporting..." : "Highlighted Excel Sheet"}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Connect to Arduino Button */}
              <div className="relative">
                <Button
                  onClick={handleConnectArduino}
                  disabled={isConnecting || serialConnected}
                  variant="outline"
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Settings className="h-4 w-4" />
                  {isConnecting ? 'Connecting...' : serialConnected ? 'Connected' : 'Connect'}
                </Button>
                <span
                  className={cn(
                    "absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-background",
                    connectionStatus === 'connected' && "bg-green-500",
                    connectionStatus === 'connecting' && "bg-yellow-500",
                    connectionStatus === 'error' && "bg-red-500",
                    connectionStatus === 'disconnected' && "bg-gray-400"
                  )}
                  aria-label={
                    connectionStatus === 'connected' ? 'Connected' :
                    connectionStatus === 'connecting' ? 'Connecting' :
                    connectionStatus === 'error' ? 'Error' :
                    'Disconnected'
                  }
                />
              </div>

              {/* Highlight Quantity Toggle */}
              <div className="flex items-center gap-2">
                <div
                  onClick={() => setHighlightQuantity(!highlightQuantity)}
                  className="flex items-center gap-2 cursor-pointer rounded-md border border-input bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <Checkbox
                    checked={highlightQuantity}
                    onCheckedChange={(checked) => setHighlightQuantity(checked as boolean)}
                    className="h-5 w-5 cursor-pointer pointer-events-none"
                  />
                  <span>Highlight Quantity</span>
                </div>
              </div>

              {/* Add Product Button */}
              <Button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsAddingProduct(true);
                }}
                className="cursor-pointer"
                style={{ pointerEvents: 'auto' }}
              >
                Add Product
              </Button>
            </div>
          </div>
        </div>
        
        {/* Color Legend - Only show when highlighting is enabled */}
        {highlightQuantity && (
          <div className="flex items-center gap-4 rounded-lg border border-border/60 bg-muted/30 px-4 py-2 text-xs">
            <span className="font-semibold text-muted-foreground">Color Guide:</span>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-full bg-red-500" />
              <span className="text-muted-foreground">Empty (0)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-full bg-yellow-500" />
              <span className="text-muted-foreground">Almost Empty (1)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-full bg-[#d97706]" />
              <span className="text-muted-foreground">Low (2)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <span className="text-muted-foreground">Good (3)</span>
            </div>
          </div>
        )}

                <Suspense fallback={<div className="h-10 w-full" />}>
                  <ArduinoSearch onLoadingChange={setIsSearching} />
                </Suspense>
              </header>

      <section className="relative">
        <div
          className={cn(
            "grid gap-6 md:grid-cols-2 xl:grid-cols-3",
            isSearching ? "opacity-40 transition-opacity" : "opacity-100"
          )}
        >
              {items.length ? (
            items.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onEdit={(p) => setEditingProduct(p)}
                onDelete={handleDelete}
                onAddToCart={handleAddToCart}
                isDeleting={isDeleting && deletingProductId === product.id}
              />
            ))
          ) : (
            <div className="col-span-full flex h-48 flex-col items-center justify-center rounded-3xl border border-dashed border-border/60 text-sm text-muted-foreground">
              No products match this filter.
            </div>
          )}
        </div>

        {isSearching ? (
          <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-primary/40 bg-background/70 backdrop-blur-[2px]">
            <span className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Updating results
            </span>
          </div>
        ) : null}
      </section>

      <PaginationControls
        page={page}
        totalPages={totalPages}
        previousPage={previousPage}
        nextPage={nextPage}
        query={query}
        field={field}
      />
    </div>
      <Activity mode={(editingProduct || isAddingProduct) ? "visible" : "hidden"}>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur">
          <div className="w-full max-w-2xl rounded-3xl border border-border/60 bg-card p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
                <div>
                <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
                  {isAddingProduct ? "Add New Product" : "Editing Product"}
                </p>
                <h2 className="text-2xl font-semibold text-foreground">
                  {isAddingProduct ? "New Product" : (editingProduct as any)?.model ?? `#${editingProduct?.id}`}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingProduct(null);
                  setIsAddingProduct(false);
                }}
                className="rounded-full border border-border/60 px-3 py-1 text-sm text-muted-foreground transition hover:border-foreground/50 hover:text-foreground"
              >
                Close
              </button>
            </div>
            <form className="flex flex-col gap-4" onSubmit={isAddingProduct ? handleAddSubmit : handleEditSubmit}>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm text-muted-foreground">
                  Volt
                  <input
                    type="text"
                    value={(formState as any).volt ?? ""}
                    onChange={(event) =>
                      handleFormChange("volt", event.target.value)
                    }
                    className="rounded-2xl border border-border/60 bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm text-muted-foreground">
                  Model
                  <input
                    type="text"
                    value={(formState as any).model ?? ""}
                    onChange={(event) =>
                      handleFormChange("model", event.target.value)
                    }
                    className="rounded-2xl border border-border/60 bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                  />
                </label>
                {/* Batteries only have id, model, and volt - no extra fields */}
              </div>
              {errorMessage ? (
                <p className="text-sm text-destructive">{errorMessage}</p>
              ) : null}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditingProduct(null);
                    setIsAddingProduct(false);
                  }}
                  className="rounded-2xl border border-border/60 px-4 py-2 text-sm text-muted-foreground transition hover:border-foreground/50 hover:text-foreground disabled:opacity-60"
                  disabled={isSaving || isUploading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || isUploading}
                  className="rounded-2xl bg-primary/90 px-5 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary disabled:opacity-60"
                >
                  {isUploading ? "Uploading..." : isSaving ? (isAddingProduct ? "Adding..." : "Saving...") : (isAddingProduct ? "Add Product" : "Save changes")}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Activity>
    </>
  );
}


