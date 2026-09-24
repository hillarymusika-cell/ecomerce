import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { createOrder } from "../api/orderApi";
import EmptyState from "../components/EmptyState";
import { getErrorMessage } from "../utils/errors";

export default function Checkout() {
  const { cart, clear } = useCart();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    address: "",
    city: "",
    country: "",
    notes: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!cart.items?.length) {
      setError("Your cart is empty.");
      return;
    }
    if (!form.address.trim() || !form.city.trim() || !form.country.trim()) {
      setError("Address, city, and country are required.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { data } = await createOrder({
        shipping_address: {
          address: form.address.trim(),
          city: form.city.trim(),
          country: form.country.trim(),
        },
        billing_address: {
          address: form.address.trim(),
          city: form.city.trim(),
          country: form.country.trim(),
        },
        notes: form.notes.trim(),
      });
      try {
        await clear();
      } catch {
        /* cart clear is best-effort after successful order */
      }
      navigate(`/orders/${data.id}`);
    } catch (err) {
      setError(getErrorMessage(err, "Unable to create order."));
    } finally {
      setBusy(false);
    }
  };

  if (!cart.items?.length) {
    return (
      <section className="section container">
        <EmptyState
          icon="◎"
          title="Nothing to checkout"
          description="Add items to your cart first."
          actionLabel="Browse products"
          actionTo="/products"
        />
      </section>
    );
  }

  return (
    <section className="section container narrow">
      <span className="eyebrow">CHECKOUT</span>
      <h1>Complete your order</h1>
      <form className="form-card" onSubmit={submit} noValidate>
        {error && (
          <div className="alert" role="alert">
            {error}
          </div>
        )}
        <label>
          Address
          <input
            name="address"
            required
            autoComplete="street-address"
            value={form.address}
            onChange={change}
            disabled={busy}
          />
        </label>
        <div className="two">
          <label>
            City
            <input
              name="city"
              required
              autoComplete="address-level2"
              value={form.city}
              onChange={change}
              disabled={busy}
            />
          </label>
          <label>
            Country
            <input
              name="country"
              required
              autoComplete="country-name"
              value={form.country}
              onChange={change}
              disabled={busy}
            />
          </label>
        </div>
        <label>
          Notes
          <textarea
            name="notes"
            rows="4"
            value={form.notes}
            onChange={change}
            disabled={busy}
          />
        </label>
        <div className="checkout-total">
          <span>Order total</span>
          <strong>{Number(cart.total || 0).toLocaleString()}</strong>
        </div>
        <button
          className="button full"
          disabled={busy || !cart.items?.length}
          aria-busy={busy}
        >
          {busy ? "Creating order…" : "Place order"}
        </button>
        <p style={{ marginTop: 12, textAlign: "center" }}>
          <Link to="/cart">← Back to cart</Link>
        </p>
      </form>
    </section>
  );
}
