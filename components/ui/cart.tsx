"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, Activity } from "react";
import Image from "next/image";
import { ShoppingCart, X, Plus, Minus, Trash2 } from "lucide-react";
import type { ArduinoProduct } from "@/lib/services/arduino";
import { cn } from "@/lib/utils";
import { useToast } from "./toast";

export interface CartItem {
  product: ArduinoProduct;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  isOpen: boolean;
  totalItems: number;
  totalPrice: number;
  addToCart: (product: ArduinoProduct, quantity?: number) => void;
  removeFromCart: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
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

function loadCartFromStorage(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as CartItem[];
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

  const addToCart = useCallback((product: ArduinoProduct, quantity: number = 1) => {
    setItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.product.id === product.id);
      
      if (existingItem) {
        // Update quantity if item already exists
        return prevItems.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        // Add new item
        return [...prevItems, { product, quantity }];
      }
    });
  }, []);

  const removeFromCart = useCallback((productId: number) => {
    setItems((prevItems) => prevItems.filter((item) => item.product.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  }, [removeFromCart]);

  const clearCart = useCallback(() => {
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
  const usdFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });

  const handleRemove = (productId: number, productName: string) => {
    removeFromCart(productId);
    showToast(`${productName} removed from cart`, "info");
  };

  const handleClearCart = () => {
    if (confirm("Are you sure you want to clear the cart?")) {
      clearCart();
      showToast("Cart cleared", "info");
    }
  };

  return (
    <>
      <Activity mode={isOpen ? "visible" : "hidden"}>
        {/* Backdrop */}
        <div
          className="fixed inset-0 z-[90] bg-background/80 backdrop-blur-sm transition-opacity"
          onClick={closeCart}
          aria-hidden="true"
        />

        {/* Sidebar */}
        <aside
          className="fixed right-0 top-0 z-[100] h-full w-full max-w-md transform border-l border-border/60 bg-card shadow-2xl transition-transform duration-300 ease-out translate-x-0"
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
                            onClick={() =>
                              handleRemove(
                                item.product.id,
                                item.product.english_names ?? `Product #${item.product.id}`
                              )
                            }
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
                              onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
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
                              onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
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
                  className="rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                >
                  Checkout
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
    setIsMounted(true);
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

