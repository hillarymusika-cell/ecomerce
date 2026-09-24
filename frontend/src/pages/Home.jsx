import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { BadgeCheck, Lock, RefreshCw, ArrowRight, AlertCircle } from "lucide-react";
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
            setError(getErrorMessage(err, "Could not load featured products"));
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
            <span className="eyebrow">ADAMS COLLECTION</span>
            <h1>Style. Quality. You.</h1>
            <p>
              Discover curated pieces chosen for everyday confidence. Shop the
              collection, add favorites to your cart, and checkout in a few
              simple steps.
            </p>
            <Link className="button" to="/products">
              Shop the collection
              <ArrowRight size={16} aria-hidden />
            </Link>
          </div>
          <div className="hero-card hero-card-logo">
            <img src={LOGO_SRC} alt="Adams Collection" className="hero-logo" />
            <span>STYLE · QUALITY · YOU</span>
          </div>
        </div>
      </section>

      <div className="container">
        <div className="trust-strip">
          <div className="trust-card">
            <div className="trust-icon" aria-hidden>
              <BadgeCheck size={20} />
            </div>
            <div>
              <h3>Quality curated</h3>
              <p>Hand-picked pieces for everyday confidence.</p>
            </div>
          </div>
          <div className="trust-card">
            <div className="trust-icon" aria-hidden>
              <Lock size={20} />
            </div>
            <div>
              <h3>Secure checkout</h3>
              <p>Safe payments with order tracking.</p>
            </div>
          </div>
          <div className="trust-card">
            <div className="trust-icon" aria-hidden>
              <RefreshCw size={20} />
            </div>
            <div>
              <h3>Easy returns</h3>
              <p>Hassle-free support when you need it.</p>
            </div>
          </div>
        </div>
      </div>

      <section className="section container">
        <div className="section-heading">
          <div>
            <span className="eyebrow">FEATURED</span>
            <h2>Picked for you</h2>
          </div>
          <Link className="button ghost" to="/products">
            View all
            <ArrowRight size={16} aria-hidden />
          </Link>
        </div>
        {loading ? (
          <Loading skeleton count={8} />
        ) : error ? (
          <EmptyState
            variant="error"
            icon={<AlertCircle size={22} />}
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
