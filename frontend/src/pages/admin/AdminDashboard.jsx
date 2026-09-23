import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { getDashboard } from "../../api/adminApi";
import Loading from "../../components/Loading";

function fmt(n) {
  if (n == null || n === "") return "0";
  const num = Number(n);
  if (Number.isNaN(num)) return String(n);
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function BarChart({ data, valueKey = "orders", labelKey = "date" }) {
  const max = useMemo(() => {
    const vals = (data || []).map((d) => Number(d[valueKey]) || 0);
    return Math.max(...vals, 1);
  }, [data, valueKey]);

  if (!data?.length) {
    return <div className="chart-empty">No data for this period</div>;
  }

  return (
    <div className="bar-chart" role="img" aria-label="Trend chart">
      {data.map((d) => {
        const v = Number(d[valueKey]) || 0;
        const h = Math.max(4, Math.round((v / max) * 100));
        const label = String(d[labelKey] || "").slice(5); // MM-DD
        return (
          <div className="bar-col" key={d[labelKey]}>
            <div className="bar-tooltip">{fmt(v)}</div>
            <div className="bar" style={{ height: `${h}%` }} />
            <span className="bar-label">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

function StatusBars({ rows }) {
  const max = Math.max(...(rows || []).map((r) => r.count), 1);
  if (!rows?.length) return <p className="muted">No orders yet.</p>;
  return (
    <div className="status-bars">
      {rows.map((row) => (
        <div className="status-bar-row" key={row.status}>
          <span className={`status ${row.status}`}>{row.status}</span>
          <div className="status-bar-track">
            <div
              className="status-bar-fill"
              style={{ width: `${Math.round((row.count / max) * 100)}%` }}
            />
          </div>
          <strong>{row.count}</strong>
        </div>
      ))}
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [days, setDays] = useState(30);
  const [chartMetric, setChartMetric] = useState("orders");

  useEffect(() => {
    setStats(null);
    getDashboard({ days })
      .then(({ data }) => setStats(data))
      .catch(() => setError("Failed to load dashboard."));
  }, [days]);

  if (error) {
    return (
      <section className="section container">
        <div className="alert">{error}</div>
      </section>
    );
  }
  if (!stats) {
    return (
      <section className="section container">
        <Loading />
      </section>
    );
  }

  const kpis = [
    { label: "Revenue", value: fmt(stats.revenue), sub: `Period: ${fmt(stats.revenue_period)}` },
    { label: "Orders", value: fmt(stats.orders ?? stats.orders_count), sub: `${stats.pending_orders || 0} pending` },
    { label: "AOV", value: fmt(stats.average_order_value), sub: "Avg order value" },
    { label: "Customers", value: fmt(stats.customers), sub: `+${stats.new_users_30d || 0} / 30d` },
    { label: "Products", value: `${stats.active_products}/${stats.products ?? stats.products_count}`, sub: `${stats.low_stock || 0} low stock` },
    { label: "Users", value: fmt(stats.users ?? stats.users_count), sub: `${stats.staff || 0} staff` },
    { label: "Out of stock", value: fmt(stats.out_of_stock), sub: "Needs restock" },
    { label: "Active carts", value: fmt(stats.active_carts), sub: "With items" },
  ];

  return (
    <section className="section container dash">
      <div className="section-heading">
        <div>
          <span className="eyebrow">SYSTEM ADMIN</span>
          <h1>Dashboard & analytics</h1>
        </div>
        <div className="nav-actions dash-actions">
          <select
            className="dash-select"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            aria-label="Period"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <Link className="button ghost small" to="/admin/users">Users</Link>
          <Link className="button ghost small" to="/admin/orders">Orders</Link>
          <Link className="button small" to="/staff">Products</Link>
        </div>
      </div>

      <div className="stats-grid">
        {kpis.map((k) => (
          <div className="stat-card" key={k.label}>
            <span>{k.label}</span>
            <strong>{k.value}</strong>
            {k.sub && <small>{k.sub}</small>}
          </div>
        ))}
      </div>

      <div className="dash-grid">
        <div className="dash-panel">
          <div className="dash-panel-head">
            <h2>Trends</h2>
            <div className="segmented">
              <button
                type="button"
                className={chartMetric === "orders" ? "active" : ""}
                onClick={() => setChartMetric("orders")}
              >
                Orders
              </button>
              <button
                type="button"
                className={chartMetric === "revenue" ? "active" : ""}
                onClick={() => setChartMetric("revenue")}
              >
                Revenue
              </button>
            </div>
          </div>
          <BarChart
            data={stats.revenue_by_day}
            valueKey={chartMetric}
            labelKey="date"
          />
        </div>

        <div className="dash-panel">
          <div className="dash-panel-head">
            <h2>Orders by status</h2>
          </div>
          <StatusBars rows={stats.orders_by_status} />
        </div>
      </div>

      <div className="dash-grid">
        <div className="dash-panel">
          <div className="dash-panel-head">
            <h2>Top products</h2>
            <Link to="/staff" className="muted-link">Manage →</Link>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table compact">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Units</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {(stats.top_products || []).map((p) => (
                  <tr key={p.product_id || p.sku}>
                    <td>
                      <div className="cell-main">{p.product_name}</div>
                      <div className="cell-sub">{p.sku}</div>
                    </td>
                    <td>{fmt(p.units_sold)}</td>
                    <td>{fmt(p.revenue)}</td>
                  </tr>
                ))}
                {!stats.top_products?.length && (
                  <tr><td colSpan={3}>No sales data yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="dash-panel">
          <div className="dash-panel-head">
            <h2>Top categories</h2>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table compact">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Units</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {(stats.top_categories || []).map((c) => (
                  <tr key={c.slug || c.name}>
                    <td>{c.name}</td>
                    <td>{fmt(c.units_sold)}</td>
                    <td>{fmt(c.revenue)}</td>
                  </tr>
                ))}
                {!stats.top_categories?.length && (
                  <tr><td colSpan={3}>No category sales yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="dash-grid">
        <div className="dash-panel">
          <div className="dash-panel-head">
            <h2>Recent orders</h2>
            <Link to="/admin/orders" className="muted-link">View all →</Link>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table compact">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(stats.recent_orders || []).map((o) => (
                  <tr key={o.id}>
                    <td>{o.order_number}</td>
                    <td>{o.user_email || "—"}</td>
                    <td>{o.currency} {fmt(o.total)}</td>
                    <td><span className={`status ${o.status}`}>{o.status}</span></td>
                  </tr>
                ))}
                {!stats.recent_orders?.length && (
                  <tr><td colSpan={4}>No orders yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="dash-panel">
          <div className="dash-panel-head">
            <h2>Low stock alerts</h2>
            <Link to="/staff" className="muted-link">Inventory →</Link>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table compact">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Stock</th>
                  <th>Threshold</th>
                </tr>
              </thead>
              <tbody>
                {(stats.low_stock_products || []).map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="cell-main">{p.name}</div>
                      <div className="cell-sub">{p.sku}</div>
                    </td>
                    <td><strong className="warn">{p.stock_quantity}</strong></td>
                    <td>{p.low_stock_threshold}</td>
                  </tr>
                ))}
                {!stats.low_stock_products?.length && (
                  <tr><td colSpan={3}>All stock levels healthy.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {stats.transactions && (
        <div className="dash-panel" style={{ marginTop: 20 }}>
          <div className="dash-panel-head">
            <h2>Payments</h2>
          </div>
          <div className="stats-grid mini">
            <div className="stat-card">
              <span>Volume</span>
              <strong>{fmt(stats.transactions.volume)}</strong>
            </div>
            <div className="stat-card">
              <span>Succeeded</span>
              <strong>{fmt(stats.transactions.succeeded)}</strong>
            </div>
            <div className="stat-card">
              <span>Failed</span>
              <strong>{fmt(stats.transactions.failed)}</strong>
            </div>
            <div className="stat-card">
              <span>Pending</span>
              <strong>{fmt(stats.transactions.pending)}</strong>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
