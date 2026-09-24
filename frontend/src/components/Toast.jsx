import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

const ToastContext = createContext(null);

let idSeq = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message, type = "success") => {
      const id = ++idSeq;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => dismiss(id), 3200);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-container" aria-live="polite" aria-relevant="additions">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`} role="status">
            <span className="toast-body">
              {t.type === "success" ? (
                <CheckCircle2 size={16} aria-hidden />
              ) : (
                <AlertCircle size={16} aria-hidden />
              )}
              {t.message}
            </span>
            <button
              type="button"
              className="toast-dismiss"
              aria-label="Dismiss"
              onClick={() => dismiss(t.id)}
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) return () => {};
  return ctx;
}
