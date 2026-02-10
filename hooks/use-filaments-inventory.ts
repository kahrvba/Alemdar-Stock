"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { FilamentProduct } from "@/lib/services/filaments";
import { useToast } from "@/components/ui/toast";
import { useCart } from "@/components/ui/cart";

export function useFilamentsInventory() {
  const [isSearching, setIsSearching] = useState(false);
  const [editingProduct, setEditingProduct] = useState<FilamentProduct | null>(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [formState, setFormState] = useState({
    id: 0,
    name: "",
    brand: "",
    material: "",
    variant: "",
    color: "",
    net_weight_kg: "1",
    diameter_mm: "1.75",
    quantity: "0",
    price: "",
    image_filename: "",
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
  const { showToast } = useToast();
  const { addToCart, openCart } = useCart();

  useEffect(() => {
    if (editingProduct) {
      setFormState({
        id: editingProduct.id,
        name: editingProduct.name ?? "",
        brand: editingProduct.brand ?? "",
        material: editingProduct.material ?? "",
        variant: editingProduct.variant ?? "",
        color: editingProduct.color ?? "",
        net_weight_kg: String(editingProduct.net_weight_kg ?? 1),
        diameter_mm: String(editingProduct.diameter_mm ?? 1.75),
        quantity: editingProduct.quantity !== null && editingProduct.quantity !== undefined ? String(editingProduct.quantity) : "0",
        price: editingProduct.price ? String(editingProduct.price) : "",
        image_filename: editingProduct.image_filename ?? "",
      });
      setSelectedImageFile(null);
      setImagePreviewUrl(editingProduct.image_filename ?? null);
      setErrorMessage(null);
    } else if (isAddingProduct) {
      setFormState({
        id: 0,
        name: "",
        brand: "",
        material: "",
        variant: "",
        color: "",
        net_weight_kg: "1",
        diameter_mm: "1.75",
        quantity: "0",
        price: "",
        image_filename: "",
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

  const handleFormChange = useCallback((field: string, value: string | number) => {
    setFormState((previous) => ({
      ...previous,
      [field]: typeof value === "number" ? String(value) : value,
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

      const response = await fetch("/api/filaments/upload", {
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
    const productId = formState.id || editingProduct?.id;
    if (!productId) {
      const errorMsg = "Product ID is missing. Please try again.";
      setErrorMessage(errorMsg);
      showToast(errorMsg, "error");
      return;
    }
    setIsSaving(true);
    setErrorMessage(null);
    let imageFilename = formState.image_filename || null;
    try {
      if (selectedImageFile) {
        const uploadedUrl = await uploadSelectedImage(productId);
        if (uploadedUrl) {
          imageFilename = uploadedUrl;
        }
      }

      const response = await fetch("/api/filaments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: productId,
          name: formState.name || "",
          brand: formState.brand || "",
          material: formState.material || "",
          variant: formState.variant || null,
          color: formState.color || "",
          net_weight_kg: Number(formState.net_weight_kg) || 1,
          diameter_mm: Number(formState.diameter_mm) || 1.75,
          quantity: Number(formState.quantity) || 0,
          price: formState.price ? String(formState.price) : null,
          image_filename: imageFilename || null,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        const errorMsg = data.error || "Failed to update product";
        throw new Error(errorMsg);
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
  }, [formState, editingProduct, selectedImageFile, imagePreviewUrl, uploadSelectedImage, showToast, router]);

  const handleAddSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/filaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formState.name || null,
          brand: formState.brand || null,
          material: formState.material || null,
          variant: formState.variant || null,
          color: formState.color || null,
          net_weight_kg: Number(formState.net_weight_kg) || 1,
          diameter_mm: Number(formState.diameter_mm) || 1.75,
          quantity: Number(formState.quantity) || 0,
          price: formState.price ? String(formState.price) : null,
          image_filename: null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add product");
      }

      const result = (await response.json()) as { id?: number };
      const newProductId = result.id;

      if (selectedImageFile && newProductId) {
        const uploadedUrl = await uploadSelectedImage(newProductId);
        if (uploadedUrl) {
          await fetch("/api/filaments", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
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

  const handleDelete = useCallback(async (product: FilamentProduct) => {
    if (!confirm(`Are you sure you want to delete "${product.name ?? `Product #${product.id}`}"? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    setDeletingProductId(product.id);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/filaments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: product.id }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete product");
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

  const handleAddToCart = useCallback((product: FilamentProduct) => {
    const cartProduct = {
      id: product.id,
      english_names: product.name,
      turkish_names: null,
      barcode: null,
      category: product.material,
      quantity: product.quantity ?? 0,
      price: product.price ? String(product.price) : null,
      image_filename: product.image_filename,
      description: null,
      inventoryType: "filaments" as const,
    };
    addToCart(cartProduct, 1);
    showToast(`${product.name ?? `Product #${product.id}`} added to cart`, "success");
    openCart();
  }, [addToCart, showToast, openCart]);

  return {
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
  };
}
