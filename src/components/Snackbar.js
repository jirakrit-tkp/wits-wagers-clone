import { useEffect } from "react";

const Snackbar = ({ isOpen, onClose, message, type = "info", duration = 3000 }) => {
  useEffect(() => {
    if (isOpen && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, duration, onClose]);

  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case "error":
        return "bg-red-600 text-white";
      case "warning":
        return "bg-yellow-600 text-white";
      case "success":
        return "bg-green-600 text-white";
      case "info":
      default:
        return "bg-gray-800 text-white";
    }
  };

  const getIcon = () => {
    switch (type) {
      case "error":
        return "⚠️";
      case "warning":
        return "⚡";
      case "success":
        return "✓";
      case "info":
      default:
        return "ℹ️";
    }
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-slide-up px-4 w-full max-w-md">
      <div 
        className={`${getTypeStyles()} rounded-lg shadow-2xl px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3 backdrop-blur-sm`}
        role="alert"
      >
        <span className="text-xl flex-shrink-0">{getIcon()}</span>
        <p className="text-sm sm:text-base flex-1 font-medium leading-relaxed">{message}</p>
        <button
          type="button"
          onClick={onClose}
          className="flex-shrink-0 text-white/80 hover:text-white transition ml-2"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

Snackbar.displayName = "Snackbar";

export default Snackbar;

