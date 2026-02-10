"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, Activity } from "react";
import Image from "next/image";
import { ShoppingCart, X, Plus, Minus, Trash2 } from "lucide-react";
import type { ArduinoProduct } from "@/lib/services/arduino";
import { useToast } from "./toast";

type InventoryType = "arduino" | "sound" | "solar" | "cable" | "battery" | "tv";

type CartProduct = ArduinoProduct & {
  inventoryType?: InventoryType;
};

type GenericInventoryProduct = {
  id: number;
  quantity?: number | string | null;
  price?: number | string | null;
  barcode?: string | null;
  english_name?: string | null;
  english_names?: string | null;
  name?: string | null;
  [key: string]: unknown;
};

export interface CartItem {
  product: CartProduct;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  isOpen: boolean;
  totalItems: number;
  totalPrice: number;
  addToCart: (product: CartProduct, quantity?: number) => void;
  removeFromCart: (productId: number, inventoryType?: InventoryType) => void;
  updateQuantity: (productId: number, quantity: number, inventoryType?: InventoryType) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}

const CART_STORAGE_KEY = "arduino_cart";
const DEFAULT_INVENTORY_TYPE: InventoryType = "arduino";

const INVENTORY_ENDPOINTS: Record<InventoryType, string> = {
  arduino: "/api/arduino",
  sound: "/api/sound",
  solar: "/api/solar",
  cable: "/api/mainSideLeds",
  battery: "/api/batteries",
  tv: "/api/tv-remotes",
};

const getInventoryType = (product?: CartProduct): InventoryType =>
  product?.inventoryType ?? DEFAULT_INVENTORY_TYPE;

const getProductKey = (productId: number, inventoryType: InventoryType) =>
  `${inventoryType}:${productId}`;

function loadCartFromStorage(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as CartItem[];
      if (Array.isArray(parsed)) {
        return parsed.map((item) => ({
          ...item,
          product: {
            ...item.product,
            inventoryType: getInventoryType(item.product),
          },
        }));
      }
    }
  } catch (error) {
    console.error("Failed to load cart from storage:", error);
  }
  return [];
}

function saveCartToStorage(items: CartItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.error("Failed to save cart to storage:", error);
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  // Use lazy initialization to load from localStorage
  const [items, setItems] = useState<CartItem[]>(() => loadCartFromStorage());
  const [isOpen, setIsOpen] = useState(false);

  // Save cart to localStorage whenever items change
  useEffect(() => {
    saveCartToStorage(items);
  }, [items]);

  const addToCart = useCallback((product: CartProduct, quantity: number = 1) => {
    const inventoryType = getInventoryType(product);
    setItems((prevItems) => {
      const targetKey = getProductKey(product.id, inventoryType);
      const existingItem = prevItems.find(
        (item) =>
          getProductKey(item.product.id, getInventoryType(item.product)) === targetKey
      );

      if (existingItem) {
        return prevItems.map((item) =>
          getProductKey(item.product.id, getInventoryType(item.product)) === targetKey
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }

      return [
        ...prevItems,
        { product: { ...product, inventoryType }, quantity },
      ];
    });
  }, []);

  const removeFromCart = useCallback((productId: number, inventoryType: InventoryType = DEFAULT_INVENTORY_TYPE) => {
    const targetKey = getProductKey(productId, inventoryType);
    setItems((prevItems) =>
      prevItems.filter(
        (item) =>
          getProductKey(item.product.id, getInventoryType(item.product)) !== targetKey
      )
    );
  }, []);

  const updateQuantity = useCallback(
    (productId: number, quantity: number, inventoryType: InventoryType = DEFAULT_INVENTORY_TYPE) => {
      if (quantity <= 0) {
        removeFromCart(productId, inventoryType);
        return;
      }
      const targetKey = getProductKey(productId, inventoryType);
      setItems((prevItems) =>
        prevItems.map((item) =>
          getProductKey(item.product.id, getInventoryType(item.product)) === targetKey
            ? { ...item, quantity }
            : item
        )
      );
    },
    [removeFromCart]
  );

  const clearCart = useCallback(() => {
    saveCartToStorage([]);
    setItems([]);
  }, []);

  const openCart = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeCart = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleCart = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce(
    (sum, item) => sum + (Number(item.product.price) || 0) * item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        items,
        isOpen,
        totalItems,
        totalPrice,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        openCart,
        closeCart,
        toggleCart,
      }}
    >
      {children}
      <CartSidebar />
    </CartContext.Provider>
  );
}

