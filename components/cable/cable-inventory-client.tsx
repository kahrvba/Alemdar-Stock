"use client";

import React, { Activity, useState, useCallback, useEffect, Suspense } from "react";
import Image from "next/image";
import { Settings, Download, FileSpreadsheet, Plus, ChevronDown } from "lucide-react";
import { ProductCard } from "@/components/cable/product-card";
import { PaginationControls } from "@/components/cable/pagination-controls";
import { CableSearch } from "@/components/cable/cable-search";
import type { CableProduct } from "@/lib/services/cable";
import { cn } from "@/lib/utils";
import { useCableInventory } from "@/hooks/use-cable-inventory";
import { downloadCableExcel, highlightCableExcel } from "@/lib/excel-export";
import { WebSerialController } from "@/lib/webSerial";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/toast";

type CableInventoryClientProps = {
  items: CableProduct[];
  page: number;
  totalPages: number;
  previousPage: number;
  nextPage: number;
  query: string | null;
  field: string | null;
};

export function CableInventoryClient({
  items,
  page,
  totalPages,
  previousPage,
  nextPage,
  query,
  field,
}: CableInventoryClientProps) {
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
  } = useCableInventory();

  const [isExporting, setIsExporting] = useState(false);

  // Serial connection state
  const [serialConnected, setSerialConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [serialController] = useState(() => new WebSerialController());
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const { showToast: showAlert } = useToast();

  const fetchAllProducts = async (): Promise<CableProduct[]> => {
    try {
      const response = await fetch("/api/mainSideLeds?pageSize=10000");
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
      await downloadCableExcel(allProducts);
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
      await highlightCableExcel(allProducts);
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

  const sendToArduino = useCallback(async (product: CableProduct) => {
    if (!serialConnected) {
      showAlert('Please connect to Arduino first', 'error');
      return;
    }

    try {
      const message = `5*${product.id}*${product.quantity}*\n`;
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
          <h1 className="text-lg font-semibold uppercase tracking-[0.35em] text-muted-foreground">
            Cable Inventory
          </h1>
          <div className="flex items-center gap-2">
            {/* Excel Export Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  disabled={isExporting}
                  className="flex items-center gap-2"
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
                className="flex items-center gap-2"
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

            {/* Add Product Button */}
            <Button
              onClick={() => setIsAddingProduct(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Product</span>
            </Button>
          </div>
        </div>
                <Suspense fallback={<div className="h-10 w-full" />}>
                  <CableSearch onLoadingChange={setIsSearching} />
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
                onEdit={setEditingProduct}
                onDelete={handleDelete}
                onAddToCart={handleAddToCart}
                onPrint={(product) => {
                  setSelectedProduct(product.id);
                  sendToArduino(product);
                }}
                isDeleting={isDeleting && deletingProductId === product.id}
                isSelected={selectedProduct === product.id}
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
                  {isAddingProduct ? "New Product" : editingProduct?.english_name ?? `#${editingProduct?.id}`}
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
                  English Name
                  <input
                    type="text"
                    value={formState.english_name}
                    onChange={(event) =>
                      handleFormChange("english_name", event.target.value)
                    }
                    className="rounded-2xl border border-border/60 bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm text-muted-foreground">
                  Turkish Name
                  <input
                    type="text"
                    value={formState.turkish_name}
                    onChange={(event) =>
                      handleFormChange("turkish_name", event.target.value)
                    }
                    className="rounded-2xl border border-border/60 bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm text-muted-foreground">
                  Category
                  <input
                    type="text"
                    value={formState.category}
                    onChange={(event) =>
                      handleFormChange("category", event.target.value)
                    }
                    className="rounded-2xl border border-border/60 bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm text-muted-foreground">
                  Barcode
                  <input
                    type="text"
                    value={formState.barcode}
                    onChange={(event) =>
                      handleFormChange("barcode", event.target.value)
                    }
                    className="rounded-2xl border border-border/60 bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm text-muted-foreground">
                  Quantity
                  <input
                    type="number"
                    value={formState.quantity}
                    onChange={(event) =>
                      handleFormChange("quantity", Number(event.target.value))
                    }
                    className="rounded-2xl border border-border/60 bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm text-muted-foreground">
                  Price (USD)
                  <input
                    type="number"
                    step="0.01"
                    value={formState.price}
                    onChange={(event) =>
                      handleFormChange("price", event.target.value)
                    }
                    className="rounded-2xl border border-border/60 bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                  />
                </label>
                <div className="md:col-span-2 flex flex-col gap-2 text-sm text-muted-foreground">
                  <span>Product Image</span>
                  <div
                    className="flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-border/60 bg-muted/40 px-4 py-6 text-center transition hover:border-primary/60 hover:bg-muted/60"
                    onClick={openFileDialog}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                  >
                    {imagePreviewUrl ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="relative h-32 w-full rounded-2xl overflow-hidden">
                          <Image
                            src={imagePreviewUrl}
                            alt="Preview"
                            fill
                            className="object-cover"
                            unoptimized={imagePreviewUrl.startsWith("blob:")}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {selectedImageFile?.name ?? (editingProduct ? "Current image" : "No image selected")}
                        </span>
                      </div>
                    ) : editingProduct?.image_filename ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="relative h-32 w-full rounded-2xl overflow-hidden">
                          <Image
                            src={editingProduct.image_filename}
                            alt="Current"
                            fill
                            className="object-cover"
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">Current image</span>
                      </div>
                    ) : (
                      <>
                        <span className="text-2xl">📁</span>
                        <p className="text-sm text-muted-foreground">
                          Drag & drop an image, or click to browse
                        </p>
                        <p className="text-xs text-muted-foreground/80">
                          JPG, PNG or WEBP files supported
                        </p>
                      </>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) =>
                        handleImageSelect(event.target.files?.[0] ?? null)
                      }
                    />
                  </div>
                </div>
                <label className="md:col-span-2 flex flex-col gap-1 text-sm text-muted-foreground">
                  Description
                  <textarea
                    value={formState.description}
                    onChange={(event) =>
                      handleFormChange("description", event.target.value)
                    }
                    rows={4}
                    className="rounded-2xl border border-border/60 bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                  />
                </label>
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

