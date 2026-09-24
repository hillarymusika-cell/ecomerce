import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useToast } from "../components/Toast";
import ImageWithFallback from "../components/ImageWithFallback";
import EmptyState from "../components/EmptyState";
import Loading from "../components/Loading";
import { getErrorMessage } from "../utils/errors";

const apiBase = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function thumb(item) {
  const url =
    item.product?.primary_image_url ||
    item.primary_image_url ||
    item.image ||
    null;
  if (!url) return null;
  return url.startsWith("http") ? url : `${apiBase}${url}`;
}

export default function Cart() {
  const { cart, update, remove, clear, loading, isPending } = useCart();
  const navigate = useNavigate();
  const toast = useToast();

  const handleUpdate = async (id, qty) => {
    try {
      await update(id, qty);
    } catch (err) {
      toast(getErrorMessage(err, "Could not update quantity"), "error");
    }
  };

  const handleRemove = async (id) => {
    try {
      await remove(id);
      toast("Item removed", "success");
    } catch (err) {
      toast(getErrorMessage(err, "Could not remove item"), "error");
    }
  };

  const handleClear = async () => {
    if (!window.confirm("Clear all items from your cart?")) return;
    try {
      await clear();
      toast("Cart cleared", "success");
    } catch (err) {
      toast(getErrorMessage(err, "Could not clear cart"), "error");
    }
  };

  if (loading && !cart.items?.length) {
    return (
      <section className="section container">
        <Loading />
      </section>
    );
  }

  return (
    <section className="section container">
      <div className="section-heading">
        <div>
          <span className="eyebrow">SHOPPING</span>
          <h1>Your cart</h1>
        </div>
        {cart.items?.length > 0 && (
          <button
            type="button"
            className="button ghost"
            onClick={handleClear}
            disabled={isPending("clear")}
          >
            {isPending("clear") ? "Clearing…" : "Clear cart"}
          </button>
        )}
      </div>

      {!cart.items?.length ? (
        <EmptyState
          icon="◎"
          title="Your cart is empty"
          description="Add products before checking out."
          actionLabel="Browse products"
          actionTo="/products"
        />
      ) : (
        <div className="cart-layout">
          <div className="cart-list">
            {cart.items.map((item) => {
              const pending = isPending(item.id);
              return (
                <div className={`cart-item${pending ? " is-pending" : ""}`} key={item.id}>
                  <ImageWithFallback
                    className="cart-thumb"
                    src={thumb(item)}
                    alt={item.product_name || item.product?.name || "Product"}
                  />
                  <div>
                    <h3>
                      {item.product_name || item.product?.name || "Product"}
                    </h3>
                    <span>
                      Unit:{" "}
                      {Number(
                        item.product?.price || item.unit_price || 0
                      ).toLocaleString()}
                    </span>
                  </div>
                  <div className="quantity">
                    <button
                      type="button"
                      aria-label="Decrease quantity"
                      disabled={pending || item.quantity <= 1}
                      onClick={() =>
                        handleUpdate(item.id, Math.max(1, item.quantity - 1))
                      }
                    >
                      −
                    </button>
                    <span aria-live="polite">{item.quantity}</span>
                    <button
                      type="button"
                      aria-label="Increase quantity"
                      disabled={pending}
                      onClick={() => handleUpdate(item.id, item.quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                  <strong>{Number(item.subtotal || 0).toLocaleString()}</strong>
                  <button
                    type="button"
                    className="remove"
                    disabled={pending}
                    onClick={() => handleRemove(item.id)}
                  >
                    {pending ? "…" : "Remove"}
                  </button>
                </div>
              );
            })}
          </div>
          <aside className="summary">
            <h2>Summary</h2>
            <div>
              <span>Items</span>
              <strong>{cart.items.length}</strong>
            </div>
            <div>
              <span>Total</span>
              <strong>{Number(cart.total || 0).toLocaleString()}</strong>
            </div>
            <button
              type="button"
              className="button full"
              onClick={() => navigate("/checkout")}
            >
              Checkout
            </button>
            <Link className="button ghost full" to="/products" style={{ marginTop: 8 }}>
              Continue shopping
            </Link>
          </aside>
        </div>
      )}
    </section>
  );
}
