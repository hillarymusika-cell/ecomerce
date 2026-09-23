export default function Loading({ skeleton = false, count = 8 }) {
  if (skeleton) {
    return (
      <div className="skeleton-grid" aria-busy="true" aria-label="Loading products">
        {Array.from({ length: count }).map((_, i) => (
          <div className="skeleton-card" key={i}>
            <div className="skeleton-img" />
            <div className="skeleton-body">
              <div className="skeleton-line short" />
              <div className="skeleton-line mid" />
              <div className="skeleton-line" style={{ width: "50%" }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="state" role="status">
      <div className="spinner" />
      Loading...
    </div>
  );
}
