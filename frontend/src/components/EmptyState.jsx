import { Link } from "react-router-dom";

/**
 * Reusable empty / error placeholder with optional CTA.
 */
export default function EmptyState({
  title = "Nothing here yet",
  description,
  actionLabel,
  actionTo,
  onAction,
  icon = "○",
  variant = "default", // default | error
}) {
  return (
    <div className={`empty${variant === "error" ? " error-state" : ""}`} role="status">
      <div className="empty-icon" aria-hidden="true">
        {icon}
      </div>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {(actionLabel && (actionTo || onAction)) && (
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
