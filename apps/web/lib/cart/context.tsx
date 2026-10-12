"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as cartApi from "@/lib/api/cart";
import { messageForError } from "@/lib/api/errors";
import { getCartSession } from "@/lib/cart/session";
import { useAuth, type AuthStatus } from "@/lib/auth/context";
import type { CartIssue, CartView } from "@/lib/types/api";

interface CartContextValue {
  cart: CartView | null;
  /** Total quantity across every line (drives the header badge). */
  itemCount: number;
  loading: boolean;
  error: string | null;
  /** Corrections surfaced by the last validation (stale lines, price changes). */
  issues: CartIssue[];
  refresh: () => Promise<void>;
  /** Revalidate server-side and surface any corrections to the shopper. */
  validate: () => Promise<void>;
  addItem: (input: cartApi.AddCartItemInput) => Promise<CartView>;
  updateItem: (itemId: string, qty: number) => Promise<CartView>;
  removeItem: (itemId: string) => Promise<CartView>;
  clear: () => Promise<CartView>;
  /** Adopt a server cart response without an extra round-trip. */
  setCart: (cart: CartView) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const [cart, setCart] = useState<CartView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<CartIssue[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCart(await cartApi.getCart());
    } catch (caught) {
      setError(messageForError(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  const validate = useCallback(async () => {
    try {
      const result = await cartApi.validateCart();
      setCart(result.cart);
      setIssues(result.issues);
    } catch (caught) {
      setError(messageForError(caught));
    }
  }, []);

  // Load once auth is resolved, and merge a guest cart right after a login.
  const previousStatus = useRef<AuthStatus | null>(null);
  useEffect(() => {
    const previous = previousStatus.current;
    previousStatus.current = status;
    if (status === "loading") return;

    if (status === "authenticated" && previous === "anonymous") {
      const session = getCartSession();
      if (session) {
        // Loading already starts true; resolve it when the merge settles.
        void cartApi
          .mergeCart(session)
          .then((merged) => setCart(merged))
          .catch((caught) => setError(messageForError(caught)))
          .finally(() => setLoading(false));
        return;
      }
    }
    void refresh();
  }, [status, refresh]);

  const addItem = useCallback(async (input: cartApi.AddCartItemInput) => {
    const next = await cartApi.addCartItem(input);
    setCart(next);
    setIssues([]);
    return next;
  }, []);

  const updateItem = useCallback(async (itemId: string, qty: number) => {
    const next = await cartApi.updateCartItem(itemId, qty);
    setCart(next);
    setIssues([]);
    return next;
  }, []);

  const removeItem = useCallback(async (itemId: string) => {
    const next = await cartApi.removeCartItem(itemId);
    setCart(next);
    setIssues([]);
    return next;
  }, []);

  const clear = useCallback(async () => {
    const next = await cartApi.clearCart();
    setCart(next);
    setIssues([]);
    return next;
  }, []);

  const setCartValue = useCallback((next: CartView) => setCart(next), []);

  const value = useMemo<CartContextValue>(() => {
    const itemCount = cart?.items.reduce((sum, item) => sum + item.qty, 0) ?? 0;
    return {
      cart,
      itemCount,
      loading,
      error,
      issues,
      refresh,
      validate,
      addItem,
      updateItem,
      removeItem,
      clear,
      setCart: setCartValue,
    };
  }, [cart, loading, error, issues, refresh, validate, addItem, updateItem, removeItem, clear, setCartValue]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within <CartProvider>");
  return ctx;
}
