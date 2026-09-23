import { Link } from "react-router-dom";
import LOGO_SRC from "../assets/logoData";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <div className="footer-brand">
            <img src={LOGO_SRC} alt="Adams Collection" className="footer-logo" />
            <div>
              <div className="brand">Adams Collection</div>
              <p className="tagline">Style · Quality · You</p>
            </div>
          </div>
          <p className="footer-desc">
            Curated fashion and lifestyle pieces — shop with confidence.
          </p>
        </div>
        <div>
          <h4>Shop</h4>
          <Link to="/products">Products</Link>
          <Link to="/cart">Cart</Link>
        </div>
        <div>
          <h4>Account</h4>
          <Link to="/login">Login</Link>
          <Link to="/register">Create account</Link>
          <Link to="/orders">Orders</Link>
        </div>
        <div>
          <h4>Legal</h4>
          <Link to="/privacy">Privacy Policy</Link>
        </div>
      </div>
      <div className="container footer-bottom">
        © {new Date().getFullYear()} Adams Collection. All rights reserved.
      </div>
    </footer>
  );
}
