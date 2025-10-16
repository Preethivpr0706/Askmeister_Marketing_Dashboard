import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Trash2,
  Settings,
  Type,
  Image,
  List,
  CheckSquare,
  MessageSquare,
  MousePointer,
  GitBranch,
  Plus,
  Minus
} from 'lucide-react';
import './FlowEditorSidebar.css';

const FlowEditorSidebar = ({ node, onUpdate, onDelete, onClose }) => {
  const [formData, setFormData] = useState({
    title: node.data.title || '',
    content: node.data.content || '',
    properties: node.data.properties || {}
  });

  useEffect(() => {
    setFormData({
      title: node.data.title || '',
      content: node.data.content || '',
      properties: node.data.properties || {}
    });
  }, [node]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePropertyChange = (property, value) => {
    setFormData(prev => ({
      ...prev,
      properties: {
        ...prev.properties,
        [property]: value
      }
    }));
  };

  const handleNestedPropertyChange = (parent, property, value) => {
    setFormData(prev => ({
      ...prev,
      properties: {
        ...prev.properties,
        [parent]: {
          ...prev.properties[parent],
          [property]: value
        }
      }
    }));
  };

  const handleArrayItemChange = (arrayName, index, property, value) => {
    setFormData(prev => {
      const newArray = [...(prev.properties[arrayName] || [])];
      newArray[index] = {
        ...newArray[index],
        [property]: value
      };
      return {
        ...prev,
        properties: {
          ...prev.properties,
          [arrayName]: newArray
        }
      };
    });
  };

  const addArrayItem = (arrayName, defaultItem) => {
    setFormData(prev => ({
      ...prev,
      properties: {
        ...prev.properties,
        [arrayName]: [
          ...(prev.properties[arrayName] || []),
          defaultItem
        ]
      }
    }));
  };

  const removeArrayItem = (arrayName, index) => {
    setFormData(prev => ({
      ...prev,
      properties: {
        ...prev.properties,
        [arrayName]: prev.properties[arrayName].filter((_, i) => i !== index)
      }
    }));
  };

  const handleSave = () => {
    onUpdate(formData);
  };

  const renderScreenNodeEditor = () => (
    <div className="node-editor-content">
      <div className="form-group">
        <label>Title</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => handleInputChange('title', e.target.value)}
          placeholder="Screen title"
        />
      </div>

      <div className="form-group">
        <label>Content</label>
        <textarea
          value={formData.content}
          onChange={(e) => handleInputChange('content', e.target.value)}
          placeholder="Screen content"
          rows={3}
        />
      </div>

      <div className="form-group">
        <label>Header</label>
        <select
          value={formData.properties.header?.type || 'text'}
          onChange={(e) => handleNestedPropertyChange('header', 'type', e.target.value)}
        >
          <option value="text">Text</option>
          <option value="image">Image</option>
          <option value="none">None</option>
        </select>
        <input
          type="text"
          value={formData.properties.header?.content || ''}
          onChange={(e) => handleNestedPropertyChange('header', 'content', e.target.value)}
          placeholder="Header content"
        />
      </div>

      <div className="form-group">
        <label>Footer</label>
        <input
          type="text"
          value={formData.properties.footer || ''}
          onChange={(e) => handlePropertyChange('footer', e.target.value)}
          placeholder="Footer text"
        />
      </div>

      <div className="form-group">
        <label>Buttons</label>
        {formData.properties.buttons?.map((button, index) => (
          <div key={index} className="array-item">
            <input
              type="text"
              value={button.text || ''}
              onChange={(e) => handleArrayItemChange('buttons', index, 'text', e.target.value)}
              placeholder="Button text"
            />
            <select
              value={button.type || 'quick_reply'}
              onChange={(e) => handleArrayItemChange('buttons', index, 'type', e.target.value)}
            >
              <option value="quick_reply">Quick Reply</option>
              <option value="url">URL</option>
              <option value="phone_number">Phone Number</option>
            </select>
            <button
              type="button"
              className="btn-remove"
              onClick={() => removeArrayItem('buttons', index)}
            >
              <Minus size={16} />
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn-add"
          onClick={() => addArrayItem('buttons', { text: '', type: 'quick_reply' })}
        >
          <Plus size={16} />
          Add Button
        </button>
      </div>
    </div>
  );

  const renderFormNodeEditor = () => (
    <div className="node-editor-content">
      <div className="form-group">
        <label>Title</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => handleInputChange('title', e.target.value)}
          placeholder="Form title"
        />
      </div>

      <div className="form-group">
        <label>Description</label>
        <textarea
          value={formData.content}
          onChange={(e) => handleInputChange('content', e.target.value)}
          placeholder="Form description"
          rows={3}
        />
      </div>

      <div className="form-group">
        <label>Form Fields</label>
        {formData.properties.fields?.map((field, index) => (
          <div key={index} className="array-item">
            <input
              type="text"
              value={field.label || ''}
              onChange={(e) => handleArrayItemChange('fields', index, 'label', e.target.value)}
              placeholder="Field label"
            />
            <select
              value={field.type || 'text'}
              onChange={(e) => handleArrayItemChange('fields', index, 'type', e.target.value)}
            >
              <option value="text">Text</option>
              <option value="email">Email</option>
              <option value="phone">Phone</option>
              <option value="number">Number</option>
              <option value="date">Date</option>
              <option value="select">Select</option>
            </select>
            <input
              type="text"
              value={field.placeholder || ''}
              onChange={(e) => handleArrayItemChange('fields', index, 'placeholder', e.target.value)}
              placeholder="Placeholder"
            />
            <button
              type="button"
              className="btn-remove"
              onClick={() => removeArrayItem('fields', index)}
            >
              <Minus size={16} />
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn-add"
          onClick={() => addArrayItem('fields', { label: '', type: 'text', placeholder: '' })}
        >
          <Plus size={16} />
          Add Field
        </button>
      </div>

      <div className="form-group">
        <label>Submit Button</label>
        <input
          type="text"
          value={formData.properties.submitButton?.text || 'Submit'}
          onChange={(e) => handleNestedPropertyChange('submitButton', 'text', e.target.value)}
          placeholder="Submit button text"
        />
      </div>
    </div>
  );

  const renderListPickerNodeEditor = () => (
    <div className="node-editor-content">
      <div className="form-group">
        <label>Title</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => handleInputChange('title', e.target.value)}
          placeholder="List title"
        />
      </div>

      <div className="form-group">
        <label>Description</label>
        <textarea
          value={formData.content}
          onChange={(e) => handleInputChange('content', e.target.value)}
          placeholder="List description"
          rows={3}
        />
      </div>

      <div className="form-group">
        <label>Options</label>
        {formData.properties.options?.map((option, index) => (
          <div key={index} className="array-item">
            <input
              type="text"
              value={option.title || option.text || ''}
              onChange={(e) => handleArrayItemChange('options', index, 'title', e.target.value)}
              placeholder="Option title"
            />
            <input
              type="text"
              value={option.description || ''}
              onChange={(e) => handleArrayItemChange('options', index, 'description', e.target.value)}
              placeholder="Option description"
            />
            <button
              type="button"
              className="btn-remove"
              onClick={() => removeArrayItem('options', index)}
            >
              <Minus size={16} />
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn-add"
          onClick={() => addArrayItem('options', { title: '', description: '' })}
        >
          <Plus size={16} />
          Add Option
        </button>
      </div>
    </div>
  );

  const renderConfirmationNodeEditor = () => (
    <div className="node-editor-content">
      <div className="form-group">
        <label>Title</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => handleInputChange('title', e.target.value)}
          placeholder="Confirmation title"
        />
      </div>

      <div className="form-group">
        <label>Message</label>
        <textarea
          value={formData.content}
          onChange={(e) => handleInputChange('content', e.target.value)}
          placeholder="Confirmation message"
          rows={3}
        />
      </div>

      <div className="form-group">
        <label>Confirm Button</label>
        <input
          type="text"
          value={formData.properties.confirmButton?.text || 'Yes'}
          onChange={(e) => handleNestedPropertyChange('confirmButton', 'text', e.target.value)}
          placeholder="Confirm button text"
        />
      </div>

      <div className="form-group">
        <label>Cancel Button</label>
        <input
          type="text"
          value={formData.properties.cancelButton?.text || 'No'}
          onChange={(e) => handleNestedPropertyChange('cancelButton', 'text', e.target.value)}
          placeholder="Cancel button text"
        />
      </div>
    </div>
  );

  const renderTextNodeEditor = () => (
    <div className="node-editor-content">
      <div className="form-group">
        <label>Message</label>
        <textarea
          value={formData.content || formData.properties.message || ''}
          onChange={(e) => {
            handleInputChange('content', e.target.value);
            handlePropertyChange('message', e.target.value);
          }}
          placeholder="Text message content"
          rows={4}
        />
      </div>
    </div>
  );

  const renderImageNodeEditor = () => (
    <div className="node-editor-content">
      <div className="form-group">
        <label>Image URL</label>
        <input
          type="url"
          value={formData.properties.url || ''}
          onChange={(e) => handlePropertyChange('url', e.target.value)}
          placeholder="https://example.com/image.jpg"
        />
      </div>

      <div className="form-group">
        <label>Caption</label>
        <textarea
          value={formData.properties.caption || ''}
          onChange={(e) => handlePropertyChange('caption', e.target.value)}
          placeholder="Image caption"
          rows={3}
        />
      </div>

      {formData.properties.url && (
        <div className="form-group">
          <label>Preview</label>
          <div className="image-preview">
            <img
              src={formData.properties.url}
              alt="Preview"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }}
            />
            <div className="image-error" style={{ display: 'none' }}>
              Failed to load image
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderButtonNodeEditor = () => (
    <div className="node-editor-content">
      <div className="form-group">
        <label>Button Text</label>
        <input
          type="text"
          value={formData.properties.text || ''}
          onChange={(e) => handlePropertyChange('text', e.target.value)}
          placeholder="Button text"
        />
      </div>

      <div className="form-group">
        <label>Action</label>
        <input
          type="text"
          value={formData.properties.action || ''}
          onChange={(e) => handlePropertyChange('action', e.target.value)}
          placeholder="Button action"
        />
      </div>

      <div className="form-group">
        <label>Style</label>
        <select
          value={formData.properties.style || 'primary'}
          onChange={(e) => handlePropertyChange('style', e.target.value)}
        >
          <option value="primary">Primary</option>
          <option value="secondary">Secondary</option>
          <option value="success">Success</option>
          <option value="danger">Danger</option>
        </select>
      </div>
    </div>
  );

  const renderConditionNodeEditor = () => (
    <div className="node-editor-content">
      <div className="form-group">
        <label>Field</label>
        <input
          type="text"
          value={formData.properties.field || ''}
          onChange={(e) => handlePropertyChange('field', e.target.value)}
          placeholder="Field to check"
        />
      </div>

      <div className="form-group">
        <label>Operator</label>
        <select
          value={formData.properties.operator || 'equals'}
          onChange={(e) => handlePropertyChange('operator', e.target.value)}
        >
          <option value="equals">Equals</option>
          <option value="not_equals">Not Equals</option>
          <option value="contains">Contains</option>
          <option value="greater_than">Greater Than</option>
          <option value="less_than">Less Than</option>
          <option value="is_empty">Is Empty</option>
          <option value="is_not_empty">Is Not Empty</option>
        </select>
      </div>

      <div className="form-group">
        <label>Value</label>
        <input
          type="text"
          value={formData.properties.value || ''}
          onChange={(e) => handlePropertyChange('value', e.target.value)}
          placeholder="Value to compare"
        />
      </div>

      <div className="form-group">
        <label>True Path</label>
        <input
          type="text"
          value={formData.properties.truePath || ''}
          onChange={(e) => handlePropertyChange('truePath', e.target.value)}
          placeholder="Node ID for true condition"
        />
      </div>

      <div className="form-group">
        <label>False Path</label>
        <input
          type="text"
          value={formData.properties.falsePath || ''}
          onChange={(e) => handlePropertyChange('falsePath', e.target.value)}
          placeholder="Node ID for false condition"
        />
      </div>
    </div>
  );

  const getNodeIcon = (type) => {
    const icons = {
      screen: <Type size={20} />,
      form: <CheckSquare size={20} />,
      list_picker: <List size={20} />,
      confirmation: <CheckSquare size={20} />,
      text: <MessageSquare size={20} />,
      image: <Image size={20} />,
      button: <MousePointer size={20} />,
      condition: <GitBranch size={20} />
    };
    return icons[type] || <Settings size={20} />;
  };

  const renderNodeEditor = () => {
    switch (node.type) {
      case 'screen':
        return renderScreenNodeEditor();
      case 'form':
        return renderFormNodeEditor();
      case 'list_picker':
        return renderListPickerNodeEditor();
      case 'confirmation':
        return renderConfirmationNodeEditor();
      case 'text':
        return renderTextNodeEditor();
      case 'image':
        return renderImageNodeEditor();
      case 'button':
        return renderButtonNodeEditor();
      case 'condition':
        return renderConditionNodeEditor();
      default:
        return (
          <div className="node-editor-content">
            <p>No editor available for this node type.</p>
          </div>
        );
    }
  };

  return (
    <div className="flow-editor-sidebar">
      <div className="sidebar-header">
        <div className="node-info">
          {getNodeIcon(node.type)}
          <div>
            <h3>{node.type.charAt(0).toUpperCase() + node.type.slice(1)} Node</h3>
            <p>ID: {node.id}</p>
          </div>
        </div>
        <button className="close-btn" onClick={onClose}>
          <X size={20} />
        </button>
      </div>

      <div className="sidebar-content">
        {renderNodeEditor()}
      </div>

      <div className="sidebar-footer">
        <button className="btn btn-danger" onClick={onDelete}>
          <Trash2 size={16} />
          Delete Node
        </button>
        <button className="btn btn-primary" onClick={handleSave}>
          <Save size={16} />
          Save Changes
        </button>
      </div>
    </div>
  );
};

export default FlowEditorSidebar;
