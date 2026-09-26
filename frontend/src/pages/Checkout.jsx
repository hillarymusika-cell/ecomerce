import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CreditCard, Banknote, ShoppingBag } from "lucide-react";
import { useCart } from "../context/CartContext";
import { createOrder, initiatePayment, confirmPayment } from "../api/orderApi";
import EmptyState from "../components/EmptyState";
import { getErrorMessage } from "../utils/errors";

function loadFlutterwave() {
  return new Promise((resolve, reject) => {
    if (window.FlutterwaveCheckout) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = "https://checkout.flutterwave.com/v3.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Could not load Flutterwave."));
    document.body.appendChild(s);
  });
}

export default function Checkout() {
  const { cart, clear } = useCart();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    address: "",
    city: "",
    country: "",
    notes: "",
  });
  const [method, setMethod] = useState("card");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const payWithCard = async (order) => {
    const { data: pay } = await initiatePayment(order.id, {
      redirect_url: `${window.location.origin}/orders/${order.id}`,
    });

    if (pay.demo_mode || !pay.public_key) {
      await confirmPayment(order.id, {
        reference: pay.reference,
        demo: true,
      });
      return;
    }

    await loadFlutterwave();

    await new Promise((resolve, reject) => {
      window.FlutterwaveCheckout({
        public_key: pay.public_key,
        tx_ref: pay.reference,
        amount: Number(pay.amount),
        currency: pay.currency || "USD",
        payment_options: "card",
        customer: {
          email: pay.customer?.email,
          name: pay.customer?.name,
        },
        customizations: {
          title: "Adams Collection",
          description: `Order ${pay.order_number}`,
        },
        callback: async (response) => {
          try {
            await confirmPayment(order.id, {
              reference: pay.reference,
              provider_payment_id: String(response?.transaction_id || ""),
            });
            resolve(response);
          } catch (err) {
            reject(err);
          }
        },
        onclose: () => resolve(null),
      });
    });
  };

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
      const { data: order } = await createOrder({
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
        payment_method: method,
      });

      try {
        await clear();
      } catch {
        /* best-effort */
      }

      if (method === "card") {
        try {
          await payWithCard(order);
        } catch (payErr) {
          setError(
            getErrorMessage(
              payErr,
              "Order created but payment was not completed. You can pay from the order page."
            )
          );
          navigate(`/orders/${order.id}`);
          return;
        }
      }

      navigate(`/orders/${order.id}`);
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
          icon={<ShoppingBag size={22} />}
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

        <h2 className="checkout-subhead">Shipping</h2>
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
            rows="3"
            value={form.notes}
            onChange={change}
            disabled={busy}
          />
        </label>

        <h2 className="checkout-subhead">Payment method</h2>
        <div className="pay-method-grid" role="radiogroup" aria-label="Payment method">
          <button
            type="button"
            className={`pay-method-card${method === "card" ? " active" : ""}`}
            onClick={() => setMethod("card")}
            disabled={busy}
            aria-pressed={method === "card"}
          >
            <CreditCard size={22} />
            <strong>Card</strong>
            <span>Pay securely with debit / credit card</span>
          </button>
          <button
            type="button"
            className={`pay-method-card${method === "cod" ? " active" : ""}`}
            onClick={() => setMethod("cod")}
            disabled={busy}
            aria-pressed={method === "cod"}
          >
            <Banknote size={22} />
            <strong>Cash on delivery</strong>
            <span>Pay when your order arrives</span>
          </button>
        </div>

        <div className="checkout-total">
          <span>Order total</span>
          <strong>{Number(cart.total || 0).toLocaleString()}</strong>
        </div>

        <button
          className="button full"
          disabled={busy || !cart.items?.length}
          aria-busy={busy}
        >
          {busy
            ? method === "card"
              ? "Processing…"
              : "Creating order…"
            : method === "card"
              ? "Place order & pay with card"
              : "Place order (pay on delivery)"}
        </button>
        <p style={{ marginTop: 12, textAlign: "center" }}>
          <Link to="/cart">← Back to cart</Link>
        </p>
      </form>
    </section>
  );
}
