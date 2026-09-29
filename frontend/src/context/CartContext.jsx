import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  addToCart,
  clearCart,
  getCart,
  removeCartItem,
  updateCartItem,
} from "../api/cartApi";
import { useAuth } from "./AuthContext";
import { DEFAULT_CURRENCY } from "../utils/money";

const emptyCart = {
  items: [],
  total: 0,
  item_count: 0,
  currency: DEFAULT_CURRENCY,
};

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [cart, setCart] = useState(emptyCart);
  const [loading, setLoading] = useState(false);
  const [pendingIds, setPendingIds] = useState(() => new Set());

  const setPending = (id, on) => {
    setPendingIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const applyCart = (data) => {
    if (data && typeof data === "object" && Array.isArray(data.items)) {
      setCart({
        ...data,
        currency: data.currency || DEFAULT_CURRENCY,
        item_count:
          data.item_count ??
          data.items.reduce((s, i) => s + Number(i.quantity || 0), 0),
      });
      return true;
    }
    return false;
  };

  const refreshCart = useCallback(async () => {
    if (!isAuthenticated) {
      setCart(emptyCart);
      return;
    }
    setLoading(true);
    try {
      const { data } = await getCart();
      applyCart(data);
    } catch {
      setCart(emptyCart);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const add = async (productId, quantity = 1) => {
    const key = `add-${productId}`;
    setPending(key, true);
    try {
      const { data } = await addToCart(productId, quantity);
      if (!applyCart(data)) await refreshCart();
      return data;
    } finally {
      setPending(key, false);
    }
  };

  const update = async (id, quantity) => {
    setPending(id, true);
    try {
      const { data } = await updateCartItem(id, quantity);
      if (!applyCart(data)) await refreshCart();
      return data;
    } finally {
      setPending(id, false);
    }
  };

  const remove = async (id) => {
    setPending(id, true);
    try {
      const { data } = await removeCartItem(id);
      if (!applyCart(data)) await refreshCart();
      return data;
    } finally {
      setPending(id, false);
    }
  };

  const clear = async () => {
    setPending("clear", true);
    try {
      const { data } = await clearCart();
      if (!applyCart(data)) await refreshCart();
      return data;
    } finally {
      setPending("clear", false);
    }
  };

  const count =
    cart.item_count ??
    cart.items?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) ??
    0;

  const isPending = (id) => pendingIds.has(id);

  return (
    <CartContext.Provider
      value={{
        cart,
        count,
        loading,
        refreshCart,
        add,
        update,
        remove,
        clear,
        isPending,
        pendingIds,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
