import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { getAllProducts, deleteProduct } from "../../api/productApi";
import Loading from "../../components/Loading";

export default function StaffDashboard() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    getAllProducts()
      .then(({ data }) => setProducts(data.results || data))
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

  return (
    <section className="section container">
      <div className="section-heading">
        <div>
          <span className="eyebrow">STAFF</span>
          <h1>Product inventory</h1>
        </div>
        <Link className="button" to="/staff/products/new">Add product</Link>
      </div>
      {error && <div className="alert">{error}</div>}
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
              {products.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.sku}</td>
                  <td>{p.currency} {p.price}</td>
                  <td>{p.stock_quantity}</td>
                  <td><span className={`status ${p.status}`}>{p.status}</span></td>
                  <td className="row-actions">
                    <Link to={`/staff/products/${p.slug}/edit`}>Edit</Link>
                    <button className="remove" onClick={() => remove(p.slug)}>Delete</button>
                  </td>
                </tr>
              ))}
              {!products.length && (
                <tr><td colSpan={6}>No products yet. Add your first item.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
