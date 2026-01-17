import { useState, useEffect } from 'react';
import './AddContactModal.css';
import { contactService } from '../../api/contactService';

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
  const [availableFields, setAvailableFields] = useState([]);
  const [customFieldValues, setCustomFieldValues] = useState({});

  // Fetch available fields for the contact's list
  useEffect(() => {
    const fetchFields = async () => {
      if (isOpen && contact) {
        const listId = contact.list_id || (existingLists.length > 0 ? existingLists[0]?.id : '');
        try {
          const response = await contactService.getAvailableFields(listId || null);
          if (response.success && response.data) {
            setAvailableFields(response.data);
            
            // Extract custom field values from contact
            const fixedFields = ['id', 'fname', 'lname', 'wanumber', 'email', 'list_id', 'subscribed', 'list_name', 'created_at', 'updated_at'];
            const customValues = {};
            Object.keys(contact).forEach(key => {
              if (!fixedFields.includes(key) && contact[key] !== undefined && contact[key] !== null) {
                customValues[key] = contact[key];
              }
            });
            setCustomFieldValues(customValues);
          } else {
            // Fallback: extract fields from contact data itself
            const fixedFields = ['id', 'fname', 'lname', 'wanumber', 'email', 'list_id', 'subscribed', 'list_name', 'created_at', 'updated_at'];
            const allFields = [
              { field_name: 'fname', field_type: 'text', is_fixed: true },
              { field_name: 'lname', field_type: 'text', is_fixed: true },
              { field_name: 'wanumber', field_type: 'phone', is_fixed: true },
              { field_name: 'email', field_type: 'email', is_fixed: true }
            ];
            
            const customValues = {};
            Object.keys(contact).forEach(key => {
              if (!fixedFields.includes(key) && contact[key] !== undefined && contact[key] !== null) {
                allFields.push({ field_name: key, field_type: 'text', is_fixed: false });
                customValues[key] = contact[key];
              }
            });
            
            setAvailableFields(allFields);
            setCustomFieldValues(customValues);
          }
        } catch (error) {
          console.error('Failed to fetch available fields:', error);
          // Fallback: use contact data to determine fields
          const fixedFields = ['id', 'fname', 'lname', 'wanumber', 'email', 'list_id', 'subscribed', 'list_name', 'created_at', 'updated_at'];
          const allFields = [
            { field_name: 'fname', field_type: 'text', is_fixed: true },
            { field_name: 'lname', field_type: 'text', is_fixed: true },
            { field_name: 'wanumber', field_type: 'phone', is_fixed: true },
            { field_name: 'email', field_type: 'email', is_fixed: true }
          ];
          
          const customValues = {};
          Object.keys(contact).forEach(key => {
            if (!fixedFields.includes(key) && contact[key] !== undefined && contact[key] !== null) {
              allFields.push({ field_name: key, field_type: 'text', is_fixed: false });
              customValues[key] = contact[key];
            }
          });
          
          setAvailableFields(allFields);
          setCustomFieldValues(customValues);
        }
      }
    };
    fetchFields();
  }, [isOpen, contact, existingLists]);

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

  const handleCustomFieldChange = (fieldName, value) => {
    setCustomFieldValues(prev => ({
      ...prev,
      [fieldName]: value
    }));
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
        // Filter out empty custom fields
        const customFields = {};
        Object.keys(customFieldValues).forEach(key => {
          if (customFieldValues[key] && customFieldValues[key].toString().trim() !== '') {
            customFields[key] = customFieldValues[key].toString().trim();
          }
        });

        const contactData = {
          fname: formData.fname.trim(),
          lname: formData.lname.trim(),
          wanumber: formData.wanumber.trim(),
          email: formData.email.trim(),
          listId: formData.listId,
          customFields: Object.keys(customFields).length > 0 ? customFields : null
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
    <div className="add-contact-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="add-contact-modal">
        {/* Header */}
        <header className="add-contact-header">
          <div className="header-content">
            <div className="header-icon" aria-hidden="true">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div className="header-text">
              <h2 className="modal-title">Edit Contact</h2>
              <p className="modal-subtitle">Update contact information and custom fields</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="close-btn"
            type="button"
            aria-label="Close modal"
            title="Close"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="add-contact-form">
          {/* Contact Information Section */}
          <div className="form-section">
            <h3 className="section-title">Contact Information</h3>
            
            <div className="form-row">
              <div className="form-field">
                <label htmlFor="fname" className="field-label">
                  <span className="label-text">
                    First Name
                  </span>
                </label>
                <div className="input-wrapper">
                  <div className="input-icon">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    id="fname"
                    name="fname"
                    value={formData.fname}
                    onChange={handleChange}
                    placeholder="John"
                    className="form-input"
                  />
                </div>
              </div>
              
              <div className="form-field">
                <label htmlFor="lname" className="field-label">
                  <span className="label-text">
                    Last Name
                  </span>
                </label>
                <div className="input-wrapper">
                  <div className="input-icon">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    id="lname"
                    name="lname"
                    value={formData.lname}
                    onChange={handleChange}
                    placeholder="Doe"
                    className="form-input"
                  />
                </div>
              </div>
            </div>
            
            <div className="form-field">
              <label htmlFor="wanumber" className="field-label">
                <span className="label-text">
                  WhatsApp Number
                  <span className="label-required">*</span>
                </span>
              </label>
              <div className={`input-wrapper ${errors.wanumber ? 'input-error' : ''}`}>
                <div className="input-icon">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <input
                  type="text"
                  id="wanumber"
                  name="wanumber"
                  value={formData.wanumber}
                  onChange={handleChange}
                  placeholder="+91 9876543210"
                  className="form-input"
                  required
                />
              </div>
              {errors.wanumber && (
                <div className="error-msg">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{errors.wanumber}</span>
                </div>
              )}
            </div>
            
            <div className="form-field">
              <label htmlFor="email" className="field-label">
                <span className="label-text">
                  Email Address
                </span>
              </label>
              <div className="input-wrapper">
                <div className="input-icon">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="john.doe@example.com"
                  className="form-input"
                />
              </div>
            </div>
          </div>

          {/* Contact List Section */}
          <div className="form-section">
            <h3 className="section-title">Contact List</h3>
            
            <div className="form-field">
              <label htmlFor="listId" className="field-label">
                <span className="label-text">
                  Select List
                  <span className="label-required">*</span>
                </span>
              </label>
              <div className={`input-wrapper ${errors.listId ? 'input-error' : ''}`}>
                <div className="input-icon">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <select
                  name="listId"
                  id="listId"
                  value={formData.listId}
                  onChange={handleChange}
                  className="form-input"
                  required
                >
                  <option value="">Select a list</option>
                  {existingLists.map(list => (
                    <option key={list.id} value={list.id}>{list.name}</option>
                  ))}
                </select>
              </div>
              {errors.listId && (
                <div className="error-msg">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{errors.listId}</span>
                </div>
              )}
            </div>
          </div>

          {/* Custom Fields Section */}
          {availableFields.filter(f => !f.is_fixed).length > 0 && (
            <div className="form-section">
              <h3 className="section-title">Custom Fields</h3>
              <div className="custom-fields-grid">
                {availableFields
                  .filter(field => !field.is_fixed)
                  .map((field) => {
                    const fieldName = field.field_name;
                    const fieldType = field.field_type || 'text';
                    return (
                      <div key={fieldName} className="form-field">
                        <label htmlFor={`custom_${fieldName}`} className="field-label">
                          <span className="label-text">
                            {fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        </label>
                        {fieldType === 'date' ? (
                          <div className="input-wrapper">
                            <div className="input-icon">
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <input
                              type="date"
                              id={`custom_${fieldName}`}
                              value={customFieldValues[fieldName] || ''}
                              onChange={(e) => handleCustomFieldChange(fieldName, e.target.value)}
                              className="form-input"
                            />
                          </div>
                        ) : fieldType === 'number' ? (
                          <div className="input-wrapper">
                            <div className="input-icon">
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                              </svg>
                            </div>
                            <input
                              type="number"
                              id={`custom_${fieldName}`}
                              value={customFieldValues[fieldName] || ''}
                              onChange={(e) => handleCustomFieldChange(fieldName, e.target.value)}
                              className="form-input"
                              placeholder={`Enter ${fieldName}`}
                            />
                          </div>
                        ) : fieldType === 'email' ? (
                          <div className="input-wrapper">
                            <div className="input-icon">
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <input
                              type="email"
                              id={`custom_${fieldName}`}
                              value={customFieldValues[fieldName] || ''}
                              onChange={(e) => handleCustomFieldChange(fieldName, e.target.value)}
                              className="form-input"
                              placeholder={`Enter ${fieldName}`}
                            />
                          </div>
                        ) : (
                          <div className="input-wrapper">
                            <div className="input-icon">
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                              </svg>
                            </div>
                            <input
                              type="text"
                              id={`custom_${fieldName}`}
                              value={customFieldValues[fieldName] || ''}
                              onChange={(e) => handleCustomFieldChange(fieldName, e.target.value)}
                              className="form-input"
                              placeholder={`Enter ${fieldName}`}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
          
          {/* Submit Error */}
          {errors.submit && (
            <div className="submit-error">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{errors.submit}</span>
            </div>
          )}
          
          {/* Form Actions */}
          <div className="form-actions">
            <button
              type="button"
              onClick={onClose}
              className="btn-cancel"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-submit" 
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <svg className="spinner" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Update Contact</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditContactModal;
