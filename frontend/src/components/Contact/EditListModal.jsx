import { useState, useEffect } from 'react';
import './AddListModal.css'; // Reuse the same CSS file

const EditListModal = ({ isOpen, onClose, onSave, list, isLoading }) => {
  const [listName, setListName] = useState('');
  const [error, setError] = useState('');
  const isEditing = list !== null;

  // Reset form when modal opens/closes or list changes
  useEffect(() => {
    if (isOpen) {
      setListName(list ? list.name : '');
      setError('');
    }
  }, [isOpen, list]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!listName.trim()) {
      setError('List name is required');
      return;
    }

    try {
      if (isEditing) {
        await onSave(list.id, { name: listName });
      } else {
        await onSave(listName);
      }
      onClose();
    } catch (err) {
      setError(err.message || (isEditing ? 'Failed to update list' : 'Failed to create list'));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="addList modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{isEditing ? 'Edit List' : 'Create New List'}</h2>
          <button className="close-button" onClick={onClose}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="listName">List Name</label>
            <input
              type="text"
              id="listName"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              placeholder="Enter list name"
              autoFocus
            />
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isLoading}
            >
              {isLoading ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update List' : 'Create List')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditListModal;
