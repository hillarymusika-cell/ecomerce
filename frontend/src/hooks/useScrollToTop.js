import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/** Scroll window to top on every route change. */
export default function useScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" in window ? "instant" : "auto" });
  }, [pathname]);
}
