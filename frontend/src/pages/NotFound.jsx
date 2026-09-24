import { Link } from "react-router-dom";
import { FileQuestion, Home, ShoppingBag } from "lucide-react";

export default function NotFound() {
  return (
    <section className="section container">
      <div className="empty" role="status">
        <div className="empty-icon" aria-hidden="true">
          <FileQuestion size={22} />
        </div>
        <h1>Page not found</h1>
        <p>The page you’re looking for doesn’t exist or has been moved.</p>
        <div className="empty-actions">
          <Link className="button" to="/">
            <Home size={16} aria-hidden />
            Go home
          </Link>
          <Link className="button ghost" to="/products">
            <ShoppingBag size={16} aria-hidden />
            Browse products
          </Link>
        </div>
      </div>
    </section>
  );
}
