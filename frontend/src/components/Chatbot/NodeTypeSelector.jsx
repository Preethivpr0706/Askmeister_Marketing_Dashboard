import React from 'react';
import { Text, Image, List, MessageSquare, Square } from 'lucide-react';

const NodeTypeSelector = ({ position, onSelect, onClose }) => {
  const nodeTypes = [
    { type: 'text', label: 'Text', icon: <Text size={20} /> },
    { type: 'image', label: 'Image', icon: <Image size={20} /> },
    { type: 'button', label: 'Button', icon: <Square size={20} /> },
    { type: 'quick_reply', label: 'Quick Reply', icon: <MessageSquare size={20} /> },
    { type: 'list', label: 'List', icon: <List size={20} /> }
  ];

  return (
    <>
      {/* Backdrop to close the selector when clicking outside */}
      <div 
        className="node-selector-backdrop" 
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 999
        }}
      />
      
      <div 
        className="node-type-selector"
        style={{
          position: 'fixed',
          top: position.y,
          left: position.x,
          zIndex: 1000,
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          padding: '12px',
          minWidth: '200px'
        }}
      >
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '8px'
        }}>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Add Node</h3>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '18px',
              padding: '0 4px',
              color: '#666'
            }}
          >
            ×
          </button>
        </div>
        
        <div className="node-types">
          {nodeTypes.map((nodeType) => (
            <div
              key={nodeType.type}
              className="node-type-item"
              onClick={() => {
                onSelect(nodeType.type);
                onClose();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '8px',
                cursor: 'pointer',
                borderRadius: '4px',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div className="node-type-icon" style={{ marginRight: '8px', display: 'flex', alignItems: 'center' }}>
                {nodeType.icon}
              </div>
              <div className="node-type-label" style={{ fontSize: '14px' }}>
                {nodeType.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default NodeTypeSelector;