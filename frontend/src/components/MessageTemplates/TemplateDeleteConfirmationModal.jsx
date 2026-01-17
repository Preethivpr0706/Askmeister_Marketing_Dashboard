import { AlertTriangle, X } from 'lucide-react';
import './TemplateDeleteConfirmationModal.css';

const TemplateDeleteConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  count, 
  isLoading 
}) => {
  if (!isOpen) return null;

  const handleConfirm = async () => {
    await onConfirm();
    // Modal will be closed by parent component after operation completes
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose();
    }
  };

  return (
    <div 
      className="template-delete-modal-overlay" 
      onClick={handleOverlayClick}
    >
      <div className="template-delete-modal-container">
        <div className="template-delete-modal-content">
          <div className="template-delete-modal-header">
            <div className="template-delete-warning-icon">
              <AlertTriangle className="template-warning-icon" />
            </div>
            <h2 className="template-delete-modal-title">
              Delete {count} Template{count > 1 ? 's' : ''}?
            </h2>
            <button
              onClick={onClose}
              className="template-delete-close-button"
              type="button"
              disabled={isLoading}
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

          <div className="template-delete-modal-body">
            <p className="template-delete-message">
              Are you sure you want to delete <strong>{count} selected template{count > 1 ? 's' : ''}</strong>?
            </p>
            <p className="template-delete-warning">
              ⚠️ This action cannot be undone. The selected template{count > 1 ? 's' : ''} will be permanently removed.
            </p>
          </div>

          <div className="template-delete-modal-actions">
            <button
              type="button"
              onClick={onClose}
              className="template-delete-cancel-button"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="template-delete-confirm-button"
              disabled={isLoading}
            >
              {isLoading ? 'Deleting...' : `Delete ${count} Template${count > 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateDeleteConfirmationModal;

