// src/components/FieldMapper.jsx
import { useState, useEffect } from 'react';

function FieldMapper({ templateVariables, contactFields, onMappingChange, initialMappings = {}, variableSamples = {} }) {
  const [mappings, setMappings] = useState(initialMappings);

  useEffect(() => {
    if (initialMappings && Object.keys(initialMappings).length > 0) {
      setMappings(initialMappings);
    }
  }, [initialMappings]);

  const handleMappingChange = (varName, fieldName) => {
    const newMappings = {
      ...mappings,
      [varName]: fieldName
    };
    setMappings(newMappings);
    onMappingChange(newMappings);
  };

  // Normalize contactFields - handle both array of strings and array of objects
  const normalizeFields = () => {
    if (!contactFields || contactFields.length === 0) return [];
    
    // If first item is a string, it's the old format
    if (typeof contactFields[0] === 'string') {
      return contactFields.map(field => ({
        field_name: field,
        field_type: 'text',
        is_fixed: ['fname', 'lname', 'wanumber', 'email'].includes(field)
      }));
    }
    
    // Otherwise it's the new format with objects
    return contactFields;
  };

  const normalizedFields = normalizeFields();

  // Group fields: Fixed fields first, then custom fields
  const fixedFields = normalizedFields.filter(f => f.is_fixed);
  const customFields = normalizedFields.filter(f => !f.is_fixed);

  // Format field name for display
  const formatFieldName = (field) => {
    if (typeof field === 'string') return field;
    return field.field_name || field;
  };

  // Get field display name with type indicator
  const getFieldDisplayName = (field) => {
    const name = formatFieldName(field);
    const type = field.field_type || 'text';
    const isFixed = field.is_fixed;
    
    // Format: "field_name (type)" or "field_name (Fixed)"
    if (isFixed) {
      return `${name} (Fixed)`;
    }
    if (type !== 'text') {
      return `${name} (${type})`;
    }
    return name;
  };

  return (
    <div className="field-mapper">
      <h3>Map Template Variables to Contact Fields</h3>
      <div className="mapping-table">
        <div className="mapping-header">
          <div>Template Variable</div>
          <div>Contact Field</div>
        </div>
        {templateVariables.map((varName) => {
          const sampleValue = variableSamples[varName] || '';
          const isMapped = mappings[varName] && mappings[varName] !== '';
          return (
            <div key={varName} className={`mapping-row ${isMapped ? 'mapped' : ''}`}>
              <div className="template-var-container">
                <div className="template-var-header">
                  <span className="var-badge">{`{{${varName}}}`}</span>
                  {isMapped && (
                    <span className="mapped-indicator">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M13.3333 4L6 11.3333L2.66667 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Mapped
                    </span>
                  )}
                </div>
                {sampleValue && (
                  <div className="var-sample-container">
                    <div className="sample-icon">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M7 0C3.134 0 0 3.134 0 7C0 10.866 3.134 14 7 14C10.866 14 14 10.866 14 7C14 3.134 10.866 0 7 0ZM7 12.6C4.046 12.6 1.4 9.954 1.4 7C1.4 4.046 4.046 1.4 7 1.4C9.954 1.4 12.6 4.046 12.6 7C12.6 9.954 9.954 12.6 7 12.6ZM6.3 9.8L3.5 7L4.305 6.195L6.3 8.19L9.695 4.795L10.5 5.6L6.3 9.8Z" fill="currentColor"/>
                      </svg>
                    </div>
                    <div className="sample-content">
                      <span className="sample-label">Example value:</span>
                      <span className="sample-value">{sampleValue}</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="contact-field-select">
                <select
                  value={mappings[varName] || ''}
                  onChange={(e) => handleMappingChange(varName, e.target.value)}
                  required
                  className={!mappings[varName] || mappings[varName] === '' ? 'error' : 'success'}
                >
                  <option value="">Select a field *</option>
                  {fixedFields.length > 0 && (
                    <optgroup label="Fixed Fields">
                      {fixedFields.map((field) => {
                        const fieldName = formatFieldName(field);
                        return (
                          <option key={fieldName} value={fieldName}>
                            {getFieldDisplayName(field)}
                          </option>
                        );
                      })}
                    </optgroup>
                  )}
                  {customFields.length > 0 && (
                    <optgroup label="Custom Fields">
                      {customFields.map((field) => {
                        const fieldName = formatFieldName(field);
                        return (
                          <option key={fieldName} value={fieldName}>
                            {getFieldDisplayName(field)}
                          </option>
                        );
                      })}
                    </optgroup>
                  )}
                </select>
                {(!mappings[varName] || mappings[varName] === '') && (
                  <span className="field-error">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M7 0C3.134 0 0 3.134 0 7C0 10.866 3.134 14 7 14C10.866 14 14 10.866 14 7C14 3.134 10.866 0 7 0ZM7.7 10.5H6.3V9.1H7.7V10.5ZM7.7 7.7H6.3V3.5H7.7V7.7Z" fill="currentColor"/>
                    </svg>
                    Field mapping is required
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default FieldMapper;