"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { SolarProduct } from "@/lib/services/solar";
import { useToast } from "@/components/ui/toast";
import { useCart } from "@/components/ui/cart";

export function useSolarInventory() {
  // State management
  const [isSearching, setIsSearching] = useState(false);
  const [editingProduct, setEditingProduct] = useState<SolarProduct | null>(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [formState, setFormState] = useState({
    id: 0,
    name: "",
    rating: "",
    category: "",
    quantity: 0,
    price: "",
    first_price: "",
    second_price: "",
    third_price: "",
    four_price: "",
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
        name: editingProduct.name ?? "",
        rating: editingProduct.rating ?? "",
        category: editingProduct.category ?? "",
        quantity: editingProduct.quantity ?? 0,
        price: editingProduct.price ? String(editingProduct.price) : "",
        first_price: editingProduct.first_price ? String(editingProduct.first_price) : "",
        second_price: editingProduct.second_price ? String(editingProduct.second_price) : "",
        third_price: editingProduct.third_price ? String(editingProduct.third_price) : "",
        four_price: editingProduct.four_price ? String(editingProduct.four_price) : "",
        image_filename: editingProduct.image_filename ?? "",
        description: editingProduct.description ?? "",
      });
      setSelectedImageFile(null);
      setImagePreviewUrl(editingProduct.image_filename ?? null);
      setErrorMessage(null);
    } else if (isAddingProduct) {
      setFormState({
        id: 0,
        name: "",
        rating: "",
        category: "",
        quantity: 0,
        price: "",
        first_price: "",
        second_price: "",
        third_price: "",
        four_price: "",
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

      const response = await fetch("/api/solar/upload", {
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

      const response = await fetch("/api/solar", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: productId,
          name: formState.name || "",
          rating: formState.rating || "",
          category: formState.category || "",
          quantity: Number(formState.quantity) || 0,
          price: formState.price ? String(formState.price) : "",
          first_price: formState.first_price ? String(formState.first_price) : null,
          second_price: formState.second_price ? String(formState.second_price) : null,
          third_price: formState.third_price ? String(formState.third_price) : null,
          four_price: formState.four_price ? String(formState.four_price) : null,
          image_filename: imageFilename || null,
          description: formState.description || "",
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
      console.error("Edit submit error:", error);
    } finally {
      setIsSaving(false);
    }
  }, [formState, editingProduct, selectedImageFile, imagePreviewUrl, uploadSelectedImage, showToast, router]);

  const handleAddSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/solar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formState.name || null,
          rating: formState.rating || null,
          category: formState.category || null,
          price: formState.price ? String(formState.price) : null,
          first_price: formState.first_price ? String(formState.first_price) : null,
          second_price: formState.second_price ? String(formState.second_price) : null,
          third_price: formState.third_price ? String(formState.third_price) : null,
          four_price: formState.four_price ? String(formState.four_price) : null,
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
          await fetch("/api/solar", {
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

  const handleAddToCart = useCallback((product: SolarProduct) => {
    // Convert SolarProduct to cart format (using ArduinoProduct structure for cart compatibility)
    const cartProduct = {
      id: product.id,
      english_names: product.name,
      turkish_names: null,
      category: product.category,
      barcode: null,
      quantity: product.quantity,
      price: product.price,
      image_filename: product.image_filename,
      description: product.description,
    };
    addToCart(cartProduct, 1);
    showToast(
      `${product.name ?? `Product #${product.id}`} added to cart`,
      "success"
    );
    openCart();
  }, [addToCart, showToast, openCart]);

  const handleDelete = useCallback(async (product: SolarProduct) => {
    if (!confirm(`Are you sure you want to delete "${product.name ?? `Product #${product.id}`}"? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    setDeletingProductId(product.id);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/solar", {
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

