import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  addToCart,
  clearCart,
  getCart,
  removeCartItem,
  updateCartItem,
} from "../api/cartApi";
import { useAuth } from "./AuthContext";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [cart, setCart] = useState({ items: [], total: 0 });
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

  const refreshCart = useCallback(async () => {
    if (!isAuthenticated) {
      setCart({ items: [], total: 0 });
      return;
    }
    setLoading(true);
    try {
      const { data } = await getCart();
      setCart(data);
    } catch {
      setCart({ items: [], total: 0 });
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
      await addToCart(productId, quantity);
      await refreshCart();
    } finally {
      setPending(key, false);
    }
  };

  const update = async (id, quantity) => {
    setPending(id, true);
    try {
      await updateCartItem(id, quantity);
      await refreshCart();
    } finally {
      setPending(id, false);
    }
  };

  const remove = async (id) => {
    setPending(id, true);
    try {
      await removeCartItem(id);
      await refreshCart();
    } finally {
      setPending(id, false);
    }
  };

  const clear = async () => {
    setPending("clear", true);
    try {
      await clearCart();
      await refreshCart();
    } finally {
      setPending("clear", false);
    }
  };

  const count =
    cart.items?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 0;

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
