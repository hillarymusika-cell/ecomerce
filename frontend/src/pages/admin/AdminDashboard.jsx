import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { getDashboard } from "../../api/adminApi";
import Loading from "../../components/Loading";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getDashboard()
      .then(({ data }) => setStats(data))
      .catch(() => setError("Failed to load dashboard."));
  }, []);

  if (error) return <section className="section container"><div className="alert">{error}</div></section>;
  if (!stats) return <section className="section container"><Loading /></section>;

  return (
    <section className="section container">
      <div className="section-heading">
        <div>
          <span className="eyebrow">SYSTEM ADMIN</span>
          <h1>Dashboard</h1>
        </div>
        <div className="nav-actions">
          <Link className="button ghost small" to="/admin/users">Users</Link>
          <Link className="button ghost small" to="/admin/orders">Orders</Link>
          <Link className="button small" to="/staff">Products</Link>
        </div>
      </div>
      <div className="stats-grid">
        <div className="stat-card"><span>Customers</span><strong>{stats.customers}</strong></div>
        <div className="stat-card"><span>Staff</span><strong>{stats.staff}</strong></div>
        <div className="stat-card"><span>Products</span><strong>{stats.active_products}/{stats.products}</strong></div>
        <div className="stat-card"><span>Orders</span><strong>{stats.orders}</strong></div>
        <div className="stat-card"><span>Revenue</span><strong>{stats.revenue}</strong></div>
        <div className="stat-card"><span>All users</span><strong>{stats.users}</strong></div>
      </div>
      <h2>Orders by status</h2>
      <ul className="status-list">
        {(stats.orders_by_status || []).map((row) => (
          <li key={row.status}><span className={`status ${row.status}`}>{row.status}</span> {row.count}</li>
        ))}
      </ul>
    </section>
  );
}
