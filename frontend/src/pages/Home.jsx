import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Sparkles, ShieldCheck, RefreshCw, ArrowRight } from "lucide-react";
import { getProducts } from "../api/productApi";
import ProductGrid from "../components/ProductGrid";
import Loading from "../components/Loading";
import EmptyState from "../components/EmptyState";
import LOGO_SRC from "../assets/logoData";
import { getErrorMessage } from "../utils/errors";

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    getProducts({ page_size: 8, featured: true })
      .then(({ data }) => setProducts(data.results || data))
      .catch(() =>
        getProducts({ page_size: 8 })
          .then(({ data }) => setProducts(data.results || data))
          .catch((err) => {
            setProducts([]);
            setError(getErrorMessage(err, "Could not load products"));
          })
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <>
      <section className="hero">
        <div className="container hero-content">
          <div>
            <span className="eyebrow">Adams Collection</span>
            <h1>Style that lasts.</h1>
            <p>Curated pieces for everyday confidence. Browse, bag, checkout.</p>
            <Link className="button" to="/products">
              Shop <ArrowRight size={16} strokeWidth={2.5} />
            </Link>
          </div>
          <div className="hero-card">
            <img src={LOGO_SRC} alt="Adams Collection" className="hero-logo" />
            <span>Style · Quality · You</span>
          </div>
        </div>
      </section>

      <div className="container">
        <div className="trust-strip">
          <div className="trust-card">
            <div className="trust-icon" aria-hidden="true">
              <Sparkles size={18} strokeWidth={2} />
            </div>
            <div>
              <h3>Curated</h3>
              <p>Hand-picked quality</p>
            </div>
          </div>
          <div className="trust-card">
            <div className="trust-icon" aria-hidden="true">
              <ShieldCheck size={18} strokeWidth={2} />
            </div>
            <div>
              <h3>Secure</h3>
              <p>Protected checkout</p>
            </div>
          </div>
          <div className="trust-card">
            <div className="trust-icon" aria-hidden="true">
              <RefreshCw size={18} strokeWidth={2} />
            </div>
            <div>
              <h3>Returns</h3>
              <p>Simple support</p>
            </div>
          </div>
        </div>
      </div>

      <section className="section container">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Featured</span>
            <h2>Picked for you</h2>
          </div>
          <Link className="button ghost" to="/products">
            View all <ArrowRight size={14} />
          </Link>
        </div>
        {loading ? (
          <Loading skeleton count={8} />
        ) : error ? (
          <EmptyState
            variant="error"
            title="Couldn’t load products"
            description={error}
            actionLabel="Retry"
            onAction={load}
          />
        ) : (
          <ProductGrid products={products} />
        )}
      </section>
    </>
  );
}
