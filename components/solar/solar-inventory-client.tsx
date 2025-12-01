"use client";

import React, { Activity, useState, Suspense } from "react";
import Image from "next/image";
import { Download, FileSpreadsheet, ChevronDown } from "lucide-react";
import { ProductCard } from "@/components/solar/product-card";
import { PaginationControls } from "@/components/solar/pagination-controls";
import { SolarSearch } from "@/components/solar/solar-search";
import type { SolarProduct } from "@/lib/services/solar";
import { cn } from "@/lib/utils";
import { useSolarInventory } from "@/hooks/use-solar-inventory";
import { downloadSolarExcel, highlightSolarExcel } from "@/lib/excel-export";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

type SolarInventoryClientProps = {
  items: SolarProduct[];
  page: number;
  totalPages: number;
  previousPage: number;
  nextPage: number;
  query: string | null;
  field: string | null;
};

export function SolarInventoryClient({
  items,
  page,
  totalPages,
  previousPage,
  nextPage,
  query,
  field,
}: SolarInventoryClientProps) {
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
  } = useSolarInventory();

  const [isExporting, setIsExporting] = useState(false);
  const [toptanMultiplier, setToptanMultiplier] = useState<string>("1.3");
  const [minMultiplier, setMinMultiplier] = useState<string>("1.6");
  const [musteriMultiplier, setMusteriMultiplier] = useState<string>("1.6");

  const fetchAllProducts = async (): Promise<SolarProduct[]> => {
    try {
      const response = await fetch("/api/solar?all=true");
      if (!response.ok) {
        throw new Error("Failed to fetch products");
      }
      const data = await response.json();
      return data.products || [];
    } catch (error) {
      console.error("Failed to fetch all products:", error);
      return [];
    }
  };

  const handleDownloadExcel = async () => {
    setIsExporting(true);
    try {
      const allProducts = await fetchAllProducts();
      await downloadSolarExcel(allProducts);
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
      await highlightSolarExcel(allProducts);
    } catch (error) {
      console.error("Failed to export highlighted Excel:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
    <div className="flex flex-col gap-12">
      <header className="flex flex-col items-start gap-4 text-left">
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold uppercase tracking-[0.35em] text-muted-foreground">
              Solar Inventory
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
                <Suspense fallback={<div className="h-10 w-full" />}>
                  <SolarSearch onLoadingChange={setIsSearching} />
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
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSaving && !isUploading) {
              const form = e.currentTarget.querySelector('form');
              if (form) {
                form.requestSubmit();
              }
            }
          }}
        >
          <div 
            className="w-full max-w-2xl max-h-[calc(100vh-2rem)] rounded-3xl border border-border/60 bg-card p-6 shadow-2xl overflow-y-auto my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
                  {isAddingProduct ? "Add New Product" : "Editing Product"}
                </p>
                <h2 className="text-2xl font-semibold text-foreground">
                  {isAddingProduct ? "New Product" : editingProduct?.name ?? `#${editingProduct?.id}`}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingProduct(null);
                  setIsAddingProduct(false);
                }}
                className="rounded-full border border-border/60 px-3 py-1 text-sm text-muted-foreground transition hover:border-foreground/50 hover:text-foreground cursor-pointer"
              >
                Close
              </button>
            </div>
            <form className="flex flex-col gap-4" onSubmit={isAddingProduct ? handleAddSubmit : handleEditSubmit}>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm text-muted-foreground">
                  Name
                  <input
                    type="text"
                    value={formState.name}
                    onChange={(event) =>
                      handleFormChange("name", event.target.value)
                    }
                    className="rounded-2xl border border-border/60 bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm text-muted-foreground">
                  Rating
                  <input
                    type="text"
                    value={formState.rating}
                    onChange={(event) =>
                      handleFormChange("rating", event.target.value)
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
                <label className="md:col-span-2 flex flex-col gap-1 text-sm text-muted-foreground">
                  Factory price
                  <input
                    type="number"
                    step="0.01"
                    value={formState.factory_price}
                    onChange={(event) =>
                      handleFormChange("factory_price", event.target.value)
                    }
                    className="rounded-2xl border border-border/60 bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                  />
                </label>
                <label className="md:col-span-2 flex flex-col gap-1 text-sm text-muted-foreground">
                  Factor
                  <div className="flex flex-col gap-2">
                    <input
                      type="number"
                      step="0.01"
                      value={formState.factor}
                      onChange={(event) =>
                        handleFormChange("factor", event.target.value)
                      }
                      className="rounded-2xl border border-border/60 bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                      placeholder="Custom factor"
                    />
                    <div className="flex flex-wrap gap-2">
                      {["1.17", "1.30", "1.35"].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => handleFormChange("factor", preset)}
                          className={cn(
                            "rounded-full border px-3 py-1 text-xs font-semibold transition cursor-pointer",
                            formState.factor === preset
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border/60 bg-muted/60 text-foreground hover:border-foreground/40 hover:bg-muted"
                          )}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                </label>
                <label className="md:col-span-2 flex flex-col gap-1 text-sm text-muted-foreground border-t-2 border-border/80 pt-4 mt-4">
                  <span>
                    Cost price = {formState.factory_price || "factory_price"} × {formState.factor || "factor"}
                    {formState.factory_price && formState.factor && formState.cost_price ? (
                      <span className="ml-2 font-semibold text-foreground">
                        = {formState.cost_price}
                      </span>
                    ) : null}
                  </span>
                </label>
                <label className="md:col-span-2 flex flex-col gap-1 text-sm text-muted-foreground border-t-2 border-border/80 pt-4 mt-4">
                  <span>
                    Toptan price = {formState.cost_price || "cost_price"} × {toptanMultiplier}
                    {formState.cost_price && formState.wholesale_price ? (
                      <span className="ml-2 font-semibold text-foreground">
                        = {formState.wholesale_price}
                      </span>
                    ) : null}
                  </span>
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap gap-2">
                      {[1.3, 1.4, 1.5].map((multiplier) => {
                        const currentMul = Number(
                          toptanMultiplier.replace(",", ".")
                        );
                        const isActive =
                          Number.isFinite(currentMul) &&
                          Math.abs(currentMul - multiplier) < 1e-6;
                        return (
                          <button
                            key={multiplier}
                            type="button"
                            onClick={() => {
                              const rawCost =
                                typeof formState.cost_price === "string"
                                  ? formState.cost_price.replace(",", ".")
                                  : String(formState.cost_price ?? "");
                              const cost = Number(rawCost);
                              if (!Number.isFinite(cost) || cost <= 0) return;
                              const value = (cost * multiplier).toFixed(2);
                              setToptanMultiplier(multiplier.toFixed(1));
                              handleFormChange("wholesale_price", value);
                            }}
                            className={cn(
                              "rounded-full border px-3 py-1 text-xs font-semibold transition cursor-pointer",
                              isActive
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border/60 bg-muted/60 text-foreground hover:border-foreground/40 hover:bg-muted"
                            )}
                          >
                            × {multiplier.toFixed(1)}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Custom multiplier</span>
                      <input
                        type="number"
                        step="0.01"
                        value={toptanMultiplier}
                        onChange={(event) => setToptanMultiplier(event.target.value)}
                        className="w-20 rounded-xl border border-border/60 bg-transparent px-2 py-1 text-xs text-foreground outline-none focus:border-primary"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const rawCost =
                            typeof formState.cost_price === "string"
                              ? formState.cost_price.replace(",", ".")
                              : String(formState.cost_price ?? "");
                          const cost = Number(rawCost);
                          const mul = Number(
                            toptanMultiplier.replace(",", ".")
                          );
                          if (
                            !Number.isFinite(cost) ||
                            cost <= 0 ||
                            !Number.isFinite(mul) ||
                            mul <= 0
                          )
                            return;
                          const value = (cost * mul).toFixed(2);
                          handleFormChange("wholesale_price", value);
                        }}
                        className="rounded-full border border-border/60 bg-muted/60 px-3 py-1 text-xs font-semibold text-foreground transition hover:border-foreground/40 hover:bg-muted cursor-pointer"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </label>
                <label className="md:col-span-2 flex flex-col gap-1 text-sm text-muted-foreground border-t-2 border-border/80 pt-4 mt-4">
                  <span>
                    Min selling price = {formState.cost_price || "cost_price"} × {minMultiplier}
                    {formState.cost_price && formState.min_selling_price ? (
                      <span className="ml-2 font-semibold text-foreground">
                        = {formState.min_selling_price}
                      </span>
                    ) : null}
                  </span>
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap gap-2">
                      {[1.6, 1.7, 1.8].map((multiplier) => {
                        const currentMul = Number(
                          minMultiplier.replace(",", ".")
                        );
                        const isActive =
                          Number.isFinite(currentMul) &&
                          Math.abs(currentMul - multiplier) < 1e-6;
                        return (
                          <button
                            key={multiplier}
                            type="button"
                            onClick={() => {
                              const rawCost =
                                typeof formState.cost_price === "string"
                                  ? formState.cost_price.replace(",", ".")
                                  : String(formState.cost_price ?? "");
                              const cost = Number(rawCost);
                              if (!Number.isFinite(cost) || cost <= 0) return;
                              const value = (cost * multiplier).toFixed(2);
                              setMinMultiplier(multiplier.toFixed(1));
                              handleFormChange("min_selling_price", value);
                            }}
                            className={cn(
                              "rounded-full border px-3 py-1 text-xs font-semibold transition cursor-pointer",
                              isActive
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border/60 bg-muted/60 text-foreground hover:border-foreground/40 hover:bg-muted"
                            )}
                          >
                            × {multiplier.toFixed(1)}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Custom multiplier</span>
                      <input
                        type="number"
                        step="0.01"
                        value={minMultiplier}
                        onChange={(event) => setMinMultiplier(event.target.value)}
                        className="w-20 rounded-xl border border-border/60 bg-transparent px-2 py-1 text-xs text-foreground outline-none focus:border-primary"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const rawCost =
                            typeof formState.cost_price === "string"
                              ? formState.cost_price.replace(",", ".")
                              : String(formState.cost_price ?? "");
                          const cost = Number(rawCost);
                          const mul = Number(minMultiplier.replace(",", "."));
                          if (
                            !Number.isFinite(cost) ||
                            cost <= 0 ||
                            !Number.isFinite(mul) ||
                            mul <= 0
                          )
                            return;
                          const value = (cost * mul).toFixed(2);
                          handleFormChange("min_selling_price", value);
                        }}
                        className="rounded-full border border-border/60 bg-muted/60 px-3 py-1 text-xs font-semibold text-foreground transition hover:border-foreground/40 hover:bg-muted cursor-pointer"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </label>
                <label className="md:col-span-2 flex flex-col gap-1 text-sm text-muted-foreground border-t-2 border-border/80 pt-4 mt-4">
                  <span>
                    Müşteri price = {formState.cost_price || "cost_price"} × {musteriMultiplier}
                    {formState.cost_price && formState.selling_price ? (
                      <span className="ml-2 font-semibold text-foreground">
                        = {formState.selling_price}
                      </span>
                    ) : null}
                  </span>
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap gap-2">
                      {[1.6, 1.7, 1.8, 1.9, 2.0].map((multiplier) => {
                        const currentMul = Number(
                          musteriMultiplier.replace(",", ".")
                        );
                        const isActive =
                          Number.isFinite(currentMul) &&
                          Math.abs(currentMul - multiplier) < 1e-6;
                        return (
                          <button
                            key={multiplier}
                            type="button"
                            onClick={() => {
                              const rawCost =
                                typeof formState.cost_price === "string"
                                  ? formState.cost_price.replace(",", ".")
                                  : String(formState.cost_price ?? "");
                              const cost = Number(rawCost);
                              if (!Number.isFinite(cost) || cost <= 0) return;
                              const value = (cost * multiplier).toFixed(2);
                              setMusteriMultiplier(multiplier.toFixed(1));
                              handleFormChange("selling_price", value);
                            }}
                            className={cn(
                              "rounded-full border px-3 py-1 text-xs font-semibold transition cursor-pointer",
                              isActive
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border/60 bg-muted/60 text-foreground hover:border-foreground/40 hover:bg-muted"
                            )}
                          >
                            × {multiplier.toFixed(1)}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Custom multiplier</span>
                      <input
                        type="number"
                        step="0.01"
                        value={musteriMultiplier}
                        onChange={(event) => setMusteriMultiplier(event.target.value)}
                        className="w-20 rounded-xl border border-border/60 bg-transparent px-2 py-1 text-xs text-foreground outline-none focus:border-primary"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const rawCost =
                            typeof formState.cost_price === "string"
                              ? formState.cost_price.replace(",", ".")
                              : String(formState.cost_price ?? "");
                          const cost = Number(rawCost);
                          const mul = Number(
                            musteriMultiplier.replace(",", ".")
                          );
                          if (
                            !Number.isFinite(cost) ||
                            cost <= 0 ||
                            !Number.isFinite(mul) ||
                            mul <= 0
                          )
                            return;
                          const value = (cost * mul).toFixed(2);
                          handleFormChange("selling_price", value);
                        }}
                        className="rounded-full border border-border/60 bg-muted/60 px-3 py-1 text-xs font-semibold text-foreground transition hover:border-foreground/40 hover:bg-muted cursor-pointer"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </label>
                <label className="md:col-span-2 flex flex-col gap-1 text-sm text-muted-foreground">
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
                  className="rounded-2xl border border-border/60 px-4 py-2 text-sm text-muted-foreground transition hover:border-foreground/50 hover:text-foreground disabled:opacity-60 cursor-pointer"
                  disabled={isSaving || isUploading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || isUploading}
                  className="rounded-2xl bg-primary/90 px-5 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary disabled:opacity-60 cursor-pointer"
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

