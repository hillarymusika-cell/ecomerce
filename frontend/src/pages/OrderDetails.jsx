import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getOrder, initiatePayment, confirmPayment } from "../api/orderApi";
import Loading from "../components/Loading";
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

export default function OrderDetails() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);

  const load = () =>
    getOrder(id)
      .then(({ data }) => setOrder(data))
      .catch((err) => setError(getErrorMessage(err, "Order not found.")));

  useEffect(() => {
    load();
  }, [id]);

  const payNow = async () => {
    if (!order) return;
    setPaying(true);
    setError("");
    try {
      const { data: pay } = await initiatePayment(order.id, {
        redirect_url: `${window.location.origin}/orders/${order.id}`,
      });

      if (pay.demo_mode || !pay.public_key) {
        await confirmPayment(order.id, {
          reference: pay.reference,
          demo: true,
        });
        await load();
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
              await load();
              resolve(response);
            } catch (err) {
              reject(err);
            }
          },
          onclose: () => resolve(null),
        });
      });
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Payment failed."));
    } finally {
      setPaying(false);
    }
  };

  if (error && !order) {
    return (
      <section className="section container">
        <div className="alert">{error}</div>
        <Link to="/orders">← Orders</Link>
      </section>
    );
  }

  if (!order) return <Loading />;

  return (
    <section className="section container">
      <Link className="back" to="/orders">
        ← Orders
      </Link>
      <div className="order-header">
        <div>
          <span className="eyebrow">ORDER</span>
          <h1>#{order.order_number}</h1>
        </div>
        <span className={`status ${order.status}`}>{order.status}</span>
      </div>

      {error && <div className="alert">{error}</div>}

      <div className="order-detail">
        <div className="order-items">
          {order.items?.map((item) => (
            <div className="order-line" key={item.id}>
              <span>
                {item.product_name} × {item.quantity}
              </span>
              <strong>
                {order.currency}{" "}
                {Number(item.total_price).toLocaleString()}
              </strong>
            </div>
          ))}
        </div>
        <div className="summary">
          <div>
            <span>Subtotal</span>
            <strong>{Number(order.subtotal).toLocaleString()}</strong>
          </div>
          <div>
            <span>Shipping</span>
            <strong>
              {Number(order.shipping_cost || order.shipping_amount || 0).toLocaleString()}
            </strong>
          </div>
          <div>
            <span>Total</span>
            <strong>
              {order.currency} {Number(order.total).toLocaleString()}
            </strong>
          </div>

          {order.status === "pending" && (
            <button
              type="button"
              className="button full"
              style={{ marginTop: 16 }}
              disabled={paying}
              onClick={payNow}
            >
              {paying ? "Processing…" : "Pay with card"}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
