"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { BatteryProduct } from "@/lib/services/batteries";
import { useToast } from "@/components/ui/toast";
import { useCart } from "@/components/ui/cart";

export function useBatteriesInventory() {
  // State management
  const [isSearching, setIsSearching] = useState(false);
  const [editingProduct, setEditingProduct] = useState<BatteryProduct | null>(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [formState, setFormState] = useState({
    id: 0,
    model: "",
    volt: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Dependencies
  const router = useRouter();
  const { showToast } = useToast();
  const { addToCart, openCart } = useCart();

  // Initialize form state when editing or adding
  useEffect(() => {
    if (editingProduct) {
      setFormState({
        id: editingProduct.id,
        model: editingProduct.model ?? "",
        volt: editingProduct.volt ?? "",
      });
      setSelectedImageFile(null);
      setImagePreviewUrl(null);
      setErrorMessage(null);
    } else if (isAddingProduct) {
      setFormState({
        id: 0,
        model: "",
        volt: "",
      });
      setSelectedImageFile(null);
      setImagePreviewUrl(null);
      setErrorMessage(null);
    }
  }, [editingProduct, isAddingProduct]);

  // Cleanup blob URLs
  useEffect(() => {
    return () => {
      if (imagePreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  // Handler functions
  const handleFormChange = useCallback((field: string, value: string | number) => {
    setFormState((previous) => ({
      ...previous,
      [field]: value,
    }));
  }, []);

  const handleImageSelect = useCallback((file: File | null) => {
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
  }, [imagePreviewUrl]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      handleImageSelect(file);
    }
  }, [handleImageSelect]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const uploadSelectedImage = useCallback(async (productId: number): Promise<string | null> => {
    if (!selectedImageFile || !productId) {
      return null;
    }
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", selectedImageFile);
      formData.append("id", String(productId));

      const response = await fetch("/api/batteries/upload", {
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
  }, [selectedImageFile]);

  const handleEditSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formState.id) return;
    setIsSaving(true);
    setErrorMessage(null);
      let imageFilename = null;
    try {
      // No image upload for batteries (table only has model & volt)
      const response = await fetch("/api/batteries", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: formState.id,
          model: (formState as any).model || null,
          volt: (formState as any).volt || null,
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
      showToast("Product updated successfully", "success");
      router.refresh();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to update product";
      setErrorMessage(errorMsg);
      showToast(errorMsg, "error");
    } finally {
      setIsSaving(false);
    }
  }, [formState, selectedImageFile, imagePreviewUrl, uploadSelectedImage, showToast, router]);

  const handleAddSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/batteries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: (formState as any).model || null,
          volt: (formState as any).volt || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add product");
      }

      const result = (await response.json()) as { id?: number };
      const newProductId = result.id;

      // No image upload step for batteries

      setIsAddingProduct(false);
      if (imagePreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
      setSelectedImageFile(null);
      setImagePreviewUrl(null);
      showToast("Product added successfully", "success");
      router.refresh();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to add product";
      setErrorMessage(errorMsg);
      showToast(errorMsg, "error");
    } finally {
      setIsSaving(false);
    }
  }, [formState, selectedImageFile, imagePreviewUrl, uploadSelectedImage, showToast, router]);

  const handleAddToCart = useCallback((product: BatteryProduct) => {
    // Cast to any because CartProduct is based on ArduinoProduct shape
    addToCart({ ...(product as any), inventoryType: "battery" }, 1);
    showToast(
    `${product.model ?? `Product #${product.id}`} added to cart`,
      "success"
    );
    openCart();
  }, [addToCart, showToast, openCart]);

  const handleDelete = useCallback(async (product: BatteryProduct) => {
    if (!confirm(`Are you sure you want to delete "${product.model ?? `Product #${product.id}`}"? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    setDeletingProductId(product.id);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/batteries", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: product.id }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete product");
      }

      showToast("Product deleted successfully", "success");
      router.refresh();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to delete product";
      setErrorMessage(errorMsg);
      showToast(errorMsg, "error");
    } finally {
      setIsDeleting(false);
      setDeletingProductId(null);
    }
  }, [showToast, router]);

  return {
    // State
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
    // Refs
    fileInputRef,
    // Setters
    setIsSearching,
    setEditingProduct,
    setIsAddingProduct,
    // Handlers
    handleFormChange,
    handleImageSelect,
    handleDrop,
    handleDragOver,
    openFileDialog,
    handleEditSubmit,
    handleAddSubmit,
    handleAddToCart,
    handleDelete,
  };
}