function CartSidebar() {
  const { items, isOpen, closeCart, removeFromCart, updateQuantity, totalItems, totalPrice, clearCart } = useCart();
  const { showToast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const usdFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });

  const handleRemove = (cartItem: CartItem) => {
    const inventoryType = getInventoryType(cartItem.product);
    removeFromCart(cartItem.product.id, inventoryType);
    const productName =
      cartItem.product.english_names ??
      cartItem.product.turkish_names ??
      `Product #${cartItem.product.id}`;
    showToast(`${productName} removed from cart`, "info");
  };

  const handleClearCart = () => {
    if (confirm("Are you sure you want to clear the cart?")) {
      clearCart();
      showToast("Cart cleared", "info");
    }
  };

  const fetchLatestInvoiceNumber = async () => {
    try {
      const res = await fetch('/api/invoices');
      const data = await res.json();
      if (Array.isArray(data.invoices) && data.invoices.length > 0) {
        const lastInvoice = data.invoices[0];
        const lastNumber = parseInt(lastInvoice.invoice_number, 10);
        if (!isNaN(lastNumber)) {
          return lastNumber;
        }
      }
      return 0;
    } catch (error) {
      console.error('Failed to fetch latest invoice number:', error);
      return 0;
    }
  };

  type VerifiedLineItem = {
    cartItem: CartItem;
    freshProduct: GenericInventoryProduct;
    inventoryType: InventoryType;
    unitPrice: number;
    lineTotal: number;
  };

  const parsePriceValue = (value: unknown): number => {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string") {
      const normalized = value.replace(",", ".");
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  };

  const resolveUnitPrice = (
    inventoryType: InventoryType,
    freshProduct: GenericInventoryProduct,
    cartItem: CartItem
  ) => {
    if (inventoryType === "solar") {
      return parsePriceValue(
        (freshProduct as GenericInventoryProduct & { selling_price?: number | string | null })
          .selling_price ?? cartItem.product.price ?? 0
      );
    }
    return parsePriceValue(freshProduct?.price ?? cartItem.product.price ?? 0);
  };

  const getProductDisplayName = (
    inventoryType: InventoryType,
    freshProduct: GenericInventoryProduct,
    cartItem: CartItem
  ) => {
    switch (inventoryType) {
      case "sound":
      case "cable":
        return (
          freshProduct?.english_name ??
          cartItem.product.english_names ??
          `Product #${cartItem.product.id}`
        );
      case "solar":
        return (
          freshProduct?.name ??
          cartItem.product.english_names ??
          `Product #${cartItem.product.id}`
        );
      case "tv":
        return (
          freshProduct?.name ??
          cartItem.product.english_names ??
          `Product #${cartItem.product.id}`
        );
      default:
        return (
          freshProduct?.english_names ??
          cartItem.product.english_names ??
          `Product #${cartItem.product.id}`
        );
    }
  };

  const buildUpdatePayload = (
    inventoryType: InventoryType,
    freshProduct: GenericInventoryProduct,
    quantity: number
  ) => {
    switch (inventoryType) {
      case "sound":
        return {
          id: freshProduct.id,
          english_name: freshProduct.english_name ?? null,
          turkish_name: freshProduct.turkish_name ?? null,
          barcode: freshProduct.barcode ?? null,
          kodu: freshProduct.kodu ?? null,
          price: freshProduct.price ?? null,
          image_filename: freshProduct.image_filename ?? null,
          category: freshProduct.category ?? null,
          sub_category: freshProduct.sub_category ?? null,
          quantity,
          description: freshProduct.description ?? null,
        };
      case "solar":
        return {
          id: freshProduct.id,
          name: freshProduct.name ?? null,
          rating: freshProduct.rating ?? null,
          factory_price: freshProduct.factory_price ?? null,
          wholesale_price: freshProduct.wholesale_price ?? null,
          min_selling_price: freshProduct.min_selling_price ?? null,
          selling_price: freshProduct.selling_price ?? null,
          factor: freshProduct.factor ?? null,
          cost_price: freshProduct.cost_price ?? null,
          image_filename: freshProduct.image_filename ?? null,
          category: freshProduct.category ?? null,
          quantity,
          description: freshProduct.description ?? null,
        };
      case "cable":
        return {
          id: freshProduct.id,
          english_name: freshProduct.english_name ?? null,
          turkish_name: freshProduct.turkish_name ?? null,
          category: freshProduct.category ?? null,
          barcode: freshProduct.barcode ?? null,
          price: freshProduct.price ?? null,
          image_filename: freshProduct.image_filename ?? null,
          quantity,
          description: freshProduct.description ?? null,
        };
      case "tv":
        return {
          id: freshProduct.id,
          name: freshProduct.name ?? null,
          brand: freshProduct.brand ?? null,
          category: freshProduct.category ?? null,
          description: freshProduct.description ?? null,
          specs: freshProduct.specs ?? {},
          image_filename: freshProduct.image_filename ?? null,
          quantity,
          price: freshProduct.price ?? null,
        };
      case "arduino":
      default:
        return {
          id: freshProduct.id,
          english_names: freshProduct.english_names ?? null,
          turkish_names: freshProduct.turkish_names ?? null,
          category: freshProduct.category ?? null,
          barcode: freshProduct.barcode ?? null,
          price: freshProduct.price ?? null,
          image_filename: freshProduct.image_filename ?? null,
          description: freshProduct.description ?? null,
          quantity,
        };
    }
  };

  const handleCheckout = async () => {
    if (items.length === 0) {
      showToast('Cart is empty', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      const groupedItems = items.reduce<Record<InventoryType, CartItem[]>>((acc, item) => {
        const type = getInventoryType(item.product);
        if (!acc[type]) {
          acc[type] = [];
        }
        acc[type]?.push(item);
        return acc;
      }, {} as Record<InventoryType, CartItem[]>);

      const verificationResults: VerifiedLineItem[] = [];
      let computedSubtotal = 0;

      for (const [inventoryType, grouped] of Object.entries(groupedItems) as [InventoryType, CartItem[]][]) {
        if (!grouped?.length) continue;

        const ids = Array.from(
          new Set(
            grouped
              .map((item) => item.product.id)
              .filter((id) => Number.isFinite(Number(id)))
          )
        );

        if (ids.length === 0) continue;

        const endpoint = INVENTORY_ENDPOINTS[inventoryType];
        const productsResponse = await fetch(`${endpoint}?ids=${ids.join(',')}`);

        if (!productsResponse.ok) {
          throw new Error(`Failed to fetch ${inventoryType} product data`);
        }

        const productsData = await productsResponse.json();
        const freshProducts = (
          Array.isArray(productsData.items)
            ? productsData.items
            : Array.isArray(productsData.products)
            ? productsData.products
            : []
        ) as GenericInventoryProduct[];
        const freshProductsMap = new Map<number, GenericInventoryProduct>(
          freshProducts.map((product) => [Number(product.id), product])
        );

        for (const item of grouped) {
          const freshProduct = freshProductsMap.get(item.product.id);
          if (!freshProduct) {
            showToast(
              `Product ${item.product.english_names ?? `#${item.product.id}`} not found in ${inventoryType} inventory`,
              'error'
            );
            setIsProcessing(false);
            return;
          }

          const currentStock = Number(freshProduct.quantity) || 0;
          const requestedQuantity = Number(item.quantity) || 0;

          if (currentStock < requestedQuantity) {
            showToast(
              `Not enough stock for ${getProductDisplayName(inventoryType, freshProduct, item)}. Available: ${currentStock}, Requested: ${requestedQuantity}`,
              'error'
            );
            setIsProcessing(false);
            return;
          }

          const unitPrice = resolveUnitPrice(inventoryType, freshProduct, item);
          const lineTotal = unitPrice * requestedQuantity;
          computedSubtotal += lineTotal;

          verificationResults.push({
            cartItem: item,
            freshProduct,
            inventoryType,
            unitPrice,
            lineTotal,
          });
        }
      }

      for (const line of verificationResults) {
        const { freshProduct, cartItem, inventoryType } = line;
        const endpoint = INVENTORY_ENDPOINTS[inventoryType];
        const currentStock = Number(freshProduct.quantity) || 0;
        const requestedQuantity = Number(cartItem.quantity) || 0;
        const newQuantity = Math.max(0, currentStock - requestedQuantity);

        const updatedProduct = buildUpdatePayload(inventoryType, freshProduct, newQuantity);

        const updateResponse = await fetch(endpoint, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedProduct),
        });

        if (!updateResponse.ok) {
          throw new Error(
            `Failed to update stock for ${getProductDisplayName(inventoryType, freshProduct, cartItem)}`
          );
        }
      }

      const latestInvoiceNumber = await fetchLatestInvoiceNumber();
      const newInvoiceNumber = latestInvoiceNumber + 1;

      const invoiceData = {
        invoiceNumber: String(newInvoiceNumber),
        date: new Date().toISOString(),
        products: verificationResults.map((line) => ({
          productId: line.cartItem.product.id,
          name: getProductDisplayName(line.inventoryType, line.freshProduct, line.cartItem),
          barcode:
            line.cartItem.product.barcode ??
            line.freshProduct?.barcode ??
            '',
          quantity: line.cartItem.quantity,
          unitPrice: line.unitPrice,
          total: line.lineTotal,
        })),
        subtotal: computedSubtotal,
        total: computedSubtotal,
      };

      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceData),
      });

      if (!response.ok) {
        throw new Error('Failed to create invoice');
      }

      const result = await response.json();
      showToast('Invoice created successfully!', 'success');
      clearCart();
      closeCart();
      
      if (result.invoiceId) {
        window.location.href = `/invoices/${result.invoiceId}`;
      }
    } catch (error) {
      console.error('Checkout error:', error);
      showToast('Error processing checkout. Please try again.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Activity mode={isOpen ? "visible" : "hidden"}>
        {/* Backdrop */}
        <div
          className="fixed inset-0 z-90 bg-background/80 backdrop-blur-sm transition-opacity"
          onClick={closeCart}
          aria-hidden="true"
        />

        {/* Sidebar */}
        <aside
          className="fixed right-0 top-0 z-100 h-full w-full max-w-md transform border-l border-border/60 bg-card shadow-2xl transition-transform duration-300 ease-out translate-x-0"
        >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/60 p-6">
            <div className="flex items-center gap-3">
              <ShoppingCart className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">
                Shopping Cart
              </h2>
              {totalItems > 0 && (
                <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
                  {totalItems}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={closeCart}
              className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              aria-label="Close cart"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-6">
            {items.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                <ShoppingCart className="h-16 w-16 text-muted-foreground/40" />
                <div className="flex flex-col gap-2">
                  <p className="text-lg font-semibold text-foreground">Your cart is empty</p>
                  <p className="text-sm text-muted-foreground">
                    Add products to your cart to see them here
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {items.map((item) => {
                  const price = Number(item.product.price) || 0;
                  const itemTotal = price * item.quantity;

                  return (
                    <div
                      key={item.product.id}
                      className="flex gap-4 rounded-2xl border border-border/60 bg-muted/40 p-4"
                    >
                      {/* Product Image */}
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted">
                        {item.product.image_filename ? (
                          <Image
                            src={item.product.image_filename}
                            alt={item.product.english_names ?? "Product"}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                            No image
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex flex-1 flex-col gap-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <h3 className="text-sm font-semibold text-foreground line-clamp-2">
                              {item.product.english_names ?? `Product #${item.product.id}`}
                            </h3>
                            {item.product.turkish_names && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {item.product.turkish_names}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemove(item)}
                            className="shrink-0 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-2"
                            aria-label="Remove item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-background">
                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(
                                  item.product.id,
                                  item.quantity - 1,
                                  getInventoryType(item.product)
                                )
                              }
                              className="rounded-l-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="min-w-8 text-center text-sm font-semibold text-foreground">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(
                                  item.product.id,
                                  item.quantity + 1,
                                  getInventoryType(item.product)
                                )
                              }
                              className="rounded-r-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                              aria-label="Increase quantity"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                          <span className="text-sm font-semibold text-foreground">
                            {usdFormatter.format(itemTotal)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="border-t border-border/60 p-6">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-lg font-semibold text-foreground">Total</span>
                <span className="text-2xl font-bold text-primary">
                  {usdFormatter.format(totalPrice)}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleClearCart}
                  className="rounded-2xl border border-border/60 bg-muted/60 px-4 py-2 text-sm font-semibold text-foreground transition hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                >
                  Clear Cart
                </button>
                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={isProcessing}
                  className="rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isProcessing ? 'Processing...' : 'Checkout'}
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>
      </Activity>
    </>
  );
}

export function CartButton() {
  const { totalItems, toggleCart } = useCart();
  const [isMounted, setIsMounted] = useState(false);

  // Only show badge after client-side hydration to avoid hydration mismatch
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setIsMounted(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <button
      type="button"
      onClick={toggleCart}
      className="relative rounded-full border border-border/60 bg-muted/60 p-2.5 text-muted-foreground transition hover:border-foreground/40 hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      aria-label="Open shopping cart"
    >
      <ShoppingCart className="h-5 w-5" />
      {isMounted && totalItems > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
          {totalItems > 99 ? "99+" : totalItems}
        </span>
      )}
    </button>
  );
}
