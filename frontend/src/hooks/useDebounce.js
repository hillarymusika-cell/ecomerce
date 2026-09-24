import { useEffect, useState } from "react";

/**
 * Debounce a value by `delay` ms. Useful for search inputs.
 */
export default function useDebounce(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}
