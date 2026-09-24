import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <section className="section container">
      <div className="empty" role="status">
        <div className="empty-icon" aria-hidden="true">
          404
        </div>
        <h1>Page not found</h1>
        <p>The page you’re looking for doesn’t exist or has been moved.</p>
        <div className="empty-actions">
          <Link className="button" to="/">
            Go home
          </Link>
          <Link className="button ghost" to="/products">
            Browse products
          </Link>
        </div>
      </div>
    </section>
  );
}
