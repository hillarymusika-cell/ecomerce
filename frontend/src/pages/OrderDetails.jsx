import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getOrder } from "../api/orderApi";
import Loading from "../components/Loading";

export default function OrderDetails() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  useEffect(() => { getOrder(id).then(({ data }) => setOrder(data)); }, [id]);

  if (!order) return <Loading />;

  return (
    <section className="section container">
      <Link className="back" to="/orders">← Orders</Link>
      <div className="order-header"><div><span className="eyebrow">ORDER</span><h1>#{order.order_number}</h1></div><span className={`status ${order.status}`}>{order.status}</span></div>
      <div className="order-detail">
        <div className="order-items">{order.items?.map(item => <div className="order-line" key={item.id}><span>{item.product_name} × {item.quantity}</span><strong>{order.currency} {Number(item.total_price).toLocaleString()}</strong></div>)}</div>
        <div className="summary"><div><span>Subtotal</span><strong>{Number(order.subtotal).toLocaleString()}</strong></div><div><span>Shipping</span><strong>{Number(order.shipping_amount || 0).toLocaleString()}</strong></div><div><span>Total</span><strong>{order.currency} {Number(order.total).toLocaleString()}</strong></div></div>
      </div>
    </section>
  );
}