"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { CableProduct } from "@/lib/services/cable";
import { useToast } from "@/components/ui/toast";
import { useCart } from "@/components/ui/cart";

export function useCableInventory() {
  // State management
  const [isSearching, setIsSearching] = useState(false);
  const [editingProduct, setEditingProduct] = useState<CableProduct | null>(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [formState, setFormState] = useState({
    id: 0,
    english_name: "",
    turkish_name: "",
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

  // Dependencies
  const router = useRouter();
  const { showToast } = useToast();
  const { addToCart, openCart } = useCart();

  // Initialize form state when editing or adding
  useEffect(() => {
    if (editingProduct) {
      setFormState({
        id: editingProduct.id,
        english_name: editingProduct.english_name ?? "",
        turkish_name: editingProduct.turkish_name ?? "",
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
        english_name: "",
        turkish_name: "",
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

      const response = await fetch("/api/mainSideLeds/upload", {
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
    let imageFilename = formState.image_filename || null;
    try {
      if (selectedImageFile) {
        const uploadedUrl = await uploadSelectedImage(formState.id);
        if (uploadedUrl) {
          imageFilename = uploadedUrl;
        }
      }

      const response = await fetch("/api/mainSideLeds", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: formState.id,
          english_name: formState.english_name || null,
          turkish_name: formState.turkish_name || null,
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
      const response = await fetch("/api/mainSideLeds", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          english_name: formState.english_name || null,
          turkish_name: formState.turkish_name || null,
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
          await fetch("/api/mainSideLeds", {
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

  const handleAddToCart = useCallback((product: CableProduct) => {
    // Convert CableProduct to cart format (using ArduinoProduct structure for cart compatibility)
    const cartProduct = {
      id: product.id,
      english_names: product.english_name,
      turkish_names: product.turkish_name,
      category: product.category,
      barcode: product.barcode,
      quantity: product.quantity,
      price: product.price,
      image_filename: product.image_filename,
      description: product.description,
    };
    addToCart(cartProduct, 1);
    showToast(
      `${product.english_name ?? `Product #${product.id}`} added to cart`,
      "success"
    );
    openCart();
  }, [addToCart, showToast, openCart]);

  const handleDelete = useCallback(async (product: CableProduct) => {
    if (!confirm(`Are you sure you want to delete "${product.english_name ?? `Product #${product.id}`}"? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    setDeletingProductId(product.id);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/mainSideLeds", {
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

