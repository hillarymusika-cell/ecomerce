import { useState } from "react";

const PLACEHOLDER =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
      <rect fill="#e2e8f0" width="800" height="800"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
        fill="#94a3b8" font-family="system-ui,sans-serif" font-size="28">No image</text>
    </svg>`
  );

/**
 * <img> with graceful fallback when src fails or is missing.
 */
export default function ImageWithFallback({
  src,
  alt = "",
  className,
  fallback = PLACEHOLDER,
  ...rest
}) {
  const [failed, setFailed] = useState(false);
  const effective = !src || failed ? fallback : src;

  return (
    <img
      src={effective}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      {...rest}
    />
  );
}
