import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getProduct } from "../api/productApi";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import Loading from "../components/Loading";

const apiBase = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const imageUrl = (value) => value ? (value.startsWith("http") ? value : `${apiBase}${value}`) : "https://placehold.co/900x900?text=Product";

export default function ProductDetails() {
  const { slug } = useParams();
  const { add } = useCart();
  const { isAuthenticated } = useAuth();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => { getProduct(slug).then(({ data }) => setProduct(data)); }, [slug]);

  if (!product) return <Loading />;

  return (
    <section className="section container">
      <Link className="back" to="/products">← Back to products</Link>
      <div className="detail-grid">
        <div className="detail-image"><img src={imageUrl(product.primary_image_url)} alt={product.name} /></div>
        <div className="detail-content">
          <span className="eyebrow">{product.category_name || "Product"}</span>
          <h1>{product.name}</h1>
          <div className="price-large">{product.currency || "UGX"} {Number(product.price).toLocaleString()}</div>
          <p>{product.description || product.short_description || "Quality product available in our store."}</p>
          <div className="quantity"><button onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button><span>{quantity}</span><button onClick={() => setQuantity(quantity + 1)}>+</button></div>
          <button className="button" disabled={!product.in_stock || !isAuthenticated} onClick={() => add(product.id, quantity)}>
            {!product.in_stock ? "Out of stock" : !isAuthenticated ? "Login to buy" : "Add to cart"}
          </button>
        </div>
      </div>
    </section>
  );
}