import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";

const apiBase = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function imageUrl(value) {
  if (!value) return "https://placehold.co/800x800?text=Product";
  return value.startsWith("http") ? value : `${apiBase}${value}`;
}

export default function ProductCard({ product }) {
  const { add } = useCart();
  const { isAuthenticated } = useAuth();

  const handleAdd = async () => {
    if (!isAuthenticated) return;
    await add(product.id, 1);
  };

  return (
    <article className="product-card">
      <Link to={`/products/${product.slug}`} className="product-image">
        <img src={imageUrl(product.primary_image_url)} alt={product.name} />
      </Link>
      <div className="product-info">
        <span className="eyebrow">{product.category_name || "Product"}</span>
        <Link to={`/products/${product.slug}`}><h3>{product.name}</h3></Link>
        <div className="product-row">
          <strong>{product.currency || "UGX"} {Number(product.price).toLocaleString()}</strong>
          {product.compare_at_price && <del>{Number(product.compare_at_price).toLocaleString()}</del>}
        </div>
        <button className="button full" disabled={!product.in_stock || !isAuthenticated} onClick={handleAdd}>
          {!product.in_stock ? "Out of stock" : !isAuthenticated ? "Login to buy" : "Add to cart"}
        </button>
      </div>
    </article>
  );
}