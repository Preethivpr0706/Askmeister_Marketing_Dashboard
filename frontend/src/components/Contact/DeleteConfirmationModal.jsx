import { AlertTriangle } from 'lucide-react';
import './DeleteConfirmationModal.css';

const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, itemType, itemName, isLoading }) => {
  if (!isOpen) return null;

  const handleConfirm = async () => {
    await onConfirm();
    // Modal will be closed by parent component after operation completes
  };

  return (
    <div className="delete-modal-overlay">
      <div className="delete-modal-container">
        <div className="delete-modal-content">
          <div className="delete-modal-header">
            <div className="delete-warning-icon">
              <AlertTriangle className="warning-icon" />
            </div>
            <h2 className="delete-modal-title">Delete {itemType}</h2>
            <button
              onClick={onClose}
              className="delete-close-button"
              type="button"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="delete-modal-body">
            <p className="delete-message">
              Are you sure you want to delete <strong>"{itemName}"</strong>?
            </p>
            {itemType === 'List' && (
              <p className="delete-warning">
                ⚠️ This action cannot be undone. All contacts in this list will also be deleted.
              </p>
            )}
            {itemType === 'Contact' && (
              <p className="delete-warning">
                ⚠️ This action cannot be undone. This contact will be permanently removed.
              </p>
            )}
            {itemType === 'Bulk' && (
              <p className="delete-warning">
                ⚠️ This action cannot be undone. The selected contacts will be permanently removed.
              </p>
            )}
          </div>

          <div className="delete-modal-actions">
            <button
              type="button"
              onClick={onClose}
              className="delete-cancel-button"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="delete-confirm-button"
              disabled={isLoading}
            >
              {isLoading ? 'Deleting...' : `Delete ${itemType}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;
