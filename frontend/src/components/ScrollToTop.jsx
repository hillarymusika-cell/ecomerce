import useScrollToTop from "../hooks/useScrollToTop";

/** Mount inside Router to reset scroll on navigation. */
export default function ScrollToTop() {
  useScrollToTop();
  return null;
}
