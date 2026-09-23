import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getProduct } from "../api/productApi";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import Loading from "../components/Loading";

const apiBase = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const imageUrl = (value) =>
  value
    ? value.startsWith("http")
      ? value
      : `${apiBase}${value}`
    : "https://placehold.co/900x900?text=Product";

export default function ProductDetails() {
  const { slug } = useParams();
  const { add } = useCart();
  const { isAuthenticated } = useAuth();
  const toast = useToast();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getProduct(slug).then(({ data }) => setProduct(data));
  }, [slug]);

  if (!product) return <Loading />;

  const handleAdd = async () => {
    if (!isAuthenticated) {
      toast("Please log in to add items", "error");
      return;
    }
    setBusy(true);
    try {
      await add(product.id, quantity);
      toast(`Added ${quantity} to cart`, "success");
    } catch {
      toast("Could not add to cart", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="section container">
      <Link className="back" to="/products">
        ← Back to products
      </Link>
      <div className="detail-grid">
        <div className="detail-image">
          <img
            src={imageUrl(product.primary_image_url)}
            alt={product.name}
          />
        </div>
        <div className="detail-content">
          <span className="eyebrow">
            {product.category_name || "Product"}
          </span>
          <h1>{product.name}</h1>
          <span className={`stock-pill ${product.in_stock ? "in" : "out"}`}>
            {product.in_stock ? "In stock" : "Out of stock"}
          </span>
          <div className="price-large">
            {product.currency || "UGX"}{" "}
            {Number(product.price).toLocaleString()}
            {product.compare_at_price &&
              Number(product.compare_at_price) > Number(product.price) && (
                <del
                  style={{
                    marginLeft: 12,
                    fontSize: "1rem",
                    color: "#94a3b8",
                    fontWeight: 500,
                  }}
                >
                  {Number(product.compare_at_price).toLocaleString()}
                </del>
              )}
          </div>
          <p>
            {product.description ||
              product.short_description ||
              "Quality product available in our store."}
          </p>
          <div className="quantity">
            <button
              type="button"
              aria-label="Decrease quantity"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
            >
              −
            </button>
            <span>{quantity}</span>
            <button
              type="button"
              aria-label="Increase quantity"
              onClick={() => setQuantity(quantity + 1)}
            >
              +
            </button>
          </div>
          <button
            type="button"
            className="button"
            disabled={!product.in_stock || busy}
            onClick={handleAdd}
          >
            {!product.in_stock
              ? "Out of stock"
              : !isAuthenticated
                ? "Login to buy"
                : busy
                  ? "Adding..."
                  : "Add to cart"}
          </button>
        </div>
      </div>
    </section>
  );
}
