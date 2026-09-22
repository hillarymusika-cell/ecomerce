import { useEffect, useState } from "react";
import { getProducts } from "../api/productApi";
import ProductGrid from "../components/ProductGrid";
import Loading from "../components/Loading";

export default function Products() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = (query = "") => {
    setLoading(true);
    getProducts(query ? { search: query } : {})
      .then(({ data }) => setProducts(data.results || data))
      .finally(() => setLoading(false));
  };

  useEffect(() => load(), []);

  const submit = (e) => {
    e.preventDefault();
    load(search);
  };

  return (
    <section className="section container">
      <div className="section-heading"><div><span className="eyebrow">STORE</span><h1>All products</h1></div></div>
      <form className="search" onSubmit={submit}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..." />
        <button className="button">Search</button>
      </form>
      {loading ? <Loading /> : <ProductGrid products={products} />}
    </section>
  );
}