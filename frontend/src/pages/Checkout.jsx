import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createOrder } from "../api/orderApi";
import { useCart } from "../context/CartContext";

export default function Checkout() {
  const { cart } = useCart();
  const navigate = useNavigate();
  const [form, setForm] = useState({ address: "", city: "", country: "", notes: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { data } = await createOrder({
        shipping_address: { address: form.address, city: form.city, country: form.country },
        billing_address: { address: form.address, city: form.city, country: form.country },
        notes: form.notes
      });
      navigate(`/orders/${data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || "Unable to create order.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="section container narrow">
      <span className="eyebrow">CHECKOUT</span><h1>Complete your order</h1>
      <form className="form-card" onSubmit={submit}>
        {error && <div className="alert">{error}</div>}
        <label>Address<input name="address" required value={form.address} onChange={change} /></label>
        <div className="two"><label>City<input name="city" required value={form.city} onChange={change} /></label><label>Country<input name="country" required value={form.country} onChange={change} /></label></div>
        <label>Notes<textarea name="notes" rows="4" value={form.notes} onChange={change} /></label>
        <div className="checkout-total"><span>Order total</span><strong>{Number(cart.total || 0).toLocaleString()}</strong></div>
        <button className="button full" disabled={busy || !cart.items?.length}>{busy ? "Creating order..." : "Place order"}</button>
      </form>
    </section>
  );
}