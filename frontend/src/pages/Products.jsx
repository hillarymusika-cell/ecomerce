import { useEffect, useState } from "react";
import { getProducts, getCategories } from "../api/productApi";
import ProductGrid from "../components/ProductGrid";
import Loading from "../components/Loading";

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCategories()
      .then(({ data }) => setCategories(data.results || data || []))
      .catch(() => setCategories([]));
  }, []);

  const load = (params = {}) => {
    setLoading(true);
    getProducts(params)
      .then(({ data }) => setProducts(data.results || data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const params = {};
    if (search.trim()) params.search = search.trim();
    if (category) params.category = category;
    load(params);
  }, [category]);

  const submit = (e) => {
    e.preventDefault();
    const params = {};
    if (search.trim()) params.search = search.trim();
    if (category) params.category = category;
    load(params);
  };

  return (
    <section className="section container">
      <div className="section-heading">
        <div>
          <span className="eyebrow">STORE</span>
          <h1>All products</h1>
        </div>
      </div>

      <form className="search" onSubmit={submit}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products..."
          aria-label="Search products"
        />
        <button type="submit" className="button">
          Search
        </button>
      </form>

      {categories.length > 0 && (
        <div className="filters" role="group" aria-label="Filter by category">
          <button
            type="button"
            className={`filter-chip${category === "" ? " active" : ""}`}
            onClick={() => setCategory("")}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              type="button"
              key={cat.id || cat.slug || cat.name}
              className={`filter-chip${category === (cat.slug || cat.id || cat.name) ? " active" : ""}`}
              onClick={() => setCategory(cat.slug || String(cat.id) || cat.name)}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <Loading skeleton count={8} />
      ) : (
        <ProductGrid products={products} />
      )}
    </section>
  );
}
