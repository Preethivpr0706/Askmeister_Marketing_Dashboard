import { useState, useEffect } from 'react';
import './FieldSelectorModal.css';
import { contactService } from '../../api/contactService';

const FieldSelectorModal = ({ isOpen, onClose, onConfirm, availableFields: propAvailableFields, selectedListId }) => {
  const [selectedFields, setSelectedFields] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [availableFields, setAvailableFields] = useState(propAvailableFields || []);
  const [isLoadingFields, setIsLoadingFields] = useState(false);
  const [showAddFieldForm, setShowAddFieldForm] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState('text');
  const [isCreatingField, setIsCreatingField] = useState(false);
  const [tempCustomFields, setTempCustomFields] = useState([]); // For CSV-only fields that don't exist yet
  const [editingFieldName, setEditingFieldName] = useState(null); // Track which field is being edited
  const [editedFieldName, setEditedFieldName] = useState(''); // Temporary edited name
  
  // Predefined field options
  const predefinedFieldOptions = [
    { field_name: 'company_name', field_type: 'text', label: 'Company Name' },
    { field_name: 'job_title', field_type: 'text', label: 'Job Title' },
    { field_name: 'date_of_birth', field_type: 'date', label: 'Date of Birth' },
    { field_name: 'address', field_type: 'text', label: 'Address' },
    { field_name: 'city', field_type: 'text', label: 'City' },
    { field_name: 'country', field_type: 'text', label: 'Country' },
    { field_name: 'postal_code', field_type: 'text', label: 'Postal Code' },
    { field_name: 'phone_secondary', field_type: 'phone', label: 'Secondary Phone' },
    { field_name: 'website', field_type: 'text', label: 'Website' },
    { field_name: 'notes', field_type: 'text', label: 'Notes' },
    { field_name: 'custom_attribute_1', field_type: 'text', label: 'Custom Attribute 1' },
    { field_name: 'custom_attribute_2', field_type: 'text', label: 'Custom Attribute 2' },
    { field_name: 'custom_attribute_3', field_type: 'text', label: 'Custom Attribute 3' },
    { field_name: 'custom_attribute_4', field_type: 'text', label: 'Custom Attribute 4' },
    { field_name: 'custom_attribute_5', field_type: 'text', label: 'Custom Attribute 5' }
  ];

  // Initialize fields when modal opens - For CSV download, we don't need to fetch from DB
  // We'll show fixed fields + predefined options + allow custom entry
  useEffect(() => {
    if (isOpen) {
      setIsLoadingFields(true);
      // For CSV download, we start with fixed fields and predefined options
      // User can add custom fields on the fly
      const fixedFields = [
        { field_name: 'fname', field_type: 'text', is_fixed: true },
        { field_name: 'lname', field_type: 'text', is_fixed: true },
        { field_name: 'wanumber', field_type: 'phone', is_fixed: true },
        { field_name: 'email', field_type: 'email', is_fixed: true }
      ];
      
      // Optionally fetch existing custom fields if listId is provided
      const fetchExistingFields = async () => {
        if (selectedListId) {
          try {
            const response = await contactService.getAvailableFields(selectedListId);
            if (response.success && response.data) {
              // Combine fixed + custom fields
              setAvailableFields(response.data);
              // Pre-select fixed fields by default
              const fixedFieldNames = fixedFields.map(f => f.field_name);
              setSelectedFields(fixedFieldNames);
            } else {
              setAvailableFields(fixedFields);
              setSelectedFields(['fname', 'lname', 'wanumber', 'email']);
            }
          } catch (error) {
            console.error('Failed to fetch available fields:', error);
            setAvailableFields(fixedFields);
            setSelectedFields(['fname', 'lname', 'wanumber', 'email']);
          }
        } else {
          // No list selected, just show fixed fields
          setAvailableFields(fixedFields);
          setSelectedFields(['fname', 'lname', 'wanumber', 'email']);
        }
        setIsLoadingFields(false);
      };
      
      fetchExistingFields();
    }
  }, [isOpen, selectedListId]);

  const handleToggleField = (fieldName) => {
    setSelectedFields(prev => {
      if (prev.includes(fieldName)) {
        // Don't allow deselecting required fields
        const requiredFields = ['wanumber'];
        if (requiredFields.includes(fieldName)) {
          return prev;
        }
        return prev.filter(f => f !== fieldName);
      } else {
        return [...prev, fieldName];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedFields.length === availableFields.length) {
      // Deselect all except required
      setSelectedFields(['wanumber']);
    } else {
      setSelectedFields(availableFields.map(f => f.field_name));
    }
  };

  const handleAddPredefinedField = (field) => {
    // Check if field is already in availableFields (either temp or saved)
    const existingField = availableFields.find(f => f.field_name === field.field_name);
    const isSelected = selectedFields.includes(field.field_name);
    
    if (existingField) {
      // Field already exists - just toggle selection
      if (isSelected) {
        // Deselect
        setSelectedFields(prev => prev.filter(f => f !== field.field_name));
      } else {
        // Select
        setSelectedFields(prev => [...prev, field.field_name]);
      }
    } else {
      // Field doesn't exist - add as temporary field
      const newField = {
        field_name: field.field_name,
        field_type: field.field_type,
        is_fixed: false,
        is_predefined: true,
        is_temp: true // Mark as temporary for CSV
      };
      setTempCustomFields(prev => [...prev, newField]);
      setAvailableFields(prev => [...prev, newField]);
      // Also select it
      setSelectedFields(prev => [...prev, field.field_name]);
    }
  };

  const handleStartEditFieldName = (fieldName) => {
    setEditingFieldName(fieldName);
    setEditedFieldName(fieldName);
  };

  const handleSaveFieldName = (oldFieldName) => {
    if (!editedFieldName.trim()) {
      alert('Field name cannot be empty');
      return;
    }

    // Validate field name (snake_case)
    const trimmedName = editedFieldName.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/^_+|_+$/g, '');
    if (!/^[a-z][a-z0-9_]*$/.test(trimmedName)) {
      alert('Field name must be in snake_case (lowercase letters, numbers, and underscores only, starting with a letter)');
      return;
    }

    // Check if new name already exists
    const exists = availableFields.some(f => f.field_name === trimmedName && f.field_name !== oldFieldName);
    if (exists) {
      alert('This field name already exists');
      return;
    }

    // Update field name in availableFields
    setAvailableFields(prev => prev.map(f => {
      if (f.field_name === oldFieldName) {
        return { ...f, field_name: trimmedName };
      }
      return f;
    }));

    // Update in tempCustomFields
    setTempCustomFields(prev => prev.map(f => {
      if (f.field_name === oldFieldName) {
        return { ...f, field_name: trimmedName };
      }
      return f;
    }));

    // Update selectedFields if it was selected
    if (selectedFields.includes(oldFieldName)) {
      setSelectedFields(prev => {
        const updated = prev.filter(f => f !== oldFieldName);
        return [...updated, trimmedName];
      });
    }

    setEditingFieldName(null);
    setEditedFieldName('');
  };

  const handleCancelEditFieldName = () => {
    setEditingFieldName(null);
    setEditedFieldName('');
  };

  const handleAddTempField = () => {
    if (!newFieldName.trim()) {
      alert('Please enter a field name');
      return;
    }

    // Validate field name (snake_case)
    const trimmedName = newFieldName.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (!/^[a-z][a-z0-9_]*$/.test(trimmedName)) {
      alert('Field name must be in snake_case (lowercase letters, numbers, and underscores only, starting with a letter)');
      return;
    }

    // Check if field already exists
    const exists = availableFields.some(f => f.field_name === trimmedName) || 
                   tempCustomFields.some(f => f.field_name === trimmedName);
    if (exists) {
      alert('This field already exists');
      return;
    }

    // Add as temporary field (for CSV only, not saved to DB)
    const tempField = {
      field_name: trimmedName,
      field_type: newFieldType,
      is_fixed: false,
      is_predefined: false,
      is_temp: true // Mark as temporary
    };
    setTempCustomFields(prev => [...prev, tempField]);
    setAvailableFields(prev => [...prev, tempField]);
    // Also select it
    setSelectedFields(prev => [...prev, trimmedName]);

    // Reset form
    setNewFieldName('');
    setNewFieldType('text');
    setShowAddFieldForm(false);
  };

  const handleCreateCustomField = async () => {
    if (!newFieldName.trim()) {
      alert('Please enter a field name');
      return;
    }

    // Validate field name (snake_case)
    const trimmedName = newFieldName.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (!/^[a-z][a-z0-9_]*$/.test(trimmedName)) {
      alert('Field name must be in snake_case (lowercase letters, numbers, and underscores only, starting with a letter)');
      return;
    }

    setIsCreatingField(true);
    try {
      // Create the field definition
      await contactService.createFieldDefinition({
        listId: selectedListId || null,
        field_name: trimmedName,
        field_type: newFieldType
      });

      // Remove from temp fields if it was there
      setTempCustomFields(prev => prev.filter(f => f.field_name !== trimmedName));

      // Add to available fields
      const newField = {
        field_name: trimmedName,
        field_type: newFieldType,
        is_fixed: false,
        is_predefined: false
      };
      setAvailableFields(prev => {
        // Remove temp version if exists
        const filtered = prev.filter(f => !(f.field_name === trimmedName && f.is_temp));
        return [...filtered, newField];
      });
      // Also select it
      setSelectedFields(prev => [...prev, trimmedName]);

      // Reset form
      setNewFieldName('');
      setNewFieldType('text');
      setShowAddFieldForm(false);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to create field');
    } finally {
      setIsCreatingField(false);
    }
  };

  const handleConfirm = () => {
    if (selectedFields.length === 0) {
      alert('Please select at least one field');
      return;
    }
    onConfirm(selectedFields);
    onClose();
  };

  if (!isOpen) return null;

  const filteredFields = availableFields.filter(field => {
    const fieldName = typeof field === 'string' ? field : field.field_name;
    return fieldName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const fixedFields = filteredFields.filter(f => f.is_fixed || ['fname', 'lname', 'wanumber', 'email'].includes(f.field_name || f));
  const customFields = filteredFields.filter(f => !f.is_fixed && !['fname', 'lname', 'wanumber', 'email'].includes(f.field_name || f));

  return (
    <div className="field-selector-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="field-selector-modal">
        <div className="field-selector-header">
          <h2>Select Fields for CSV</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="field-selector-body">
          {isLoadingFields ? (
            <div className="loading-fields">Loading fields...</div>
          ) : (
            <>
          <div className="field-selector-search">
            <input
              type="text"
              placeholder="Search fields..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="field-selector-actions">
            <div className="actions-left">
              <button className="select-all-btn" onClick={handleSelectAll}>
                {selectedFields.length === availableFields.length ? 'Deselect All' : 'Select All'}
              </button>
              <button 
                className="add-field-btn" 
                onClick={() => setShowAddFieldForm(!showAddFieldForm)}
                type="button"
              >
                + Add Custom Field
              </button>
            </div>
            <span className="selected-count">{selectedFields.length} field(s) selected</span>
          </div>

          {/* Add Custom Field Form */}
          {showAddFieldForm && (
            <div className="add-field-form">
              <h4>Add Custom Field for CSV</h4>
              <div className="form-row">
                <input
                  type="text"
                  placeholder="Field name (e.g., company_name, custom_field_1)"
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  className="field-name-input"
                  onBlur={(e) => {
                    // Auto-format to snake_case on blur
                    const formatted = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/^_+|_+$/g, '');
                    setNewFieldName(formatted);
                  }}
                />
                <select
                  value={newFieldType}
                  onChange={(e) => setNewFieldType(e.target.value)}
                  className="field-type-select"
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="date">Date</option>
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                </select>
                <button
                  onClick={handleAddTempField}
                  disabled={!newFieldName.trim()}
                  className="add-temp-field-btn"
                  title="Add field to CSV only (not saved to database)"
                >
                  Add to CSV
                </button>
                <button
                  onClick={handleCreateCustomField}
                  disabled={isCreatingField || !newFieldName.trim()}
                  className="create-field-btn"
                  title="Create field definition in database"
                >
                  {isCreatingField ? 'Creating...' : 'Save & Add'}
                </button>
                <button
                  onClick={() => {
                    setShowAddFieldForm(false);
                    setNewFieldName('');
                    setNewFieldType('text');
                  }}
                  className="cancel-field-btn"
                >
                  Cancel
                </button>
              </div>
              <p className="field-name-hint">
                <strong>Add to CSV:</strong> Field will be added to CSV only (not saved to database). 
                <strong>Save & Add:</strong> Field will be created in database and added to CSV.
                <br />
                Field name must be in snake_case (lowercase, numbers, underscores)
              </p>
            </div>
          )}

          {/* Predefined Fields Section */}
          {!showAddFieldForm && (
            <div className="predefined-fields-section">
              <h3 className="field-group-title">Predefined Fields (Quick Add)</h3>
              <p className="section-description">Click to add predefined fields to your CSV. These will be added to CSV only (not saved to database).</p>
              <div className="predefined-fields-grid">
                {predefinedFieldOptions.map((field) => {
                  const isSelected = selectedFields.includes(field.field_name);
                  const exists = availableFields.some(f => f.field_name === field.field_name && !f.is_temp);
                  const isTemp = availableFields.some(f => f.field_name === field.field_name && f.is_temp);
                  const isEditing = editingFieldName === field.field_name;
                  const tempField = availableFields.find(f => f.field_name === field.field_name && f.is_temp);
                  const displayName = tempField ? tempField.field_name : field.field_name;
                  // Only show edit icon for custom_attribute fields
                  const isCustomAttribute = field.field_name.startsWith('custom_attribute_');
                  
                  return (
                    <div key={`predefined-${field.field_name}`} className={`predefined-field-wrapper ${isSelected ? 'selected' : ''} ${exists ? 'exists' : ''} ${isTemp ? 'temp' : ''}`}>
                      {isEditing ? (
                        <div className="edit-field-name-form">
                          <input
                            type="text"
                            value={editedFieldName}
                            onChange={(e) => setEditedFieldName(e.target.value)}
                            onBlur={() => handleSaveFieldName(field.field_name)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveFieldName(field.field_name);
                              } else if (e.key === 'Escape') {
                                handleCancelEditFieldName();
                              }
                            }}
                            className="edit-field-input"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveFieldName(field.field_name)}
                            className="save-edit-btn"
                            title="Save (Enter)"
                          >
                            ✓
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEditFieldName}
                            className="cancel-edit-btn"
                            title="Cancel (Esc)"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            className={`predefined-field-btn ${isSelected ? 'selected' : ''} ${exists ? 'exists' : ''} ${isTemp ? 'temp' : ''}`}
                            onClick={() => handleAddPredefinedField(field)}
                            title={exists ? 'Field exists in database - Click to select/deselect' : isTemp ? 'Added to CSV (temporary) - Click to select/deselect' : 'Click to add this field to CSV'}
                          >
                            {tempField ? tempField.field_name.replace(/_/g, ' ') : field.label}
                            {exists && <span className="exists-badge" title="Exists in database">✓</span>}
                            {isTemp && !exists && <span className="temp-badge-small" title="CSV only">CSV</span>}
                          </button>
                          {isTemp && !exists && isCustomAttribute && (
                            <button
                              type="button"
                              className="edit-field-name-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartEditFieldName(field.field_name);
                              }}
                              title="Edit field name"
                            >
                              ✏️
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="fields-list">
            {fixedFields.length > 0 && (
              <div className="field-group">
                <h3 className="field-group-title">Fixed Fields</h3>
                <div className="field-items">
                  {fixedFields.map((field) => {
                    const fieldName = typeof field === 'string' ? field : field.field_name;
                    const isRequired = fieldName === 'wanumber';
                    return (
                      <label key={fieldName} className={`field-item ${isRequired ? 'required' : ''}`}>
                        <input
                          type="checkbox"
                          checked={selectedFields.includes(fieldName)}
                          onChange={() => handleToggleField(fieldName)}
                          disabled={isRequired}
                        />
                        <span className="field-name">{fieldName}</span>
                        {isRequired && <span className="required-badge">Required</span>}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {customFields.length > 0 && (
              <div className="field-group">
                <h3 className="field-group-title">Your Custom Fields</h3>
                <div className="field-items">
                  {customFields.map((field, index) => {
                    const fieldName = typeof field === 'string' ? field : field.field_name;
                    const fieldType = field.field_type || 'text';
                    const isPredefined = field.is_predefined;
                    const isTemp = field.is_temp;
                    // Use unique key to avoid duplicate key warnings
                    const uniqueKey = `custom-${fieldName}-${index}-${isTemp ? 'temp' : 'saved'}`;
                    return (
                      <label key={uniqueKey} className={`field-item ${isTemp ? 'temp-field' : ''}`}>
                        <input
                          type="checkbox"
                          checked={selectedFields.includes(fieldName)}
                          onChange={() => handleToggleField(fieldName)}
                        />
                        <span className="field-name">{fieldName}</span>
                        <span className="field-type">{fieldType}</span>
                        {isPredefined && <span className="predefined-badge">Predefined</span>}
                        {isTemp && <span className="temp-badge" title="Temporary field (CSV only)">CSV Only</span>}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {filteredFields.length === 0 && (
              <div className="no-fields">No fields found</div>
            )}
          </div>
          </>
          )}
        </div>

        <div className="field-selector-footer">
          <button className="cancel-btn" onClick={onClose}>Cancel</button>
          <button className="confirm-btn" onClick={handleConfirm}>
            Generate CSV
          </button>
        </div>
      </div>
    </div>
  );
};

export default FieldSelectorModal;

