import { Link } from "react-router-dom";
import { PackageOpen } from "lucide-react";

/**
 * Reusable empty / error placeholder with optional CTA.
 * `icon` may be a React node (preferred) or a string fallback.
 */
export default function EmptyState({
  title = "Nothing here yet",
  description,
  actionLabel,
  actionTo,
  onAction,
  icon,
  variant = "default",
}) {
  const iconNode = icon ?? <PackageOpen size={22} />;

  return (
    <div className={`empty${variant === "error" ? " error-state" : ""}`} role="status">
      <div className="empty-icon" aria-hidden="true">
        {iconNode}
      </div>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {actionLabel && (actionTo || onAction) && (
        <div className="empty-actions">
          {actionTo ? (
            <Link className="button" to={actionTo}>
              {actionLabel}
            </Link>
          ) : (
            <button type="button" className="button" onClick={onAction}>
              {actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
