"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { MexxsunProduct } from "@/lib/services/mexxsun";
import type { ArduinoProduct } from "@/lib/services/arduino";
import { useToast } from "@/components/ui/toast";
import { useCart } from "@/components/ui/cart";

export function useMexxsunInventory() {
  // State management
  const [isSearching, setIsSearching] = useState(false);
  const [editingProduct, setEditingProduct] = useState<MexxsunProduct | null>(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [formState, setFormState] = useState({
    id: 0,
    name: "",
    rating: "",
    category: "",
    is_new: false,
    quantity: 0,
    factory_price: "",
    wholesale_price: "",
    min_selling_price: "",
    selling_price: "",
    factor: "",
    cost_price: "",
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
        is_new: Boolean(editingProduct.is_new),
        quantity: editingProduct.quantity ?? 0,
        factory_price: editingProduct.factory_price != null ? String(editingProduct.factory_price) : "",
        wholesale_price: editingProduct.wholesale_price != null ? String(editingProduct.wholesale_price) : "",
        min_selling_price: editingProduct.min_selling_price != null ? String(editingProduct.min_selling_price) : "",
        selling_price: editingProduct.selling_price != null ? String(editingProduct.selling_price) : "",
        factor: editingProduct.factor != null ? String(editingProduct.factor) : "",
        cost_price: editingProduct.cost_price != null ? String(editingProduct.cost_price) : "",
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
        is_new: false,
        quantity: 0,
        factory_price: "",
        wholesale_price: "",
        min_selling_price: "",
        selling_price: "",
        factor: "",
        cost_price: "",
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

  // Helper to safely parse numeric strings (supports comma or dot)
  const parseNumericInput = (input: string | number | null | undefined): number | null => {
    if (input === null || input === undefined) return null;
    if (typeof input === "number") {
      return Number.isFinite(input) ? input : null;
    }
    const normalized = input.replace(",", ".").trim();
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  };

  // Handler functions
  const handleFormChange = useCallback((field: string, value: string | number | boolean) => {
    setFormState((previous) => {
      const next = {
        ...previous,
        [field]: value,
      };

      // Automatically compute cost_price = factory_price * factor
      // and the derived selling prices from cost_price
      if (field === "factory_price" || field === "factor") {
        const factoryValue =
          field === "factory_price" ? value : next.factory_price;
        const factorValue = field === "factor" ? value : next.factor;

        const factoryNumber = parseNumericInput(factoryValue as string | number);
        const factorNumber = parseNumericInput(factorValue as string | number);

        if (factoryNumber !== null && factorNumber !== null) {
          const costPrice = factoryNumber * factorNumber; // base cost
          const roundedCost = Number(costPrice.toFixed(2));
          next.cost_price = roundedCost.toFixed(2);

          // Toptan price: cost_price * 1.8
          const wholesale = roundedCost * 1.8;
          next.wholesale_price = wholesale.toFixed(2);

          // Min selling price (boss not around): cost_price * 1.9
          const minSelling = roundedCost * 1.9;
          next.min_selling_price = minSelling.toFixed(2);

          // Müşteri price (normal): cost_price * 2.0
          const selling = roundedCost * 2.0;
          next.selling_price = selling.toFixed(2);
        } else {
          next.cost_price = "";
          // If base values are invalid, clear the derived prices too
          next.wholesale_price = "";
          next.min_selling_price = "";
          next.selling_price = "";
        }
      }

      return next;
    });
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

      const response = await fetch("/api/mexxsun/upload", {
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
    const normalizedName = formState.name.trim();
    if (!productId) {
      const errorMsg = "Product ID is missing. Please try again.";
      setErrorMessage(errorMsg);
      showToast(errorMsg, "error");
      return;
    }
    if (!normalizedName) {
      const errorMsg = "Name is required";
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

      const response = await fetch("/api/mexxsun", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: productId,
          name: normalizedName,
          rating: formState.rating || "",
          category: formState.category || "",
          quantity: Number(formState.quantity) || 0,
          factory_price: formState.factory_price ? String(formState.factory_price) : null,
          wholesale_price: formState.wholesale_price ? String(formState.wholesale_price) : null,
          min_selling_price: formState.min_selling_price ? String(formState.min_selling_price) : null,
          selling_price: formState.selling_price ? String(formState.selling_price) : null,
          factor: formState.factor ? String(formState.factor) : null,
          cost_price: formState.cost_price ? String(formState.cost_price) : null,
          image_filename: imageFilename || null,
          description: formState.description || "",
          is_new: Boolean(formState.is_new),
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
    const normalizedName = formState.name.trim();
    if (!normalizedName) {
      const errorMsg = "Name is required";
      setErrorMessage(errorMsg);
      showToast(errorMsg, "error");
      return;
    }
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/mexxsun", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: normalizedName,
          rating: formState.rating || null,
          category: formState.category || null,
          quantity: Number(formState.quantity) || 0,
          factory_price: formState.factory_price ? String(formState.factory_price) : null,
          wholesale_price: formState.wholesale_price ? String(formState.wholesale_price) : null,
          min_selling_price: formState.min_selling_price ? String(formState.min_selling_price) : null,
          selling_price: formState.selling_price ? String(formState.selling_price) : null,
          factor: formState.factor ? String(formState.factor) : null,
          cost_price: formState.cost_price ? String(formState.cost_price) : null,
          image_filename: null,
          description: formState.description || null,
          is_new: Boolean(formState.is_new),
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
          await fetch("/api/mexxsun", {
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

  const handleAddToCart = useCallback((product: MexxsunProduct) => {
    // Convert MexxsunProduct to cart format (using ArduinoProduct structure for cart compatibility)
    const price: string | null =
      product.selling_price !== null && product.selling_price !== undefined
        ? String(product.selling_price)
        : null;

    const cartProduct: ArduinoProduct & { inventoryType: "mexxsun" } = {
      id: product.id,
      english_names: product.name ?? null,
      turkish_names: null,
      category: product.category ?? null,
      barcode: null,
      quantity: product.quantity ?? null,
      price,
      image_filename: product.image_filename ?? null,
      description: product.description ?? null,
      inventoryType: "mexxsun",
    };

    addToCart(cartProduct, 1);
    showToast(
      `${product.name ?? `Product #${product.id}`} added to cart`,
      "success"
    );
    openCart();
  }, [addToCart, showToast, openCart]);

  const handleDelete = useCallback(async (product: MexxsunProduct) => {
    if (!confirm(`Are you sure you want to delete "${product.name ?? `Product #${product.id}`}"? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    setDeletingProductId(product.id);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/mexxsun", {
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
