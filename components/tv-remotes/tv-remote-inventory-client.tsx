"use client";

import React, { Suspense } from "react";
import Image from "next/image";
import { ProductCard } from "@/components/tv-remotes/product-card";
import { PaginationControls } from "@/components/tv-remotes/pagination-controls";
import { TvRemoteSearch } from "@/components/tv-remotes/tv-remote-search";
import { cn } from "@/lib/utils";
import type { TvRemote } from "@/lib/services/tv-remotes";
import { useTvRemotesInventory } from "@/hooks/use-tv-remotes-inventory";

type TvRemoteInventoryClientProps = {
  items: TvRemote[];
  page: number;
  totalPages: number;
  previousPage: number;
  nextPage: number;
  query: string | null;
  field: string | null;
};

export function TvRemoteInventoryClient({
  items,
  page,
  totalPages,
  previousPage,
  nextPage,
  query,
  field,
}: TvRemoteInventoryClientProps) {
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
    handleDelete,
    handleAddToCart,
  } = useTvRemotesInventory();

  return (
    <>
      <div className="flex flex-col gap-12">
        <header className="flex flex-col items-start gap-4 text-left">
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-4">
              <h1 className="text-lg font-semibold uppercase tracking-[0.35em] text-muted-foreground">
                TV-side
              </h1>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsAddingProduct(true);
              }}
              className="w-full rounded-2xl bg-primary/90 px-5 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary sm:w-auto"
            >
              Add Product
            </button>
          </div>
          <Suspense fallback={<div className="h-10 w-full" />}>
            <TvRemoteSearch onLoadingChange={setIsSearching} />
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
                  onEdit={() => setEditingProduct(product)}
                  onDelete={() => handleDelete(product)}
                  onAddToCart={() => handleAddToCart(product)}
                  isDeleting={isDeleting && deletingProductId === product.id}
                />
              ))
            ) : (
              <div className="col-span-full flex h-48 flex-col items-center justify-center rounded-3xl border border-dashed border-border/60 text-sm text-muted-foreground">
                No TV remotes match this filter.
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

      {editingProduct || isAddingProduct ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur">
          <div className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border/60 bg-card p-4 shadow-2xl sm:rounded-3xl sm:p-6">
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
                className="rounded-full border border-border/60 px-3 py-1 text-sm text-muted-foreground transition hover:border-foreground/50 hover:text-foreground"
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
                    onChange={(event) => handleFormChange("name", event.target.value)}
                    className="rounded-2xl border border-border/60 bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm text-muted-foreground">
                  Brand
                  <input
                    type="text"
                    value={formState.brand}
                    onChange={(event) => handleFormChange("brand", event.target.value)}
                    className="rounded-2xl border border-border/60 bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm text-muted-foreground">
                  Category
                  <input
                    type="text"
                    value={formState.category}
                    onChange={(event) => handleFormChange("category", event.target.value)}
                    className="rounded-2xl border border-border/60 bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm text-muted-foreground">
                  Quantity
                  <input
                    type="number"
                    value={formState.quantity}
                    onChange={(event) => handleFormChange("quantity", event.target.value)}
                    className="rounded-2xl border border-border/60 bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm text-muted-foreground">
                  Price
                  <input
                    type="number"
                    step="0.01"
                    value={formState.price}
                    onChange={(event) => handleFormChange("price", event.target.value)}
                    className="rounded-2xl border border-border/60 bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                  />
                </label>
                <label className="md:col-span-2 flex flex-col gap-1 text-sm text-muted-foreground">
                  Description
                  <textarea
                    value={formState.description}
                    onChange={(event) => handleFormChange("description", event.target.value)}
                    rows={3}
                    className="rounded-2xl border border-border/60 bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                  />
                </label>
                <label className="md:col-span-2 flex flex-col gap-1 text-sm text-muted-foreground">
                  Specs (JSON)
                  <textarea
                    value={formState.specs}
                    onChange={(event) => handleFormChange("specs", event.target.value)}
                    rows={4}
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
                      <div className="flex w-full flex-col items-center gap-2">
                        <div className="relative h-32 w-full overflow-hidden rounded-2xl">
                          <Image
                            src={imagePreviewUrl}
                            alt="Preview"
                            fill
                            className="object-cover"
                            unoptimized={imagePreviewUrl.startsWith("blob:")}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {selectedImageFile?.name || "Selected image"}
                        </span>
                      </div>
                    ) : editingProduct?.image_filename ? (
                      <div className="flex w-full flex-col items-center gap-2">
                        <div className="relative h-32 w-full overflow-hidden rounded-2xl">
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
                        <span className="text-sm text-muted-foreground">Drop or click to upload</span>
                        <span className="text-xs text-muted-foreground/80">JPG, PNG, or WEBP</span>
                      </>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => handleImageSelect(event.target.files?.[0] ?? null)}
                    />
                  </div>
                </div>
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
      ) : null}
    </>
  );
}
