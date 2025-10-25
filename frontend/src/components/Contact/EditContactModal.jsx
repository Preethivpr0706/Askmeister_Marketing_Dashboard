import { useState, useEffect } from 'react';
import './AddContactModal.css'; // Reuse the same CSS file

const EditContactModal = ({ isOpen, onClose, onSave, contact, existingLists }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    fname: '',
    lname: '',
    wanumber: '',
    email: '',
    listId: ''
  });
  const [errors, setErrors] = useState({});

  // Reset form when modal opens/closes or contact changes
  useEffect(() => {
    if (isOpen && contact) {
      setFormData({
        fname: contact.fname || '',
        lname: contact.lname || '',
        wanumber: contact.wanumber || '',
        email: contact.email || '',
        listId: contact.list_id || (existingLists.length > 0 ? existingLists[0]?.id : '')
      });
      setErrors({});
      setIsSaving(false);
    }
  }, [isOpen, contact, existingLists]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.wanumber.trim()) {
      newErrors.wanumber = 'WhatsApp number is required';
    } else if (!/^(\+|\d)[0-9]{7,15}$/.test(formData.wanumber)) {
      newErrors.wanumber = 'Invalid WhatsApp number format';
    }

    if (!formData.listId) {
      newErrors.listId = 'Please select a list';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (validateForm()) {
      setIsSaving(true);
      try {
        const contactData = {
          fname: formData.fname.trim(),
          lname: formData.lname.trim(),
          wanumber: formData.wanumber.trim(),
          email: formData.email.trim(),
          listId: formData.listId
        };

        // Call the provided onSave function
        await onSave(contact.id, contactData);
        onClose();
      } catch (error) {
        console.error('Save error:', error);
        const message = error.message || 'Failed to update contact';
        setErrors({ submit: message });
      } finally {
        setIsSaving(false);
      }
    }
  };

  if (!isOpen || !contact) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-content">
          <div className="modal-header">
            <h2 className="modal-title">✏️ Edit Contact</h2>
            <button
              onClick={onClose}
              className="close-button"
              type="button"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="form-container">
            {/* First Name */}
            <div className="form-group">
              <label htmlFor="fname" className="label">
                First Name (Optional)
              </label>
              <input
                type="text"
                id="fname"
                name="fname"
                value={formData.fname}
                onChange={handleChange}
                className="input"
              />
            </div>

            {/* Last Name */}
            <div className="form-group">
              <label htmlFor="lname" className="label">
                Last Name (Optional)
              </label>
              <input
                type="text"
                id="lname"
                name="lname"
                value={formData.lname}
                onChange={handleChange}
                className="input"
              />
            </div>

            {/* WhatsApp Number */}
            <div className="form-group">
              <label htmlFor="wanumber" className="label">
                WhatsApp Number *
              </label>
              <input
                type="text"
                id="wanumber"
                name="wanumber"
                value={formData.wanumber}
                onChange={handleChange}
                placeholder="e.g., 919876543210"
                className={`input ${errors.wanumber ? 'input-error' : ''}`}
                required
              />
              {errors.wanumber && (
                <p className="error-message">{errors.wanumber}</p>
              )}
            </div>

            {/* Email */}
            <div className="form-group">
              <label htmlFor="email" className="label">
                Email (Optional)
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="input"
              />
            </div>

            {/* Contact List Selection */}
            <div className="form-group">
              <label htmlFor="listId" className="label">
                Contact List *
              </label>
              <select
                name="listId"
                value={formData.listId}
                onChange={handleChange}
                className={`input ${errors.listId ? 'input-error' : ''}`}
              >
                <option value="">Select a list</option>
                {existingLists.map(list => (
                  <option key={list.id} value={list.id}>{list.name}</option>
                ))}
              </select>
              {errors.listId && (
                <p className="error-message">{errors.listId}</p>
              )}
            </div>

            {/* Form Actions */}
            <div className="button-container">
              <button
                type="button"
                onClick={onClose}
                className="cancel-button"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="save-button"
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Update Contact'}
              </button>
            </div>

            {/* General submit error */}
            {errors.submit && (
              <p className="error-message submit-error">{errors.submit}</p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditContactModal;
