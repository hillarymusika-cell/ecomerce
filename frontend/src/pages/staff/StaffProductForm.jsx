import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  createProduct,
  getProduct,
  updateProduct,
  getCategories,
  uploadProductImages,
  deleteProductImage,
  setPrimaryProductImage,
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
  const { slug: routeSlug } = useParams();
  const isEdit = Boolean(routeSlug);
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [categories, setCategories] = useState([]);
  const [images, setImages] = useState([]);
  const [productSlug, setProductSlug] = useState(routeSlug || "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    getCategories()
      .then(({ data }) => setCategories(data.results || data || []))
      .catch(() => {});
  }, []);

  const loadProduct = (slug) =>
    getProduct(slug).then(({ data }) => {
      setProductSlug(data.slug || slug);
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
        category:
          data.category != null && data.category !== ""
            ? String(data.category)
            : "",
      });
      setImages(data.images || []);
    });

  useEffect(() => {
    if (!isEdit) return;
    loadProduct(routeSlug).catch((err) =>
      setError(getErrorMessage(err, "Product not found."))
    );
  }, [routeSlug, isEdit]);

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
        await updateProduct(productSlug || routeSlug, payload);
        navigate("/staff");
      } else {
        const { data } = await createProduct(payload);
        const newSlug = data.slug;
        setProductSlug(newSlug);
        // Stay on edit so staff can add images next
        navigate(`/staff/products/${newSlug}/edit`, { replace: true });
      }
    } catch (err) {
      setError(getErrorMessage(err, "Save failed."));
    } finally {
      setBusy(false);
    }
  };

  const onPickFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    const slug = productSlug || routeSlug;
    if (!slug) {
      setError("Save the product first, then add images.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const { data } = await uploadProductImages(slug, files, {
        isPrimary: images.length === 0,
      });
      const added = Array.isArray(data) ? data : [data];
      setImages((prev) => [...prev, ...added]);
      // Reload to refresh primary flags
      await loadProduct(slug);
    } catch (err) {
      setError(getErrorMessage(err, "Image upload failed."));
    } finally {
      setUploading(false);
    }
  };

  const removeImage = async (id) => {
    if (!confirm("Remove this image?")) return;
    const slug = productSlug || routeSlug;
    try {
      await deleteProductImage(slug, id);
      setImages((prev) => prev.filter((img) => img.id !== id));
    } catch (err) {
      alert(getErrorMessage(err, "Delete failed."));
    }
  };

  const makePrimary = async (id) => {
    const slug = productSlug || routeSlug;
    try {
      await setPrimaryProductImage(slug, id);
      setImages((prev) =>
        prev.map((img) => ({ ...img, is_primary: img.id === id }))
      );
    } catch (err) {
      alert(getErrorMessage(err, "Could not set primary image."));
    }
  };

  const canUpload = Boolean(productSlug || routeSlug);

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
          {busy ? "Saving..." : isEdit ? "Save changes" : "Create product"}
        </button>
      </form>

      <div className="form-card" style={{ marginTop: 24 }}>
        <h2 style={{ marginTop: 0 }}>Product images</h2>
        {!canUpload ? (
          <p className="muted">
            Create the product first, then you can upload images here.
          </p>
        ) : (
          <>
            <label className="button ghost" style={{ display: "inline-block" }}>
              {uploading ? "Uploading…" : "Add images"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                disabled={uploading}
                onChange={onPickFiles}
                style={{ display: "none" }}
              />
            </label>
            <p className="muted" style={{ fontSize: 13 }}>
              JPEG, PNG, WebP, or GIF · max 5&nbsp;MB each
            </p>
            <div className="image-gallery">
              {images.map((img) => {
                const src = img.url || img.image;
                return (
                  <div
                    className={`image-tile${img.is_primary ? " primary" : ""}`}
                    key={img.id}
                  >
                    {src ? (
                      <img src={src} alt={img.alt_text || form.name} />
                    ) : (
                      <div className="image-placeholder">No preview</div>
                    )}
                    <div className="image-tile-actions">
                      {img.is_primary ? (
                        <span className="badge">Primary</span>
                      ) : (
                        <button
                          type="button"
                          className="button ghost small"
                          onClick={() => makePrimary(img.id)}
                        >
                          Set primary
                        </button>
                      )}
                      <button
                        type="button"
                        className="remove"
                        onClick={() => removeImage(img.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
              {!images.length && (
                <p className="muted">No images yet.</p>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
