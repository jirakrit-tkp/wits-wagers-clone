import Modal from "./Modal";

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", cancelText = "Cancel", isDanger = false }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      actions={
        <>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 sm:py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition order-2 sm:order-1"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`w-full sm:w-auto px-6 py-2.5 sm:py-2 ${
              isDanger 
                ? "bg-red-600 hover:bg-red-700" 
                : "bg-blue-600 hover:bg-blue-700"
            } text-white font-semibold rounded-lg transition order-1 sm:order-2`}
          >
            {confirmText}
          </button>
        </>
      }
    >
      <p className="text-sm sm:text-base text-gray-700 leading-relaxed">{message}</p>
    </Modal>
  );
};

ConfirmModal.displayName = "ConfirmModal";

export default ConfirmModal;

