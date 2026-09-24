import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getProduct } from "../api/productApi";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import Loading from "../components/Loading";
import EmptyState from "../components/EmptyState";
import ImageWithFallback from "../components/ImageWithFallback";
import { getErrorMessage } from "../utils/errors";

const apiBase = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const imageUrl = (value) =>
  value
    ? value.startsWith("http")
      ? value
      : `${apiBase}${value}`
    : null;

export default function ProductDetails() {
  const { slug } = useParams();
  const { add } = useCart();
  const { isAuthenticated } = useAuth();
  const toast = useToast();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setProduct(null);
    getProduct(slug)
      .then(({ data }) => {
        if (!cancelled) setProduct(data);
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, "Product not found"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) return <Loading />;

  if (error || !product) {
    return (
      <section className="section container">
        <EmptyState
          variant="error"
          icon="!"
          title="Product not found"
          description={error || "This product may have been removed."}
          actionLabel="Back to shop"
          actionTo="/products"
        />
      </section>
    );
  }

  const handleAdd = async () => {
    if (!isAuthenticated) {
      toast("Please log in to add items", "error");
      return;
    }
    setBusy(true);
    try {
      await add(product.id, quantity);
      toast(`Added ${quantity} to cart`, "success");
    } catch (err) {
      toast(getErrorMessage(err, "Could not add to cart"), "error");
    } finally {
      setBusy(false);
    }
  };

  const onSale =
    product.compare_at_price &&
    Number(product.compare_at_price) > Number(product.price);

  const maxQty = product.stock_quantity
    ? Math.max(1, Number(product.stock_quantity))
    : 99;

  return (
    <section className="section container">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/products">Shop</Link>
        <span aria-hidden="true"> / </span>
        <span>{product.name}</span>
      </nav>

      <div className="product-detail">
        <div className="product-detail-image">
          <ImageWithFallback
            src={imageUrl(product.primary_image_url)}
            alt={product.name}
          />
          {!product.in_stock && <span className="product-badge out">Sold out</span>}
          {product.in_stock && onSale && <span className="product-badge">Sale</span>}
        </div>
        <div className="product-detail-info">
          <span className="eyebrow">{product.category_name || "Product"}</span>
          <h1>{product.name}</h1>
          <div className="product-row">
            <strong className="price-lg">
              {product.currency || "UGX"} {Number(product.price).toLocaleString()}
            </strong>
            {onSale && (
              <del>{Number(product.compare_at_price).toLocaleString()}</del>
            )}
          </div>
          {product.description && (
            <p className="product-desc">{product.description}</p>
          )}
          <div className="quantity detail-qty">
            <button
              type="button"
              aria-label="Decrease"
              disabled={quantity <= 1}
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            >
              −
            </button>
            <span>{quantity}</span>
            <button
              type="button"
              aria-label="Increase"
              disabled={quantity >= maxQty}
              onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
            >
              +
            </button>
          </div>
          <button
            type="button"
            className="button full"
            disabled={!product.in_stock || busy}
            onClick={handleAdd}
            aria-busy={busy}
          >
            {!product.in_stock
              ? "Out of stock"
              : busy
                ? "Adding…"
                : !isAuthenticated
                  ? "Login to buy"
                  : "Add to cart"}
          </button>
          <Link className="button ghost full" to="/products" style={{ marginTop: 8 }}>
            Continue shopping
          </Link>
        </div>
      </div>
    </section>
  );
}
