// TemplateSelectionModal.jsx
import { useState } from 'react';
import { Search, X } from 'lucide-react';

export const TemplateSelectionModal = ({ templates, onClose, onSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const getButtonTypes = (buttons) => {
    if (!buttons || buttons.length === 0) return '-';
    
    return buttons.map((button, index) => (
      <span key={index} className={`button-type ${button.type}`}>
        {button.type === 'url' ? 'URL' : 
         button.type === 'phone_number' ? 'Phone' : 
         button.type === 'quick_reply' ? 'Quick Reply' : button.type}
      </span>
    ));
  };

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.body_text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="template-selection-overlay" onClick={onClose}>
      <div className="template-selection-modal" onClick={(e) => e.stopPropagation()}>
        <div className="template-selection-header">
          <div>
            <h2>Select Template</h2>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: 'var(--gray-600)' }}>
              {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''} available
            </p>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="template-selection-content">
          {/* Search Bar */}
          <div style={{ marginBottom: '1.25rem', position: 'relative' }}>
            <Search size={18} style={{ 
              position: 'absolute', 
              left: '1rem', 
              top: '50%', 
              transform: 'translateY(-50%)',
              color: 'var(--gray-400)'
            }} />
            <input
              type="text"
              placeholder="Search templates by name, category, or content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.875rem 1rem 0.875rem 2.75rem',
                border: '2px solid var(--gray-300)',
                borderRadius: '0.625rem',
                fontSize: '0.875rem',
                transition: 'all 0.3s ease'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--primary)';
                e.target.style.boxShadow = '0 0 0 4px var(--primary-light)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--gray-300)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Table */}
          {filteredTemplates.length > 0 ? (
            <div style={{ overflowX: 'auto', borderRadius: '0.5rem', border: '1px solid var(--gray-200)' }}>
              <table className="template-selection-table">
                <thead>
                  <tr>
                    <th>S.No</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Header</th>
                    <th>Body</th>
                    <th>Footer</th>
                    <th>Buttons</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTemplates.map((template, index) => (
                    <tr key={template.id}>
                      <td style={{ fontWeight: 600, color: 'var(--gray-600)' }}>{index + 1}</td>
                      <td style={{ fontWeight: 700, color: 'var(--gray-900)' }}>{template.name}</td>
                      <td>
                        {template.category ? (
                          <span style={{
                            padding: '0.25rem 0.625rem',
                            background: 'var(--primary-light)',
                            color: 'var(--primary-dark)',
                            borderRadius: '0.375rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            border: '1px solid var(--primary)'
                          }}>
                            {template.category}
                          </span>
                        ) : '-'}
                      </td>
                      <td>
                        {template.header_type ? (
                          <div className="header-info">
                            <span className="header-type">{template.header_type}</span>
                            {template.header_type === 'text' && template.header_content && (
                              <span className="header-content">{template.header_content}</span>
                            )}
                            {(template.header_type === 'image' || template.header_type === 'video' || template.header_type === 'document') && (
                              <span className="header-content" style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                                {template.header_type === 'image' ? '📷 Image' : 
                                 template.header_type === 'video' ? '🎥 Video' : 
                                 '📄 Document'}
                              </span>
                            )}
                          </div>
                        ) : '-'}
                      </td>
                      <td>
                        <div className="template-body-content">
                          {template.body_text || '-'}
                        </div>
                      </td>
                      <td>
                        <div className="template-footer-content">
                          {template.footer_text || '-'}
                        </div>
                      </td>
                      <td>
                        <div className="template-buttons">
                          {getButtonTypes(template.buttons)}
                        </div>
                      </td>
                      <td>
                        <button 
                          className="select-template-btn"
                          onClick={() => onSelect(template)}
                        >
                          Select
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '3rem 1rem',
              color: 'var(--gray-500)'
            }}>
              <p style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                No templates found
              </p>
              <p style={{ fontSize: '0.875rem' }}>
                Try adjusting your search terms
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
