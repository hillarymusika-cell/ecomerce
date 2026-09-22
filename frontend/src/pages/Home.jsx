import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { getProducts } from "../api/productApi";
import ProductGrid from "../components/ProductGrid";
import Loading from "../components/Loading";

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProducts({ page_size: 8 })
      .then(({ data }) => setProducts(data.results || data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <section className="hero">
        <div className="container hero-content">
          <div>
            <span className="eyebrow">MODERN ONLINE SHOPPING</span>
            <h1>Find products worth bringing home.</h1>
            <p>Browse quality products, add them to your cart, and complete your order in a few simple steps.</p>
            <Link className="button" to="/products">Shop products</Link>
          </div>
          <div className="hero-card"><span>NEW</span><strong>Simple.</strong><strong>Fast.</strong><strong>Secure.</strong></div>
        </div>
      </section>
      <section className="section container">
        <div className="section-heading"><div><span className="eyebrow">OUR STORE</span><h2>Featured products</h2></div><Link to="/products">View all</Link></div>
        {loading ? <Loading /> : <ProductGrid products={products} />}
      </section>
    </>
  );
}