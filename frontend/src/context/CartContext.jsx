import { createContext, useContext, useEffect, useState } from "react";
import { addToCart, clearCart, getCart, removeCartItem, updateCartItem } from "../api/cartApi";
import { useAuth } from "./AuthContext";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [cart, setCart] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);

  const refreshCart = async () => {
    if (!isAuthenticated) {
      setCart({ items: [], total: 0 });
      return;
    }
    setLoading(true);
    try {
      const { data } = await getCart();
      setCart(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshCart();
  }, [isAuthenticated]);

  const add = async (productId, quantity = 1) => {
    await addToCart(productId, quantity);
    await refreshCart();
  };

  const update = async (id, quantity) => {
    await updateCartItem(id, quantity);
    await refreshCart();
  };

  const remove = async (id) => {
    await removeCartItem(id);
    await refreshCart();
  };

  const clear = async () => {
    await clearCart();
    await refreshCart();
  };

  const count = cart.items?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 0;

  return (
    <CartContext.Provider value={{ cart, count, loading, refreshCart, add, update, remove, clear }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);