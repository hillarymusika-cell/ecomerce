export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <div className="brand">Ecomerce</div>
          <p>Simple shopping powered by a Django REST API and React.</p>
        </div>
        <div>
          <h4>Shop</h4>
          <a href="/products">Products</a>
          <a href="/cart">Cart</a>
        </div>
        <div>
          <h4>Account</h4>
          <a href="/login">Login</a>
          <a href="/register">Create account</a>
        </div>
      </div>
      <div className="container footer-bottom">© {new Date().getFullYear()} Ecomerce</div>
    </footer>
  );
}