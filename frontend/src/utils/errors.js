/**
 * Normalize API / network errors into a human-readable string.
 */
export function getErrorMessage(err, fallback = "Something went wrong") {
  if (!err) return fallback;

  // Offline / network
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return "You appear to be offline. Check your connection and try again.";
  }
  if (err.code === "ERR_NETWORK" || err.message === "Network Error") {
    return "Unable to reach the server. Please try again.";
  }

  const data = err.response?.data;
  if (!data) return err.message || fallback;

  if (typeof data === "string") return data;
  if (data.detail) return typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail);
  if (data.error) {
    if (Array.isArray(data.error)) return data.error.join(" ");
    if (typeof data.error === "string") return data.error;
  }
  if (data.message) return data.message;

  // DRF field errors: { field: ["msg"] }
  if (typeof data === "object") {
    const parts = [];
    for (const [key, val] of Object.entries(data)) {
      if (key === "tokens" || key === "user") continue;
      if (Array.isArray(val)) parts.push(`${key}: ${val.join(" ")}`);
      else if (typeof val === "string") parts.push(`${key}: ${val}`);
    }
    if (parts.length) return parts.join(" · ");
  }

  return fallback;
}
