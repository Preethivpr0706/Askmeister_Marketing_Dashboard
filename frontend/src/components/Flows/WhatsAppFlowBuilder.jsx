import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Save,
  Play,
  Eye,
  Download,
  Upload,
  Settings,
  Plus,
  Trash2,
  Copy,
  Undo,
  Redo,
  Smartphone,
  Monitor,
  Tablet,
  CheckCircle,
  AlertCircle,
  Info,
  Type,
  List,
  CheckSquare,
  MousePointer,
  Calendar,
  Mail,
  Phone,
  Hash,
  GripVertical,
  ChevronDown,
  ChevronUp,
  X,
  MoreVertical,
  Clipboard
} from 'lucide-react';
import './WhatsAppFlowBuilder.css';

import flowService from '../../api/flowService';
import TestFlowModal from './TestFlowModal';

const WhatsAppFlowBuilder = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = id && id !== 'create';
  
  const [screens, setScreens] = useState([]);
  const [selectedScreenId, setSelectedScreenId] = useState(null);
  const [selectedComponentId, setSelectedComponentId] = useState(null);
  const [flowData, setFlowData] = useState({
    name: '',
    description: '',
    version: '1.0.0',
    category: 'CUSTOMER_SUPPORT',
    language: 'en_US'
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(isEditing);
  const [validationErrors, setValidationErrors] = useState([]);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);

  // Derive selected screen and component from IDs
  const selectedScreen = screens.find(s => s.id === selectedScreenId);
  const selectedComponent = selectedScreen?.components.find(c => c.id === selectedComponentId);

  useEffect(() => {
    if (isEditing) {
      loadFlow();
    } else if (screens.length === 0) {
      createNewScreen('Screen_1');
    }
  }, [id, isEditing]);

  const loadFlow = async () => {
    setIsLoading(true);
    try {
      const response = await flowService.getFlowById(id);
      const flow = response.data;
      
      setFlowData({
        name: flow.name,
        description: flow.description,
        version: flow.version,
        category: flow.category,
        language: flow.language
      });

      if (flow.flow_data && flow.flow_data.screens) {
        setScreens(flow.flow_data.screens);
        setSelectedScreenId(flow.flow_data.screens[0]?.id);
      }
    } catch (error) {
      toast.error('Failed to load flow');
      console.error('Error loading flow:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createNewScreen = (name) => {
    const sanitizeId = (value) => String(value || '').replace(/[^a-zA-Z_]/g, '_');
    const generateUniqueId = (prefix = '') => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
      let result = prefix || '';
      const length = prefix ? 12 : 16;
      for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };
    
    let finalName = name;
    let counter = 1;
    while (screens.some(screen => screen.name === finalName)) {
      finalName = `${name}_${generateUniqueId().substring(0, 4)}`;
      counter++;
    }
    
    const newScreen = {
      id: generateUniqueId('screen_'),
      name: finalName,
      components: []
    };
    
    setScreens(prev => [...prev, newScreen]);
    setSelectedScreenId(newScreen.id);
  };

  const addComponent = (type) => {
    if (!selectedScreenId) return;

    const generateUniqueId = (prefix = '') => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
      let result = prefix || '';
      const length = prefix ? 12 : 16;
      for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    const componentTypes = {
      'small_heading': {
        type: 'small_heading',
        content: 'Small Heading'
      },
      'large_heading': {
        type: 'large_heading',
        content: 'Large Heading'
      },
      'paragraph': {
        type: 'paragraph',
        content: 'Paragraph text'
      },
      'single_choice': {
        type: 'single_choice',
        question: 'Choose one',
        required: false,
        options: [
          { id: generateUniqueId('option_'), text: 'Option 1', selected: false },
          { id: generateUniqueId('option_'), text: 'Option 2', selected: false }
        ]
      },
      'multiple_choice': {
        type: 'multiple_choice',
        question: 'Choose multiple',
        required: false,
        options: [
          { id: generateUniqueId('option_'), text: 'Option 1', selected: false },
          { id: generateUniqueId('option_'), text: 'Option 2', selected: false }
        ]
      },
      'text_input': {
        type: 'text_input',
        label: 'Text Input',
        required: false,
        helperText: ''
      },
      'number_input': {
        type: 'number_input',
        label: 'Number Input',
        required: false,
        helperText: ''
      },
      'email_input': {
        type: 'email_input',
        label: 'Email',
        required: false,
        helperText: ''
      },
      'phone_input': {
        type: 'phone_input',
        label: 'Phone',
        required: false,
        helperText: ''
      },
      'date_input': {
        type: 'date_input',
        label: 'Date',
        required: false,
        helperText: ''
      },
      'button': {
        type: 'button',
        text: 'Continue',
        enabled: true,
        action: 'next'
      }
    };

    const newComponent = {
      id: generateUniqueId('component_'),
      ...componentTypes[type]
    };

    setScreens(prev => prev.map(screen => 
      screen.id === selectedScreenId 
        ? { ...screen, components: [...screen.components, newComponent] }
        : screen
    ));
  };

  // FIX: Single state update function to prevent re-render issues
  const updateComponent = useCallback((componentId, updates) => {
    if (!selectedScreenId) return;
    
    setScreens(prev => prev.map(screen => 
      screen.id === selectedScreenId 
        ? { 
            ...screen, 
            components: screen.components.map(comp =>
              comp.id === componentId ? { ...comp, ...updates } : comp
            )
          }
        : screen
    ));
  }, [selectedScreenId]);

  const deleteComponent = (componentId) => {
    setScreens(prev => prev.map(screen => 
      screen.id === selectedScreenId 
        ? { ...screen, components: screen.components.filter(comp => comp.id !== componentId) }
        : screen
    ));
    
    setSelectedComponentId(null);
  };

  const deleteScreen = (screenId) => {
    setScreens(prev => prev.filter(screen => screen.id !== screenId));
    if (selectedScreenId === screenId) {
      const remainingScreens = screens.filter(screen => screen.id !== screenId);
      setSelectedScreenId(remainingScreens.length > 0 ? remainingScreens[0].id : null);
    }
  };

  const updateScreenName = (screenId, newName) => {
    const sanitizedName = newName.replace(/[^a-zA-Z_]/g, '_');
    
    const isDuplicate = screens.some(screen => screen.id !== screenId && screen.name === sanitizedName);
    
    if (isDuplicate) {
      toast.error('Screen name already exists. Please choose a different name.');
      return;
    }
    
    if (!sanitizedName || sanitizedName.trim() === '') {
      toast.error('Screen name must contain at least one alphabet or underscore.');
      return;
    }
    
    setScreens(prev => prev.map(screen => 
      screen.id === screenId ? { ...screen, name: sanitizedName } : screen
    ));
  };

  const addOption = (componentId) => {
    const generateUniqueId = (prefix = '') => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
      let result = prefix || '';
      const length = prefix ? 12 : 16;
      for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };
    
    const newOption = {
      id: generateUniqueId('option_'),
      text: 'New Option',
      selected: false
    };

    const component = selectedScreen?.components.find(c => c.id === componentId);
    if (component) {
      updateComponent(componentId, {
        options: [...(component.options || []), newOption]
      });
    }
  };

  const updateOption = (componentId, optionId, updates) => {
    const component = selectedScreen?.components.find(c => c.id === componentId);
    if (!component) return;

    const newOptions = component.options.map(option =>
      option.id === optionId ? { ...option, ...updates } : option
    );

    updateComponent(componentId, { options: newOptions });
  };

  const deleteOption = (componentId, optionId) => {
    const component = selectedScreen?.components.find(c => c.id === componentId);
    if (!component) return;

    const newOptions = component.options.filter(option => option.id !== optionId);
    updateComponent(componentId, { options: newOptions });
  };

  const validateFlow = () => {
    const errors = [];
    const warnings = [];
    
    if (!flowData.name.trim()) {
      errors.push('Flow name is required');
    }
    
    if (screens.length === 0) {
      errors.push('At least one screen is required');
    }
    
    const screenNames = new Set();
    screens.forEach((screen, index) => {
      if (!screen.name.trim()) {
        errors.push(`Screen ${index + 1} name is required`);
      } else {
        if (screenNames.has(screen.name)) {
          errors.push(`Screen ${index + 1} has duplicate name: "${screen.name}"`);
        } else {
          screenNames.add(screen.name);
        }
      }
      
      if (!screen.id || !screen.id.trim()) {
        errors.push(`Screen ${index + 1} must have a valid ID`);
      }
      
      if (screen.components.length === 0) {
        errors.push(`Screen ${index + 1} must have at least one component`);
      }
      
      screen.components.forEach((component, compIndex) => {
        if (!component.id || !component.id.trim()) {
          errors.push(`Screen ${index + 1}, Component ${compIndex + 1} must have a valid ID`);
        }
        
        if (!component.type) {
          errors.push(`Screen ${index + 1}, Component ${compIndex + 1} must have a type`);
        }
        
        switch (component.type) {
          case 'small_heading':
          case 'large_heading':
          case 'heading':
            if (!component.content || !component.content.trim()) {
              errors.push(`Screen ${index + 1}, Component ${compIndex + 1} (${component.type}) must have content`);
            }
            break;
            
          case 'paragraph':
          case 'text':
          case 'body':
            if (!component.content || !component.content.trim()) {
              errors.push(`Screen ${index + 1}, Component ${compIndex + 1} (${component.type}) must have content`);
            }
            break;
            
          case 'text_input':
          case 'number_input':
          case 'email_input':
          case 'phone_input':
          case 'date_input':
            if (!component.label || !component.label.trim()) {
              errors.push(`Screen ${index + 1}, Component ${compIndex + 1} (${component.type}) must have a label`);
            }
            break;
            
          case 'single_choice':
          case 'multiple_choice':
            if (!component.question || !component.question.trim()) {
              errors.push(`Screen ${index + 1}, Component ${compIndex + 1} (${component.type}) must have a question`);
            }
            if (!component.options || component.options.length === 0) {
              errors.push(`Screen ${index + 1}, Component ${compIndex + 1} (${component.type}) must have at least one option`);
            } else {
              component.options.forEach((option, optIndex) => {
                if (!option.id || !option.id.trim()) {
                  errors.push(`Screen ${index + 1}, Component ${compIndex + 1}, Option ${optIndex + 1} must have a valid ID`);
                }
                if (!option.text || !option.text.trim()) {
                  errors.push(`Screen ${index + 1}, Component ${compIndex + 1}, Option ${optIndex + 1} must have text`);
                }
              });
            }
            break;
            
          case 'button':
            if (!component.text || !component.text.trim()) {
              errors.push(`Screen ${index + 1}, Component ${compIndex + 1} (button) must have text`);
            }
            break;
        }
      });
    });
    
    if (screens.length > 0) {
      const lastScreen = screens[screens.length - 1];
      const hasFooter = lastScreen.components.some(comp => comp.type === 'button');
      if (!hasFooter) {
        warnings.push('Last screen should have a button for completion');
      }
    }
    
    setValidationErrors([...errors, ...warnings]);
    return errors.length === 0;
  };

  const saveFlow = async () => {
    if (!validateFlow()) {
      toast.error('Please fix validation errors before saving');
      return;
    }

    setIsSaving(true);
    try {
      const flowPayload = {
        ...flowData,
        flow_data: { screens }
      };

      console.log('Saving flow:', flowPayload);
      
      if (isEditing) {
        const response = await flowService.updateFlow(id, flowPayload);
        toast.success('Flow updated successfully');
      } else {
        const response = await flowService.createFlow(flowPayload);
        toast.success('Flow created successfully');
        navigate(`/flows/${response.data.id}/edit`);
      }
    } catch (error) {
      toast.error('Failed to save flow: ' + error.message);
      console.error('Error saving flow:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const testFlow = async () => {
    if (!validateFlow()) {
      toast.error('Please fix validation errors before testing');
      return;
    }

    setIsTestModalOpen(true);
  };

  const handleTestFlow = async (phoneNumber) => {
    if (!id && !isEditing) {
      toast.error('Flow ID not available');
      setIsTestModalOpen(false);
      return;
    }

    try {
      console.log('Testing flow with:', phoneNumber);

      if (isEditing) {
        await flowService.testFlow(id, phoneNumber);
      } else {
        await saveFlow();
        return;
      }

      toast.success('Test flow sent successfully');
      setIsTestModalOpen(false);
    } catch (error) {
      toast.error('Failed to send test flow: ' + error.message);
      console.error('Error testing flow:', error);
    }
  };

  const copyFlowJSON = () => {
    const flowJSON = {
      ...flowData,
      screens
    };
    
    navigator.clipboard.writeText(JSON.stringify(flowJSON, null, 2));
    toast.success('Flow JSON copied to clipboard');
  };

  const renderComponent = (component) => {
    switch (component.type) {
      case 'small_heading':
      case 'large_heading':
        return (
          <div className={`whatsapp-heading ${component.style}`}>
            {component.content || 'Heading'}
          </div>
        );

      case 'paragraph':
        return (
          <div className="whatsapp-paragraph">
            {component.content || 'Paragraph text'}
          </div>
        );

      case 'single_choice':
      case 'multiple_choice':
        return (
          <div className="whatsapp-choice">
            <div className="choice-question">{component.question || 'Choose one'}</div>
            {component.options?.map(option => (
              <div key={option.id} className="choice-option">
                <input
                  type={component.type === 'single_choice' ? 'radio' : 'checkbox'}
                  name={component.type === 'single_choice' ? component.id : undefined}
                  checked={option.selected}
                  readOnly
                />
                <span>{option.text}</span>
              </div>
            ))}
          </div>
        );

      case 'text_input':
      case 'number_input':
      case 'email_input':
      case 'phone_input':
        return (
          <div className="whatsapp-input">
            <label>{component.label || 'Input'}</label>
            <input
              type={component.type.replace('_input', '')}
              required={component.required}
              readOnly
            />
          </div>
        );

      case 'date_input':
        return (
          <div className="whatsapp-input">
            <label>{component.label || 'Date'}</label>
            <input
              type="date"
              required={component.required}
              readOnly
            />
          </div>
        );

      case 'button':
        return (
          <div className="whatsapp-button">
            <button className={`btn btn-${component.style || 'primary'}`}>
              {component.text || 'Button'}
            </button>
          </div>
        );

      default:
        return <div className="whatsapp-unknown">Unknown component</div>;
    }
  };

  if (isLoading) {
    return (
      <div className="whatsapp-flow-builder">
        <div className="flow-builder-loading">
          <div className="loading-spinner-container">
            <div className="loading-spinner"></div>
            <p className="loading-text">Loading flow builder...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="whatsapp-flow-builder">
      <div className="flow-toolbar">
        <div className="toolbar-left">
          <button
            className="btn btn-secondary"
            onClick={() => navigate('/flows')}
          >
            ← Back to Flows
          </button>
          
          <div className="flow-info">
            <input
              type="text"
              placeholder="Flow Name"
              value={flowData.name}
              onChange={(e) => setFlowData(prev => ({ ...prev, name: e.target.value }))}
              className="flow-name-input"
            />
            <select
              value={flowData.category}
              onChange={(e) => setFlowData(prev => ({ ...prev, category: e.target.value }))}
              className="category-select"
            >
              {flowService.getFlowCategories().map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="toolbar-right">
          <button
            className="btn btn-secondary"
            onClick={testFlow}
          >
            <Play size={16} />
            Test Flow
          </button>
          <button
            className="btn btn-primary"
            onClick={saveFlow}
            disabled={isSaving}
          >
            <Save size={16} />
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {validationErrors.length > 0 && (
        <div className="validation-panel">
          {validationErrors.map((error, index) => (
            <div key={index} className="validation-error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flow-builder-content">
        <div className="screens-panel">
          <div className="panel-header">
            <h3>Screens</h3>
          </div>
          
          <div className="screens-list">
            {screens.map((screen, index) => (
              <div
                key={screen.id}
                className={`screen-item ${selectedScreenId === screen.id ? 'active' : ''}`}
                onClick={() => setSelectedScreenId(screen.id)}
              >
                <div className="screen-drag-handle">
                  <GripVertical size={16} />
                </div>
                <div className="screen-content">
                  <span className="screen-name">{screen.name}</span>
                  <span className="screen-number">{index + 1} of {screens.length}</span>
                </div>
                <button
                  className="screen-delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteScreen(screen.id);
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
          
          <button
            className="add-screen-btn"
            onClick={() => createNewScreen(`Screen_${screens.length + 1}`)}
          >
            <Plus size={16} />
            Add new
          </button>
        </div>

        <div className="edit-content-panel">
          <div className="panel-header">
            <h3>Edit content</h3>
          </div>
          
          {selectedScreen ? (
            <div className="edit-content">
              <div className="content-section">
                <div className="section-header">
                  <span>Screen title (only alphabets and underscores)</span>
                  <ChevronDown size={16} />
                </div>
                <div className="section-content">
                  <input
                    type="text"
                    value={selectedScreen.name}
                    onChange={(e) => updateScreenName(selectedScreen.id, e.target.value)}
                    className="screen-title-input"
                    placeholder="Enter screen name (e.g., Welcome_Screen)"
                  />
                  <small>Only alphabets (A-Z, a-z) and underscores (_) are allowed</small>
                </div>
              </div>

              <div className="components-section">
                {selectedScreen.components.map((component, index) => (
                  <div
                    key={component.id}
                    className={`component-item ${selectedComponentId === component.id ? 'selected' : ''}`}
                    onClick={() => setSelectedComponentId(component.id)}
                  >
                    <div className="component-drag-handle">
                      <GripVertical size={16} />
                    </div>
                    <div className="component-content">
                      <span className="component-type">
                        {component.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                      <span className="component-preview">
                        {component.content || component.question || component.label || component.text || 'Component'}
                      </span>
                    </div>
                    <div className="component-actions">
                      <ChevronDown size={16} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="add-content-section">
                <button className="add-content-btn">
                  <Plus size={16} />
                  Add content
                </button>
                <div className="content-dropdown">
                  <button onClick={() => addComponent('small_heading')}>Small Heading</button>
                  <button onClick={() => addComponent('large_heading')}>Large Heading</button>
                  <button onClick={() => addComponent('paragraph')}>Paragraph</button>
                  <button onClick={() => addComponent('single_choice')}>Single Choice</button>
                  <button onClick={() => addComponent('multiple_choice')}>Multiple Choice</button>
                  <button onClick={() => addComponent('text_input')}>Text Input</button>
                  <button onClick={() => addComponent('number_input')}>Number Input</button>
                  <button onClick={() => addComponent('email_input')}>Email Input</button>
                  <button onClick={() => addComponent('phone_input')}>Phone Input</button>
                  <button onClick={() => addComponent('date_input')}>Date Input</button>
                  <button onClick={() => addComponent('button')}>Button</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="no-screen-selected">
              <p>Select a screen to edit content</p>
            </div>
          )}
        </div>

        <div className="preview-panel">
          <div className="panel-header">
            <h3>Preview</h3>
            <div className="preview-actions">
              <button className="copy-json-btn" onClick={copyFlowJSON}>
                <Clipboard size={16} />
                Copy Flow JSON
              </button>
              
              <button className="settings-btn">
                <Settings size={16} />
              </button>
            </div>
          </div>
          
          <div className="preview-container">
            <div className="mobile-preview">
              <div className="mobile-frame">
                <div className="mobile-header">
                  <button className="close-btn">×</button>
                  <span className="mobile-title">{selectedScreen?.name || 'Screen'}</span>
                  <button className="more-btn">
                    <MoreVertical size={16} />
                  </button>
                </div>
                
                <div className="mobile-content">
                  {selectedScreen?.components.map(component => (
                    <div key={component.id} className="mobile-component">
                      {renderComponent(component)}
                    </div>
                  ))}
                </div>
                
                <div className="mobile-footer">
                  <div className="managed-by">
                    Managed by the business. <a href="#">Learn more</a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {selectedComponent && (
          <div className="component-editor-sidebar">
            <div className="sidebar-header">
              <h3>Edit Component</h3>
              <button
                className="close-btn"
                onClick={() => setSelectedComponentId(null)}
              >
                ×
              </button>
            </div>
            
            <div className="sidebar-content">
              <ComponentEditor
                component={selectedComponent}
                onUpdate={(updates) => updateComponent(selectedComponent.id, updates)}
                onDelete={() => deleteComponent(selectedComponent.id)}
                onAddOption={() => addOption(selectedComponent.id)}
                onUpdateOption={(optionId, updates) => updateOption(selectedComponent.id, optionId, updates)}
                onDeleteOption={(optionId) => deleteOption(selectedComponent.id, optionId)}
              />
            </div>
          </div>
        )}
      </div>

      <TestFlowModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        onTest={handleTestFlow}
        flowName={flowData.name}
        isLoading={isSaving}
      />
    </div>
  );
};

// Component Editor Component
const ComponentEditor = ({ component, onUpdate, onDelete, onAddOption, onUpdateOption, onDeleteOption }) => {
  const renderEditor = () => {
    switch (component.type) {
      case 'small_heading':
      case 'large_heading':
        return (
          <div className="component-editor">
            <div className="form-group">
              <label>Heading Text</label>
              <textarea
                value={component.content || ''}
                onChange={(e) => onUpdate({ content: e.target.value })}
                placeholder="Enter heading text"
                rows={2}
              />
            </div>
          </div>
        );

      case 'paragraph':
        return (
          <div className="component-editor">
            <div className="form-group">
              <label>Paragraph Text</label>
              <textarea
                value={component.content || ''}
                onChange={(e) => onUpdate({ content: e.target.value })}
                placeholder="Enter paragraph text"
                rows={3}
              />
            </div>
          </div>
        );

      case 'single_choice':
      case 'multiple_choice':
        return (
          <div className="component-editor">
            <div className="form-group">
              <label>Question</label>
              <input
                type="text"
                value={component.question || ''}
                onChange={(e) => onUpdate({ question: e.target.value })}
                placeholder="Enter question"
              />
            </div>
            
            <div className="form-group">
              <label>Options</label>
              {component.options?.map(option => (
                <div key={option.id} className="option-item">
                  <input
                    type="text"
                    value={option.text}
                    onChange={(e) => onUpdateOption(option.id, { text: e.target.value })}
                    placeholder="Option text"
                  />
                  <button
                    className="btn-remove"
                    onClick={() => onDeleteOption(option.id)}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button onClick={onAddOption} className="add-option-btn">
                Add Option
              </button>
            </div>
          </div>
        );

      case 'text_input':
      case 'number_input':
      case 'email_input':
      case 'phone_input':
        return (
          <div className="component-editor">
            <div className="form-group">
              <label>Label</label>
              <input
                type="text"
                value={component.label || ''}
                onChange={(e) => onUpdate({ label: e.target.value })}
                placeholder="Enter label"
              />
            </div>
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={component.required || false}
                  onChange={(e) => onUpdate({ required: e.target.checked })}
                />
                Required field
              </label>
            </div>
            <div className="form-group">
              <label>Helper Text (optional)</label>
              <input
                type="text"
                value={component.helperText || ''}
                onChange={(e) => onUpdate({ helperText: e.target.value })}
                placeholder="Enter helper text"
              />
            </div>
          </div>
        );

      case 'date_input':
        return (
          <div className="component-editor">
            <div className="form-group">
              <label>Label</label>
              <input
                type="text"
                value={component.label || ''}
                onChange={(e) => onUpdate({ label: e.target.value })}
                placeholder="Enter label"
              />
            </div>
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={component.required || false}
                  onChange={(e) => onUpdate({ required: e.target.checked })}
                />
                Required field
              </label>
            </div>
            <div className="form-group">
              <label>Helper Text (optional)</label>
              <input
                type="text"
                value={component.helperText || ''}
                onChange={(e) => onUpdate({ helperText: e.target.value })}
                placeholder="Enter helper text"
              />
            </div>
          </div>
        );

      case 'button':
        return (
          <div className="component-editor">
            <div className="form-group">
              <label>Button Text</label>
              <input
                type="text"
                value={component.text || ''}
                onChange={(e) => onUpdate({ text: e.target.value })}
                placeholder="Enter button text"
              />
            </div>
            <div className="form-group">
              <label>Button Style</label>
              <select
                value={component.style || 'primary'}
                onChange={(e) => onUpdate({ style: e.target.value })}
              >
                <option value="primary">Primary</option>
                <option value="secondary">Secondary</option>
                <option value="outline">Outline</option>
              </select>
            </div>
          </div>
        );

      default:
        return <div>No editor available for this component type</div>;
    }
  };

  return (
    <div>
      {renderEditor()}
      <div className="sidebar-footer">
        <button className="btn btn-danger" onClick={onDelete}>
          <Trash2 size={16} />
          Delete Component
        </button>
      </div>
    </div>
  );
};

export default WhatsAppFlowBuilder;
