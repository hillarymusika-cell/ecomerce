import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  createProduct,
  getProduct,
  updateProduct,
  getCategories,
} from "../../api/productApi";
import { getErrorMessage } from "../../utils/errors";

const empty = {
  name: "",
  sku: "",
  description: "",
  short_description: "",
  price: "",
  compare_at_price: "",
  stock_quantity: 0,
  status: "draft",
  is_featured: false,
  category: "",
};

export default function StaffProductForm() {
  const { slug } = useParams();
  const isEdit = Boolean(slug);
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getCategories()
      .then(({ data }) => setCategories(data.results || data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    getProduct(slug)
      .then(({ data }) =>
        setForm({
          name: data.name || "",
          sku: data.sku || "",
          description: data.description || "",
          short_description: data.short_description || "",
          price: data.price || "",
          compare_at_price: data.compare_at_price || "",
          stock_quantity: data.stock_quantity ?? 0,
          status: data.status || "draft",
          is_featured: !!data.is_featured,
          // API returns FK id (number) or null
          category:
            data.category != null && data.category !== ""
              ? String(data.category)
              : "",
        })
      )
      .catch((err) =>
        setError(getErrorMessage(err, "Product not found."))
      );
  }, [slug, isEdit]);

  const change = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const payload = {
      ...form,
      price: form.price,
      compare_at_price: form.compare_at_price || null,
      stock_quantity: Number(form.stock_quantity) || 0,
      category: form.category ? Number(form.category) : null,
    };
    try {
      if (isEdit) {
        await updateProduct(slug, payload);
      } else {
        await createProduct(payload);
      }
      navigate("/staff");
    } catch (err) {
      setError(getErrorMessage(err, "Save failed."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="section container narrow">
      <Link className="back" to="/staff">
        ← Back to inventory
      </Link>
      <span className="eyebrow">STAFF</span>
      <h1>{isEdit ? "Edit product" : "Add product"}</h1>
      {error && <div className="alert">{error}</div>}
      <form className="form-card" onSubmit={submit}>
        <label>
          Name
          <input name="name" required value={form.name} onChange={change} />
        </label>
        <label>
          SKU
          <input
            name="sku"
            required
            value={form.sku}
            onChange={change}
            disabled={isEdit}
          />
        </label>
        <label>
          Short description
          <input
            name="short_description"
            value={form.short_description}
            onChange={change}
          />
        </label>
        <label>
          Description
          <textarea
            name="description"
            rows={4}
            value={form.description}
            onChange={change}
          />
        </label>
        <div className="two">
          <label>
            Price
            <input
              name="price"
              type="number"
              step="0.01"
              required
              value={form.price}
              onChange={change}
            />
          </label>
          <label>
            Compare at
            <input
              name="compare_at_price"
              type="number"
              step="0.01"
              value={form.compare_at_price || ""}
              onChange={change}
            />
          </label>
        </div>
        <div className="two">
          <label>
            Stock
            <input
              name="stock_quantity"
              type="number"
              min="0"
              value={form.stock_quantity}
              onChange={change}
            />
          </label>
          <label>
            Status
            <select name="status" value={form.status} onChange={change}>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
              <option value="out_of_stock">Out of stock</option>
            </select>
          </label>
        </div>
        <label>
          Category
          <select name="category" value={form.category || ""} onChange={change}>
            <option value="">— None —</option>
            {categories.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            name="is_featured"
            checked={form.is_featured}
            onChange={change}
          />
          Featured
        </label>
        <button className="button full" disabled={busy}>
          {busy ? "Saving..." : "Save product"}
        </button>
      </form>
    </section>
  );
}
