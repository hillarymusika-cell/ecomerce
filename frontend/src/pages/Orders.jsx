import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getOrders } from "../api/orderApi";
import Loading from "../components/Loading";

export default function Orders() {
  const [orders, setOrders] = useState(null);
  useEffect(() => { getOrders().then(({ data }) => setOrders(data.results || data)); }, []);

  if (!orders) return <Loading />;

  return (
    <section className="section container">
      <span className="eyebrow">ACCOUNT</span><h1>Your orders</h1>
      {!orders.length ? <div className="empty">No orders yet.</div> : <div className="orders">{orders.map(order => (
        <Link className="order-card" to={`/orders/${order.id}`} key={order.id}>
          <div><strong>#{order.order_number}</strong><span>{new Date(order.created_at).toLocaleDateString()}</span></div>
          <span className={`status ${order.status}`}>{order.status}</span>
          <strong>{order.currency} {Number(order.total || 0).toLocaleString()}</strong>
        </Link>
      ))}</div>}
    </section>
  );
}