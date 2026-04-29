"use client";

import React, { Activity, useState, useCallback, useEffect, Suspense } from "react";
import Image from "next/image";
import { Download, FileSpreadsheet, ChevronDown, FolderTree, Settings2 } from "lucide-react";
import { ProductCard } from "@/components/arduino/product-card";
import { PaginationControls } from "@/components/arduino/pagination-controls";
import { ArduinoSearch } from "@/components/arduino/arduino-search";
import type { ArduinoProduct } from "@/lib/services/arduino";
import { cn } from "@/lib/utils";
import { BarcodeFieldWithGenerate } from "@/components/ui/barcode-field-with-generate";
import { useArduinoInventory } from "@/hooks/use-arduino-inventory";
import { downloadExcel, highlightExcel } from "@/lib/excel-export";
import { WebSerialController } from "@/lib/webSerial";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/toast";
import {
  CategoryOptionsManager,
  type ArduinoCategoryField,
  type ArduinoCategoryOption,
  type CategoryOptionsManagerHandle,
} from "@/components/arduino/category-options-manager";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ArduinoInventoryClientProps = {
  items: ArduinoProduct[];
  page: number;
  totalPages: number;
  previousPage: number;
  nextPage: number;
  query: string | null;
  field: string | null;
};

type ArduinoCategoryOptionsMap = Record<
  ArduinoCategoryField,
  ArduinoCategoryOption[]
>;

const EMPTY_CATEGORY_OPTIONS: ArduinoCategoryOptionsMap = {
  category: [],
  category_layer_1: [],
  category_layer_2: [],
};

