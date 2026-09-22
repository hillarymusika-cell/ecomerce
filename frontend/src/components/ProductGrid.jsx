import ProductCard from "./ProductCard";

export default function ProductGrid({ products }) {
  if (!products.length) return <div className="empty">No products found.</div>;
  return <div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div>;
}