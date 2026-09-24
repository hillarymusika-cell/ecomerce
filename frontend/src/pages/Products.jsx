import { useCallback, useEffect, useState } from "react";
import { getProducts, getCategories } from "../api/productApi";
import ProductGrid from "../components/ProductGrid";
import Loading from "../components/Loading";
import EmptyState from "../components/EmptyState";
import useDebounce from "../hooks/useDebounce";
import { getErrorMessage } from "../utils/errors";

const PAGE_SIZE = 12;

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [next, setNext] = useState(null);
  const [previous, setPrevious] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const debouncedSearch = useDebounce(search, 400);

  useEffect(() => {
    getCategories()
      .then(({ data }) => setCategories(data.results || data || []))
      .catch(() => setCategories([]));
  }, []);

  const load = useCallback(async (params = {}) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await getProducts({
        page_size: PAGE_SIZE,
        page: params.page || 1,
        ...params,
      });
      const list = data.results ?? (Array.isArray(data) ? data : []);
      setProducts(list);
      setCount(typeof data.count === "number" ? data.count : list.length);
      setNext(data.next ?? null);
      setPrevious(data.previous ?? null);
      setPage(params.page || 1);
    } catch (err) {
      setProducts([]);
      setCount(0);
      setNext(null);
      setPrevious(null);
      setError(getErrorMessage(err, "Could not load products"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const params = { page: 1 };
    if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
    if (category) params.category = category;
    load(params);
  }, [debouncedSearch, category, load]);

  const goPage = (p) => {
    const params = { page: p };
    if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
    if (category) params.category = category;
    load(params);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  return (
    <section className="section container">
      <div className="section-heading">
        <div>
          <span className="eyebrow">STORE</span>
          <h1>All products</h1>
          {!loading && !error && (
            <p className="muted-line">
              {count} {count === 1 ? "product" : "products"}
              {category ? " in this category" : ""}
            </p>
          )}
        </div>
      </div>

      <form
        className="search"
        onSubmit={(e) => {
          e.preventDefault();
          const params = { page: 1 };
          if (search.trim()) params.search = search.trim();
          if (category) params.category = category;
          load(params);
        }}
        role="search"
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products..."
          aria-label="Search products"
          autoComplete="off"
        />
        <button type="submit" className="button">
          Search
        </button>
        {search && (
          <button
            type="button"
            className="button ghost"
            onClick={() => setSearch("")}
            aria-label="Clear search"
          >
            Clear
          </button>
        )}
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
          {categories.map((cat) => {
            const value = cat.slug || String(cat.id) || cat.name;
            return (
              <button
                type="button"
                key={cat.id || cat.slug || cat.name}
                className={`filter-chip${category === value ? " active" : ""}`}
                onClick={() => setCategory(value)}
              >
                {cat.name}
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <Loading skeleton count={PAGE_SIZE} />
      ) : error ? (
        <EmptyState
          variant="error"
          icon="!"
          title="Couldn’t load products"
          description={error}
          actionLabel="Retry"
          onAction={() => {
            const params = { page };
            if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
            if (category) params.category = category;
            load(params);
          }}
        />
      ) : (
        <>
          <ProductGrid products={products} />
          {count > PAGE_SIZE && (
            <nav className="pagination" aria-label="Product pages">
              <button
                type="button"
                className="button ghost"
                disabled={!previous || page <= 1}
                onClick={() => goPage(page - 1)}
              >
                ← Previous
              </button>
              <span className="pagination-meta">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                className="button ghost"
                disabled={!next || page >= totalPages}
                onClick={() => goPage(page + 1)}
              >
                Next →
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
