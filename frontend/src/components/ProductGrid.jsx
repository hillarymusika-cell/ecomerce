import { SearchX } from "lucide-react";
import ProductCard from "./ProductCard";
import EmptyState from "./EmptyState";

export default function ProductGrid({ products }) {
  if (!products?.length) {
    return (
      <EmptyState
        icon={<SearchX size={22} />}
        title="No products found"
        description="Try a different search or clear filters."
        actionLabel="View all products"
        actionTo="/products"
      />
    );
  }
  return (
    <div className="product-grid">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
