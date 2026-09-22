import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAdminOrders, updateOrderStatus } from "../../api/adminApi";
import Loading from "../../components/Loading";

const STATUSES = ["pending", "paid", "processing", "shipped", "delivered", "cancelled", "refunded"];

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    getAdminOrders()
      .then(({ data }) => setOrders(data.results || data))
      .catch(() => setError("Failed to load orders."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const changeStatus = async (id, status) => {
    try {
      await updateOrderStatus(id, status);
      load();
    } catch (err) {
      alert(err.response?.data?.detail || "Update failed.");
    }
  };

  return (
    <section className="section container">
      <div className="section-heading">
        <div>
          <span className="eyebrow">SYSTEM ADMIN</span>
          <h1>All orders</h1>
        </div>
        <Link className="button ghost small" to="/admin">Dashboard</Link>
      </div>
      {error && <div className="alert">{error}</div>}
      {loading ? (
        <Loading />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>{o.order_number}</td>
                  <td>{o.user_email}</td>
                  <td>{o.currency} {o.total}</td>
                  <td>
                    <select value={o.status} onChange={(e) => changeStatus(o.id, e.target.value)}>
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td>{new Date(o.created_at).toLocaleString()}</td>
                </tr>
              ))}
              {!orders.length && (
                <tr><td colSpan={5}>No orders yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
