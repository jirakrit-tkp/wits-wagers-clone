const Modal = ({ isOpen, onClose, title, children, actions }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-auto p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
          aria-label="Close modal"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <h3 className="text-xl font-bold text-gray-900 mb-4 pb-4 pr-8 border-b border-gray-200">{title}</h3>
        
        <div className="text-gray-700 mb-6 pt-2">
          {children}
        </div>
        
        {actions && (
          <div className="flex justify-end gap-3">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

Modal.displayName = "Modal";

export default Modal;