export function ArduinoInventoryClient({
  items,
  page,
  totalPages,
  previousPage,
  nextPage,
  query,
  field,
}: ArduinoInventoryClientProps) {
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
  } = useArduinoInventory();

  const [isExporting, setIsExporting] = useState(false);
  const [highlightQuantity, setHighlightQuantity] = useState(false);
  const [categoryOptions, setCategoryOptions] =
    useState<ArduinoCategoryOptionsMap>(EMPTY_CATEGORY_OPTIONS);
  const [isUpdatingCategoryOptions, setIsUpdatingCategoryOptions] =
    useState(false);
  const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false);
  const categoryManagerRef = React.useRef<CategoryOptionsManagerHandle | null>(null);

  // Serial connection state
  const [serialConnected, setSerialConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [serialController] = useState(() => new WebSerialController());
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const { showToast: showAlert } = useToast();

  const loadCategoryOptions = useCallback(async () => {
    try {
      const response = await fetch("/api/arduino/category-options", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to load category options");
      }

      const data = (await response.json()) as ArduinoCategoryOptionsMap;
      setCategoryOptions({
        category: data.category ?? [],
        category_layer_1: data.category_layer_1 ?? [],
        category_layer_2: data.category_layer_2 ?? [],
      });
    } catch (error) {
      console.error("Failed to load category options:", error);
      showAlert("Failed to load category lists", "error");
    }
  }, [showAlert]);

  const handleAddCategoryOption = useCallback(
    async (fieldName: ArduinoCategoryField, label: string) => {
      setIsUpdatingCategoryOptions(true);
      try {
        const response = await fetch("/api/arduino/category-options", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ fieldName, label }),
        });

        if (!response.ok) {
          throw new Error("Failed to save category option");
        }

        await loadCategoryOptions();
        showAlert("Category option saved", "success");
      } catch (error) {
        console.error("Failed to save category option:", error);
        showAlert("Failed to save category option", "error");
      } finally {
        setIsUpdatingCategoryOptions(false);
      }
    },
    [loadCategoryOptions, showAlert]
  );

  const handleDeleteCategoryOption = useCallback(
    async (_fieldName: ArduinoCategoryField, optionId: number) => {
      setIsUpdatingCategoryOptions(true);
      try {
        const response = await fetch("/api/arduino/category-options", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id: optionId }),
        });

        if (!response.ok) {
          throw new Error("Failed to delete category option");
        }

        await loadCategoryOptions();
        showAlert("Category option removed", "success");
      } catch (error) {
        console.error("Failed to delete category option:", error);
        showAlert("Failed to delete category option", "error");
      } finally {
        setIsUpdatingCategoryOptions(false);
      }
    },
    [loadCategoryOptions, showAlert]
  );

  const fetchAllProducts = async (): Promise<ArduinoProduct[]> => {
    try {
      const response = await fetch("/api/arduino?pageSize=10000");
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
      const ports = await serialController.listPorts();
      
      if (ports.length === 0) {
        setConnectionStatus('error');
        showAlert("No port selected", "error");
        setIsConnecting(false);
        return;
      }

      await serialController.connect();
      setSerialConnected(true);
      setConnectionStatus('connected');
      showAlert("Connected to Arduino", "success");
    } catch (error) {
      console.error('Connection error:', error);
      setConnectionStatus('error');
      setSerialConnected(false);
      showAlert("Failed to connect", "error");
    } finally {
      setIsConnecting(false);
    }
  }, [serialController, showAlert]);

  const sendToArduino = useCallback(async (product: ArduinoProduct) => {
    if (!serialConnected) {
      showAlert("Please connect to Arduino first", "error");
      return;
    }
    setSelectedProduct(product.id);
    try {
      const message = `1*${product.id}*${product.quantity ?? 0}*\n`;
      await serialController.write(message);
      showAlert(`Sent #${product.id} to Arduino`, "success");
    } catch (error) {
      console.error("Send error:", error);
      setSerialConnected(false);
      setConnectionStatus("error");
      showAlert("Failed to send to Arduino", "error");
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

  useEffect(() => {
    void loadCategoryOptions();
  }, [loadCategoryOptions]);

  const getOptionsForField = useCallback(
    (fieldName: ArduinoCategoryField, selectedValue: string) => {
      const optionMap = new Map(
        categoryOptions[fieldName].map((option) => [option.label, option])
      );

      if (selectedValue.trim() && !optionMap.has(selectedValue)) {
        optionMap.set(selectedValue, {
          id: -1,
          label: selectedValue,
        });
      }

      return Array.from(optionMap.values()).sort((left, right) =>
        left.label.localeCompare(right.label)
      );
    },
    [categoryOptions]
  );

  const totalCategoryOptions =
    categoryOptions.category.length +
    categoryOptions.category_layer_1.length +
    categoryOptions.category_layer_2.length;

  return (
    <>
    <div className="flex flex-col gap-12">
      <header className="flex flex-col items-start gap-4 text-left">
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-4">
            <h1 className="text-lg font-semibold uppercase tracking-[0.35em] text-muted-foreground">
              Arduino Inventory
            </h1>
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
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
                  <Download className="h-4 w-4 rotate-90" />
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

                <div className="grid w-full items-stretch gap-4 lg:grid-cols-2">
                  <div className="h-full [&>*]:h-full">
                    <Suspense fallback={<div className="h-10 w-full" />}>
                      <ArduinoSearch onLoadingChange={setIsSearching} />
                    </Suspense>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCategorySheetOpen(true)}
                    className="flex h-full min-h-[152px] w-full flex-col justify-between rounded-2xl border border-border/60 bg-card/80 p-4 text-left transition hover:border-border hover:bg-card"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                          Category Lists
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Open the saved category, layer 1, and layer 2 lists.
                        </p>
                      </div>
                      <span className="rounded-full border border-border/60 bg-background/70 p-2 text-muted-foreground">
                        <Settings2 className="h-4 w-4" />
                      </span>
                    </div>

                    <div className="flex items-end justify-between gap-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-sm text-foreground">
                          <FolderTree className="h-4 w-4 text-primary" />
                          <span>Saved values</span>
                        </div>
                      </div>
                      <span className="rounded-full border border-border/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-foreground">
                        {totalCategoryOptions}
                      </span>
                    </div>
                  </button>
                </div>
              </header>

      <section className="relative">
        <div
          className={cn(
            "grid gap-6 md:grid-cols-2 xl:grid-cols-3",
            isSearching ? "opacity-40 transition-opacity" : "opacity-100"
          )}
        >
          {items.length ? (
            items.map((product) => {
              // Calculate background color based on quantity
              let backgroundColor = 'bg-card/80';
              if (highlightQuantity) {
                const qty = Number(product.quantity) || 0;
                if (qty === 0) {
                  backgroundColor = 'bg-red-500';
                } else if (qty === 1) {
                  backgroundColor = 'bg-yellow-500';
                } else if (qty === 2) {
                  backgroundColor = 'bg-[#d97706]';
                } else if (qty === 3) {
                  backgroundColor = 'bg-green-500';
                }
              }

              return (
                <ProductCard
                  key={product.id}
                  product={product}
                  onEdit={setEditingProduct}
                  onDelete={handleDelete}
                  onAddToCart={handleAddToCart}
                  onSend={sendToArduino}
                  isDeleting={isDeleting && deletingProductId === product.id}
                  isSelected={selectedProduct === product.id}
                  backgroundColor={backgroundColor}
                />
              );
            })
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
      <Activity mode={isCategorySheetOpen ? "visible" : "hidden"}>
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur"
          onClick={(event) => {
            if (event.target === event.currentTarget && !isUpdatingCategoryOptions) {
              void (async () => {
                await categoryManagerRef.current?.submitActiveDraft();
                setIsCategorySheetOpen(false);
              })();
            }
          }}
        >
	          <div className="max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border/60 bg-card p-4 shadow-2xl sm:rounded-3xl sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
                  Arduino Categories
                </p>
                <h2 className="text-2xl font-semibold text-foreground">
                  Manage Saved Category Lists
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsCategorySheetOpen(false)}
                className="rounded-full border border-border/60 px-3 py-1 text-sm text-muted-foreground transition hover:border-foreground/50 hover:text-foreground"
              >
                Close
              </button>
            </div>

            <CategoryOptionsManager
              ref={categoryManagerRef}
              options={categoryOptions}
              onAddOption={handleAddCategoryOption}
              onDeleteOption={handleDeleteCategoryOption}
              isBusy={isUpdatingCategoryOptions}
            />
          </div>
        </div>
      </Activity>
      <Activity mode={(editingProduct || isAddingProduct) ? "visible" : "hidden"}>
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur overflow-y-auto"
          onClick={(event) => {
            if (event.target === event.currentTarget && !isSaving && !isUploading) {
              const form = event.currentTarget.querySelector("form");
              if (form) {
                form.requestSubmit();
              }
            }
          }}
        >
	          <div
	            className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border/60 bg-card p-4 shadow-2xl sm:rounded-3xl sm:p-6"
	            onClick={(event) => event.stopPropagation()}
	          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
                  {isAddingProduct ? "Add New Product" : "Editing Product"}
                </p>
                <h2 className="text-2xl font-semibold text-foreground">
                  {isAddingProduct ? "New Product" : editingProduct?.english_names ?? `#${editingProduct?.id}`}
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
                    value={formState.english_names}
                    onChange={(event) =>
                      handleFormChange("english_names", event.target.value)
                    }
                    className="rounded-2xl border border-border/60 bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm text-muted-foreground">
                  Turkish Name
                  <input
                    type="text"
                    value={formState.turkish_names}
                    onChange={(event) =>
                      handleFormChange("turkish_names", event.target.value)
                    }
                    className="rounded-2xl border border-border/60 bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                  />
                </label>
                <div className="md:col-span-2 grid gap-3 md:grid-cols-3">
                  <label className="flex flex-col gap-1 text-sm text-muted-foreground">
                    Category
                    <Select
                      value={formState.category || "__none__"}
                      onValueChange={(value) =>
                        handleFormChange(
                          "category",
                          value === "__none__" ? "" : value
                        )
                      }
                    >
                      <SelectTrigger className="w-full rounded-2xl border-border/60 bg-transparent">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {getOptionsForField("category", formState.category).map((option) => (
                          <SelectItem
                            key={`category-${option.id}-${option.label}`}
                            value={option.label}
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                  <label className="flex flex-col gap-1 text-sm text-muted-foreground">
                    Category Layer 1
                    <Select
                      value={formState.category_layer_1 || "__none__"}
                      onValueChange={(value) =>
                        handleFormChange(
                          "category_layer_1",
                          value === "__none__" ? "" : value
                        )
                      }
                    >
                      <SelectTrigger className="w-full rounded-2xl border-border/60 bg-transparent">
                        <SelectValue placeholder="Select layer 1" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {getOptionsForField(
                          "category_layer_1",
                          formState.category_layer_1
                        ).map((option) => (
                          <SelectItem
                            key={`category-layer-1-${option.id}-${option.label}`}
                            value={option.label}
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                  <label className="flex flex-col gap-1 text-sm text-muted-foreground">
                    Category Layer 2
                    <Select
                      value={formState.category_layer_2 || "__none__"}
                      onValueChange={(value) =>
                        handleFormChange(
                          "category_layer_2",
                          value === "__none__" ? "" : value
                        )
                      }
                    >
                      <SelectTrigger className="w-full rounded-2xl border-border/60 bg-transparent">
                        <SelectValue placeholder="Select layer 2" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {getOptionsForField(
                          "category_layer_2",
                          formState.category_layer_2
                        ).map((option) => (
                          <SelectItem
                            key={`category-layer-2-${option.id}-${option.label}`}
                            value={option.label}
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                </div>
                <BarcodeFieldWithGenerate
                  value={formState.barcode ?? ""}
                  onChange={(value) => handleFormChange("barcode", value)}
                  disabled={isSaving || isUploading}
                />
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
