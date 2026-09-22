import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";

export default function Cart() {
  const { cart, update, remove, clear } = useCart();
  const navigate = useNavigate();

  return (
    <section className="section container">
      <div className="section-heading"><div><span className="eyebrow">SHOPPING</span><h1>Your cart</h1></div>{cart.items?.length > 0 && <button className="button ghost" onClick={clear}>Clear cart</button>}</div>
      {!cart.items?.length ? (
        <div className="empty"><h2>Your cart is empty</h2><p>Add products before checking out.</p><Link className="button" to="/products">Browse products</Link></div>
      ) : (
        <div className="cart-layout">
          <div className="cart-list">
            {cart.items.map((item) => (
              <div className="cart-item" key={item.id}>
                <div><h3>{item.product_name || item.product?.name || "Product"}</h3><span>Unit price: {Number(item.product?.price || item.unit_price || 0).toLocaleString()}</span></div>
                <div className="quantity"><button onClick={() => update(item.id, Math.max(1, item.quantity - 1))}>−</button><span>{item.quantity}</span><button onClick={() => update(item.id, item.quantity + 1)}>+</button></div>
                <strong>{Number(item.subtotal || 0).toLocaleString()}</strong>
                <button className="remove" onClick={() => remove(item.id)}>Remove</button>
              </div>
            ))}
          </div>
          <aside className="summary"><h2>Summary</h2><div><span>Total</span><strong>{Number(cart.total || 0).toLocaleString()}</strong></div><button className="button full" onClick={() => navigate("/checkout")}>Checkout</button></aside>
        </div>
      )}
    </section>
  );
}