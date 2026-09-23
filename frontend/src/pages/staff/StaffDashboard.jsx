import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { getAllProducts, deleteProduct } from "../../api/productApi";
import { getStaffDashboard } from "../../api/adminApi";
import Loading from "../../components/Loading";

function fmt(n) {
  if (n == null) return "0";
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default function StaffDashboard() {
  const [products, setProducts] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  const load = () => {
    setLoading(true);
    Promise.all([
      getAllProducts().then(({ data }) => data.results || data),
      getStaffDashboard()
        .then(({ data }) => data)
        .catch(() => null),
    ])
      .then(([prods, stats]) => {
        setProducts(prods);
        setAnalytics(stats);
      })
      .catch(() => setError("Failed to load products."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const remove = async (slug) => {
    if (!confirm("Delete this product?")) return;
    try {
      await deleteProduct(slug);
      load();
    } catch {
      alert("Delete failed.");
    }
  };

  const filtered = products.filter((p) => {
    if (filter === "all") return true;
    if (filter === "low") {
      return (
        p.track_inventory !== false &&
        p.stock_quantity > 0 &&
        p.stock_quantity <= (p.low_stock_threshold ?? 5)
      );
    }
    if (filter === "out") {
      return p.status === "out_of_stock" || p.stock_quantity === 0;
    }
    return p.status === filter;
  });

  return (
    <section className="section container dash">
      <div className="section-heading">
        <div>
          <span className="eyebrow">STAFF</span>
          <h1>Inventory dashboard</h1>
        </div>
        <Link className="button" to="/staff/products/new">
          Add product
        </Link>
      </div>

      {error && <div className="alert">{error}</div>}

      {analytics && (
        <div className="stats-grid">
          <div className="stat-card">
            <span>Products</span>
            <strong>{fmt(analytics.products)}</strong>
            <small>{analytics.active_products} active</small>
          </div>
          <div className="stat-card">
            <span>Low stock</span>
            <strong className="warn">{fmt(analytics.low_stock)}</strong>
            <small>Below threshold</small>
          </div>
          <div className="stat-card">
            <span>Out of stock</span>
            <strong>{fmt(analytics.out_of_stock)}</strong>
            <small>Need restock</small>
          </div>
          <div className="stat-card">
            <span>Inventory value</span>
            <strong>{fmt(analytics.inventory_value)}</strong>
            <small>Stock × price</small>
          </div>
          <div className="stat-card">
            <span>Featured</span>
            <strong>{fmt(analytics.featured)}</strong>
          </div>
          <div className="stat-card">
            <span>Draft</span>
            <strong>{fmt(analytics.draft_products)}</strong>
          </div>
        </div>
      )}

      {(analytics?.low_stock_products?.length > 0 ||
        analytics?.out_of_stock_products?.length > 0) && (
        <div className="dash-grid" style={{ marginBottom: 28 }}>
          {analytics.low_stock_products?.length > 0 && (
            <div className="dash-panel">
              <div className="dash-panel-head">
                <h2>Low stock alerts</h2>
              </div>
              <ul className="alert-list">
                {analytics.low_stock_products.map((p) => (
                  <li key={p.id}>
                    <div>
                      <strong>{p.name}</strong>
                      <span className="cell-sub">{p.sku}</span>
                    </div>
                    <span className="warn">{p.stock_quantity} left</span>
                    <Link to={`/staff/products/${p.slug}/edit`}>Edit</Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {analytics.out_of_stock_products?.length > 0 && (
            <div className="dash-panel">
              <div className="dash-panel-head">
                <h2>Out of stock</h2>
              </div>
              <ul className="alert-list">
                {analytics.out_of_stock_products.map((p) => (
                  <li key={p.id}>
                    <div>
                      <strong>{p.name}</strong>
                      <span className="cell-sub">{p.sku}</span>
                    </div>
                    <span className="status out_of_stock">out</span>
                    <Link to={`/staff/products/${p.slug}/edit`}>Restock</Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="filters" style={{ marginBottom: 16 }}>
        {["all", "active", "draft", "low", "out", "archived"].map((f) => (
          <button
            key={f}
            type="button"
            className={`filter-chip${filter === f ? " active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f === "low" ? "Low stock" : f === "out" ? "Out of stock" : f}
          </button>
        ))}
      </div>

      {loading ? (
        <Loading />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>SKU</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="cell-main">{p.name}</div>
                    {p.is_featured && (
                      <span className="cell-sub">Featured</span>
                    )}
                  </td>
                  <td>{p.sku}</td>
                  <td>
                    {p.currency} {fmt(p.price)}
                  </td>
                  <td>
                    <span
                      className={
                        p.stock_quantity <= (p.low_stock_threshold ?? 5) &&
                        p.stock_quantity > 0
                          ? "warn"
                          : ""
                      }
                    >
                      {p.stock_quantity}
                    </span>
                  </td>
                  <td>
                    <span className={`status ${p.status}`}>{p.status}</span>
                  </td>
                  <td className="row-actions">
                    <Link to={`/staff/products/${p.slug}/edit`}>Edit</Link>
                    <button
                      type="button"
                      className="remove"
                      onClick={() => remove(p.slug)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan={6}>
                    No products match this filter.{" "}
                    <Link to="/staff/products/new">Add your first item</Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
