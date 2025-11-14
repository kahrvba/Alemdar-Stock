"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ProductCard } from "@/components/arduino/product-card";
import { PaginationControls } from "@/components/arduino/pagination-controls";
import { ArduinoSearch } from "@/components/arduino/arduino-search";
import type { ArduinoProduct } from "@/lib/services/arduino";
import { cn } from "@/lib/utils";

type ArduinoInventoryClientProps = {
  items: ArduinoProduct[];
  page: number;
  totalPages: number;
  previousPage: number;
  nextPage: number;
  query: string | null;
  field: string | null;
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
  const [isSearching, setIsSearching] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ArduinoProduct | null>(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [formState, setFormState] = useState({
    id: 0,
    english_names: "",
    turkish_names: "",
    category: "",
    barcode: "",
    quantity: 0,
    price: "",
    image_filename: "",
    description: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (editingProduct) {
      setFormState({
        id: editingProduct.id,
        english_names: editingProduct.english_names ?? "",
        turkish_names: editingProduct.turkish_names ?? "",
        category: editingProduct.category ?? "",
        barcode: editingProduct.barcode ?? "",
        quantity: editingProduct.quantity ?? 0,
        price: editingProduct.price ? String(editingProduct.price) : "",
        image_filename: editingProduct.image_filename ?? "",
        description: editingProduct.description ?? "",
      });
      setSelectedImageFile(null);
      setImagePreviewUrl(editingProduct.image_filename ?? null);
      setErrorMessage(null);
    } else if (isAddingProduct) {
      setFormState({
        id: 0,
        english_names: "",
        turkish_names: "",
        category: "",
        barcode: "",
        quantity: 0,
        price: "",
        image_filename: "",
        description: "",
      });
      setSelectedImageFile(null);
      setImagePreviewUrl(null);
      setErrorMessage(null);
    }
  }, [editingProduct, isAddingProduct]);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  const handleFormChange = (field: string, value: string | number) => {
    setFormState((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleImageSelect = (file: File | null) => {
    if (imagePreviewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    if (file) {
      setSelectedImageFile(file);
      setImagePreviewUrl(URL.createObjectURL(file));
    } else {
      setSelectedImageFile(null);
      setImagePreviewUrl(null);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      handleImageSelect(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const uploadSelectedImage = async (productId: number): Promise<string | null> => {
    if (!selectedImageFile || !productId) {
      return null;
    }
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", selectedImageFile);
      formData.append("id", String(productId));

      const response = await fetch("/api/arduino/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload image");
      }

      const data = (await response.json()) as { url?: string };
      return data.url ?? null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleEditSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formState.id) return;
    setIsSaving(true);
    setErrorMessage(null);
    let imageFilename = formState.image_filename || null;
    try {
      if (selectedImageFile) {
        const uploadedUrl = await uploadSelectedImage(formState.id);
        if (uploadedUrl) {
          imageFilename = uploadedUrl;
        }
      }

      const response = await fetch("/api/arduino", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: formState.id,
          english_names: formState.english_names || null,
          turkish_names: formState.turkish_names || null,
          category: formState.category || null,
          barcode: formState.barcode || null,
          quantity: Number(formState.quantity) || 0,
          price: formState.price ? String(formState.price) : null,
          image_filename: imageFilename,
          description: formState.description || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update product");
      }

      setEditingProduct(null);
      if (imagePreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
      setSelectedImageFile(null);
      setImagePreviewUrl(null);
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to update product"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/arduino", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          english_names: formState.english_names || null,
          turkish_names: formState.turkish_names || null,
          category: formState.category || null,
          barcode: formState.barcode || null,
          quantity: Number(formState.quantity) || 0,
          price: formState.price ? String(formState.price) : null,
          image_filename: null,
          description: formState.description || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add product");
      }

      const result = (await response.json()) as { id?: number };
      const newProductId = result.id;

      if (selectedImageFile && newProductId) {
        const uploadedUrl = await uploadSelectedImage(newProductId);
        if (uploadedUrl) {
          await fetch("/api/arduino", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              id: newProductId,
              image_filename: uploadedUrl,
            }),
          });
        }
      }

      setIsAddingProduct(false);
      if (imagePreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
      setSelectedImageFile(null);
      setImagePreviewUrl(null);
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to add product"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (product: ArduinoProduct) => {
    if (!confirm(`Are you sure you want to delete "${product.english_names ?? `Product #${product.id}`}"? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    setDeletingProductId(product.id);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/arduino", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: product.id }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete product");
      }

      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to delete product"
      );
    } finally {
      setIsDeleting(false);
      setDeletingProductId(null);
    }
  };

  return (
    <>
    <div className="flex flex-col gap-12">
      <header className="flex flex-col items-start gap-4 text-left">
        <div className="flex w-full items-center justify-between">
          <h1 className="text-lg font-semibold uppercase tracking-[0.35em] text-muted-foreground">
            Arduino Inventory
          </h1>
          <button
            type="button"
            onClick={() => setIsAddingProduct(true)}
            className="rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            Add Product
          </button>
        </div>
        <ArduinoSearch onLoadingChange={setIsSearching} />
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
      {(editingProduct || isAddingProduct) ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur">
          <div className="w-full max-w-2xl rounded-3xl border border-border/60 bg-card p-6 shadow-2xl">
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
                        <img
                          src={imagePreviewUrl}
                          alt="Preview"
                          className="h-32 w-full rounded-2xl object-cover"
                        />
                        <span className="text-xs text-muted-foreground">
                          {selectedImageFile?.name ?? (editingProduct ? "Current image" : "No image selected")}
                        </span>
                      </div>
                    ) : editingProduct?.image_filename ? (
                      <div className="flex flex-col items-center gap-2">
                        <img
                          src={editingProduct.image_filename}
                          alt="Current"
                          className="h-32 w-full rounded-2xl object-cover"
                        />
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
      ) : null}
    </>
  );
}


