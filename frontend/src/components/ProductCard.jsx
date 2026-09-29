import { Link } from "react-router-dom";
import { useState } from "react";
import { ShoppingBag } from "lucide-react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useToast } from "./Toast";
import ImageWithFallback from "./ImageWithFallback";
import { getErrorMessage } from "../utils/errors";
import { formatMoney, DEFAULT_CURRENCY } from "../utils/money";

const apiBase = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function imageUrl(value) {
  if (!value) return null;
  return value.startsWith("http") ? value : `${apiBase}${value}`;
}

/** API sends is_in_stock / is_available — not in_stock */
function productInStock(product) {
  if (!product) return false;
  if (typeof product.is_available === "boolean") return product.is_available;
  if (typeof product.is_in_stock === "boolean") return product.is_in_stock;
  if (typeof product.in_stock === "boolean") return product.in_stock;
  if (product.track_inventory === false) return true;
  return Number(product.stock_quantity) > 0;
}

export default function ProductCard({ product }) {
  const { add } = useCart();
  const { isAuthenticated } = useAuth();
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const inStock = productInStock(product);

  const handleAdd = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      toast("Please log in to add items", "error");
      return;
    }
    if (!inStock) {
      toast("This product is out of stock", "error");
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
        {!inStock && <span className="product-badge out">Sold out</span>}
        {inStock && onSale && <span className="product-badge">Sale</span>}
      </Link>
      <div className="product-info">
        <span className="eyebrow">{product.category_name || "Product"}</span>
        <Link to={`/products/${product.slug}`}>
          <h3>{product.name}</h3>
        </Link>
        <div className="product-row">
          <strong>
            {formatMoney(product.price, product.currency || DEFAULT_CURRENCY)}
          </strong>
          {onSale && (
            <del>{Number(product.compare_at_price).toLocaleString()}</del>
          )}
        </div>
        <button
          type="button"
          className="button full"
          disabled={!inStock || adding}
          onClick={handleAdd}
          aria-busy={adding}
        >
          {inStock && !adding && isAuthenticated && (
            <ShoppingBag size={16} aria-hidden />
          )}
          {!inStock
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
