import { useState, useEffect } from 'react';
import './AddContactModal.css';
import { contactService } from '../../api/contactService';

const AddContactModal = ({ isOpen, onClose, onSave, existingLists }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    fname: '',
    lname: '',
    wanumber: '',
    email: '',
    listId: '',
    newListName: '',
    customFields: {}
  });
  const [errors, setErrors] = useState({});
  const [isNewList, setIsNewList] = useState(false);
  const [availableFields, setAvailableFields] = useState([]);
  const [customFieldValues, setCustomFieldValues] = useState({});

  // Fetch available fields when list is selected
  useEffect(() => {
    const fetchFields = async () => {
      if (!isOpen) return;
      
      if (isNewList) {
        // For new list, show predefined fields + business-wide custom fields
        try {
          const response = await contactService.getAvailableFields(null);
          if (response.success && response.data) {
            setAvailableFields(response.data);
            const customFields = response.data.filter(f => !f.is_fixed);
            const initialValues = {};
            customFields.forEach(field => {
              initialValues[field.field_name] = '';
            });
            setCustomFieldValues(initialValues);
          } else {
            // Fallback to just fixed fields
            const fixedFields = [
              { field_name: 'fname', field_type: 'text', is_fixed: true },
              { field_name: 'lname', field_type: 'text', is_fixed: true },
              { field_name: 'wanumber', field_type: 'phone', is_fixed: true },
              { field_name: 'email', field_type: 'email', is_fixed: true }
            ];
            setAvailableFields(fixedFields);
            setCustomFieldValues({});
          }
        } catch (error) {
          console.error('Failed to fetch available fields:', error);
          // Fallback to fixed fields
          const fixedFields = [
            { field_name: 'fname', field_type: 'text', is_fixed: true },
            { field_name: 'lname', field_type: 'text', is_fixed: true },
            { field_name: 'wanumber', field_type: 'phone', is_fixed: true },
            { field_name: 'email', field_type: 'email', is_fixed: true }
          ];
          setAvailableFields(fixedFields);
          setCustomFieldValues({});
        }
      } else if (formData.listId) {
        // For existing list, fetch list-specific fields
        try {
          const response = await contactService.getAvailableFields(formData.listId);
          if (response.success && response.data) {
            setAvailableFields(response.data);
            // Initialize custom field values
            const customFields = response.data.filter(f => !f.is_fixed);
            const initialValues = {};
            customFields.forEach(field => {
              initialValues[field.field_name] = '';
            });
            setCustomFieldValues(initialValues);
          } else {
            // Fallback to fixed fields
            const fixedFields = [
              { field_name: 'fname', field_type: 'text', is_fixed: true },
              { field_name: 'lname', field_type: 'text', is_fixed: true },
              { field_name: 'wanumber', field_type: 'phone', is_fixed: true },
              { field_name: 'email', field_type: 'email', is_fixed: true }
            ];
            setAvailableFields(fixedFields);
            setCustomFieldValues({});
          }
        } catch (error) {
          console.error('Failed to fetch available fields:', error);
          // Fallback to fixed fields
          const fixedFields = [
            { field_name: 'fname', field_type: 'text', is_fixed: true },
            { field_name: 'lname', field_type: 'text', is_fixed: true },
            { field_name: 'wanumber', field_type: 'phone', is_fixed: true },
            { field_name: 'email', field_type: 'email', is_fixed: true }
          ];
          setAvailableFields(fixedFields);
          setCustomFieldValues({});
        }
      } else {
        // No list selected yet, just show fixed fields
        const fixedFields = [
          { field_name: 'fname', field_type: 'text', is_fixed: true },
          { field_name: 'lname', field_type: 'text', is_fixed: true },
          { field_name: 'wanumber', field_type: 'phone', is_fixed: true },
          { field_name: 'email', field_type: 'email', is_fixed: true }
        ];
        setAvailableFields(fixedFields);
        setCustomFieldValues({});
      }
    };
    fetchFields();
  }, [isOpen, formData.listId, isNewList]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        fname: '',
        lname: '',
        wanumber: '',
        email: '',
        listId: existingLists.length > 0 ? existingLists[0]?.id : '',
        newListName: '',
        customFields: {}
      });
      setCustomFieldValues({});
      setErrors({});
      setIsNewList(false);
      setIsSaving(false);
    }
  }, [isOpen, existingLists]);

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
    
    if (!formData.fname.trim()) {
      newErrors.fname = 'First name is required';
    }
    
    if (!formData.wanumber.trim()) {
      newErrors.wanumber = 'WhatsApp number is required';
    } else if (!/^(\+|\d)[0-9]{7,15}$/.test(formData.wanumber)) {
      newErrors.wanumber = 'Invalid WhatsApp number format';
    }
    
    if (isNewList && !formData.newListName.trim()) {
      newErrors.newListName = 'List name is required';
    } else if (!isNewList && !formData.listId) {
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
          const value = customFieldValues[key];
          if (value !== null && value !== undefined && value !== '') {
            // Convert to string and trim, but preserve the original type for numbers/dates
            const stringValue = value.toString().trim();
            if (stringValue !== '') {
              customFields[key] = stringValue;
            }
          }
        });

        const contactData = {
          fname: formData.fname.trim(),
          lname: formData.lname.trim(),
          wanumber: formData.wanumber.trim(),
          email: formData.email.trim(),
          listId: isNewList ? null : formData.listId,
          newListName: isNewList ? formData.newListName.trim() : null,
          customFields: Object.keys(customFields).length > 0 ? customFields : null
        };
        
        console.log('Saving contact with customFields:', contactData.customFields);
        await onSave(contactData);
        onClose();
      } catch (error) {
        const message = error.message || 'Failed to save contact';
        setErrors({ submit: message });
      } finally {
        setIsSaving(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="add-contact-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="add-contact-modal">
        {/* Header */}
        <header className="add-contact-header">
          <div className="header-content">
            <div className="header-icon" aria-hidden="true">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <div className="header-text">
              <h2 className="modal-title">Add New Contact</h2>
              <p className="modal-subtitle">Fill in the details to add a contact to your list</p>
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
          {/* List Selection Section - MOVED TO TOP */}
          <div className="form-section">
            <h3 className="section-title">Contact List</h3>
            
            <div className="list-options">
              <div 
                className={`list-option ${!isNewList ? 'active' : ''}`}
                onClick={() => setIsNewList(false)}
              >
                <div className="option-radio">
                  <input
                    type="radio"
                    id="existingList"
                    name="listOption"
                    checked={!isNewList}
                    onChange={() => setIsNewList(false)}
                  />
                  <div className="radio-custom"></div>
                </div>
                <div className="option-content">
                  <div className="option-icon">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div className="option-text">
                    <span className="option-title">Select Existing List</span>
                    <span className="option-desc">Choose from your existing contact lists</span>
                  </div>
                </div>
              </div>
              
              {!isNewList && (
                <div className="list-select-wrapper">
                  <select
                    name="listId"
                    value={formData.listId}
                    onChange={handleChange}
                    className={`list-select ${errors.listId ? 'input-error' : ''}`}
                  >
                    <option value="">Select a list</option>
                    {existingLists.map(list => (
                      <option key={list.id} value={list.id}>{list.name}</option>
                    ))}
                  </select>
                  {errors.listId && (
                    <div className="error-msg">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{errors.listId}</span>
                    </div>
                  )}
                </div>
              )}
              
              <div className="divider-or">
                <span>OR</span>
              </div>
              
              <div 
                className={`list-option ${isNewList ? 'active' : ''}`}
                onClick={() => setIsNewList(true)}
              >
                <div className="option-radio">
                  <input
                    type="radio"
                    id="newList"
                    name="listOption"
                    checked={isNewList}
                    onChange={() => setIsNewList(true)}
                  />
                  <div className="radio-custom"></div>
                </div>
                <div className="option-content">
                  <div className="option-icon">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <div className="option-text">
                    <span className="option-title">Create New List</span>
                    <span className="option-desc">Create a new contact list for this contact</span>
                  </div>
                </div>
              </div>
              
              {isNewList && (
                <div className="list-input-wrapper">
                  <div className={`input-wrapper ${errors.newListName ? 'input-error' : ''}`}>
                    <div className="input-icon">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      name="newListName"
                      value={formData.newListName}
                      onChange={handleChange}
                      placeholder="Enter new list name"
                      className="form-input"
                    />
                  </div>
                  {errors.newListName && (
                    <div className="error-msg">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{errors.newListName}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Contact Information Section */}
          <div className="form-section">
            <h3 className="section-title">Contact Information</h3>
            
            <div className="form-row">
              <div className="form-field">
                <label htmlFor="fname" className="field-label">
                  <span className="label-text">
                    First Name
                    <span className="label-required">*</span>
                  </span>
                </label>
                <div className={`input-wrapper ${errors.fname ? 'input-error' : ''}`}>
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
                    required
                  />
                </div>
                {errors.fname && (
                  <div className="error-msg">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{errors.fname}</span>
                  </div>
                )}
              </div>
              
              <div className="form-field">
                <label htmlFor="lname" className="field-label">
                  <span className="label-text">
                    Last Name
                    <span className="label-optional">Optional</span>
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
                  <span className="label-optional">Optional</span>
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
                          <input
                            type="date"
                            id={`custom_${fieldName}`}
                            value={customFieldValues[fieldName] || ''}
                            onChange={(e) => handleCustomFieldChange(fieldName, e.target.value)}
                            className="form-input"
                          />
                        ) : fieldType === 'number' ? (
                          <input
                            type="number"
                            id={`custom_${fieldName}`}
                            value={customFieldValues[fieldName] || ''}
                            onChange={(e) => handleCustomFieldChange(fieldName, e.target.value)}
                            className="form-input"
                            placeholder={`Enter ${fieldName}`}
                          />
                        ) : fieldType === 'email' ? (
                          <input
                            type="email"
                            id={`custom_${fieldName}`}
                            value={customFieldValues[fieldName] || ''}
                            onChange={(e) => handleCustomFieldChange(fieldName, e.target.value)}
                            className="form-input"
                            placeholder={`Enter ${fieldName}`}
                          />
                        ) : (
                          <input
                            type="text"
                            id={`custom_${fieldName}`}
                            value={customFieldValues[fieldName] || ''}
                            onChange={(e) => handleCustomFieldChange(fieldName, e.target.value)}
                            className="form-input"
                            placeholder={`Enter ${fieldName}`}
                          />
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
                  <span>Save Contact</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddContactModal;