import { Link } from "react-router-dom";
import { useState } from "react";
import { ShoppingBag } from "lucide-react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useToast } from "./Toast";
import ImageWithFallback from "./ImageWithFallback";
import { getErrorMessage } from "../utils/errors";

const apiBase = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function imageUrl(value) {
  if (!value) return null;
  return value.startsWith("http") ? value : `${apiBase}${value}`;
}

export default function ProductCard({ product }) {
  const { add } = useCart();
  const { isAuthenticated } = useAuth();
  const toast = useToast();
  const [adding, setAdding] = useState(false);

  const handleAdd = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      toast("Please log in to add items", "error");
      return;
    }
    if (adding) return;
    setAdding(true);
    try {
      await add(product.id, 1);
      toast("Added to cart", "success");
    } catch (err) {
      toast(getErrorMessage(err, "Could not add to cart"), "error");
    } finally {
      setAdding(false);
    }
  };

  const onSale =
    product.compare_at_price &&
    Number(product.compare_at_price) > Number(product.price);

  return (
    <article className="product-card">
      <Link to={`/products/${product.slug}`} className="product-image">
        <ImageWithFallback
          src={imageUrl(product.primary_image_url)}
          alt={product.name}
        />
        {!product.in_stock && <span className="product-badge out">Sold out</span>}
        {product.in_stock && onSale && <span className="product-badge">Sale</span>}
      </Link>
      <div className="product-info">
        <span className="eyebrow">{product.category_name || "Product"}</span>
        <Link to={`/products/${product.slug}`}>
          <h3>{product.name}</h3>
        </Link>
        <div className="product-row">
          <strong>
            {product.currency || "UGX"} {Number(product.price).toLocaleString()}
          </strong>
          {onSale && (
            <del>{Number(product.compare_at_price).toLocaleString()}</del>
          )}
        </div>
        <button
          type="button"
          className="button full"
          disabled={!product.in_stock || adding}
          onClick={handleAdd}
          aria-busy={adding}
        >
          {product.in_stock && !adding && isAuthenticated && (
            <ShoppingBag size={16} aria-hidden />
          )}
          {!product.in_stock
            ? "Out of stock"
            : adding
              ? "Adding…"
              : !isAuthenticated
                ? "Login to buy"
                : "Add to cart"}
        </button>
      </div>
    </article>
  );
}
