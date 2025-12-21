// src/components/FieldMapper.jsx
import { useState, useEffect } from 'react';

function FieldMapper({ templateVariables, contactFields, onMappingChange, initialMappings = {} }) {
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

  return (
    <div className="field-mapper">
      <h3>Map Template Variables to Contact Fields</h3>
      <div className="mapping-table">
        <div className="mapping-header">
          <div>Template Variable</div>
          <div>Contact Field</div>
        </div>
        {templateVariables.map((varName) => (
          <div key={varName} className="mapping-row">
            <div className="template-var">
              <span className="var-badge">{varName}</span>
            </div>
            <div className="contact-field-select">
              <select
                value={mappings[varName] || ''}
                onChange={(e) => handleMappingChange(varName, e.target.value)}
                required
                className={!mappings[varName] || mappings[varName] === '' ? 'error' : ''}
              >
                <option value="">Select a field *</option>
                {contactFields.map((field) => (
                  <option key={field} value={field}>
                    {field}
                  </option>
                ))}
              </select>
              {(!mappings[varName] || mappings[varName] === '') && (
                <span className="field-error">Field mapping is required</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FieldMapper;