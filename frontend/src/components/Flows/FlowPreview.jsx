import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  ArrowLeft,
  Play,
  Download,
  Share,
  Eye,
  Smartphone,
  Monitor,
  Tablet,
  CheckCircle,
  AlertCircle,
  Info,
  Upload
} from 'lucide-react';
import flowService from '../../api/flowService';
import './FlowPreview.css';

const FlowPreview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [flow, setFlow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [previewMode, setPreviewMode] = useState('mobile'); // mobile, tablet, desktop
  const [currentNode, setCurrentNode] = useState(null);
  const [flowPath, setFlowPath] = useState([]);
  const [testPhoneNumber, setTestPhoneNumber] = useState('');
  const [showTestModal, setShowTestModal] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    if (id) {
      loadFlow();
    }
  }, [id]);

  const loadFlow = async () => {
    try {
      setLoading(true);
      const response = await flowService.getFlowById(id);
      setFlow(response.data);
      
      // Set the first node as current
      if (response.data.flow_data?.nodes?.length > 0) {
        const startNode = response.data.flow_data.nodes.find(node => 
          node.id === 'start' || !response.data.flow_data.edges?.some(edge => edge.target === node.id)
        );
        setCurrentNode(startNode || response.data.flow_data.nodes[0]);
        setFlowPath([startNode || response.data.flow_data.nodes[0]]);
      }
    } catch (error) {
      toast.error('Failed to load flow');
      console.error('Error loading flow:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNodeAction = (action, value) => {
    if (!flow?.flow_data?.edges) return;

    // Find the next node based on the action
    const nextEdge = flow.flow_data.edges.find(edge => 
      edge.source === currentNode.id && 
      (edge.buttonText === action || edge.conditionValue === value || edge.type === 'default')
    );

    if (nextEdge) {
      const nextNode = flow.flow_data.nodes.find(node => node.id === nextEdge.target);
      if (nextNode) {
        setCurrentNode(nextNode);
        setFlowPath(prev => [...prev, nextNode]);
      }
    }
  };

  const handleTestFlow = async () => {
    if (!testPhoneNumber.trim()) {
      toast.error('Please enter a phone number');
      return;
    }

    setIsTesting(true);
    try {
      await flowService.testFlow(id, testPhoneNumber);
      toast.success('Test flow sent successfully');
      setShowTestModal(false);
      setTestPhoneNumber('');
    } catch (error) {
      toast.error('Failed to send test flow');
      console.error('Error testing flow:', error);
    } finally {
      setIsTesting(false);
    }
  };

  const handlePublishFlow = async () => {
    if (!window.confirm('Are you sure you want to publish this flow to WhatsApp? This will submit it for review.')) {
      return;
    }

    try {
      const result = await flowService.publishFlow(id);
      toast.success('Flow published successfully! It will be reviewed by WhatsApp.');
      
      // Refresh the flow data to update the status
      fetchFlow();
    } catch (error) {
      toast.error('Failed to publish flow');
      console.error('Error publishing flow:', error);
    }
  };

  const renderNodeContent = (node) => {
    if (!node) return null;

    switch (node.type) {
      case 'screen':
        return (
          <div className="preview-screen">
            {node.data.properties?.header && (
              <div className="preview-header">
                {node.data.properties.header.type === 'text' && (
                  <h2>{node.data.properties.header.content}</h2>
                )}
                {node.data.properties.header.type === 'image' && (
                  <img src={node.data.properties.header.content} alt="Header" />
                )}
              </div>
            )}
            
            <div className="preview-body">
              <p>{node.data.content}</p>
            </div>

            {node.data.properties?.footer && (
              <div className="preview-footer">
                <p>{node.data.properties.footer}</p>
              </div>
            )}

            {node.data.properties?.buttons && node.data.properties.buttons.length > 0 && (
              <div className="preview-buttons">
                {node.data.properties.buttons.map((button, index) => (
                  <button
                    key={index}
                    className="preview-button"
                    onClick={() => handleNodeAction(button.text, button.value)}
                  >
                    {button.text}
                  </button>
                ))}
              </div>
            )}
          </div>
        );

      case 'form':
        return (
          <div className="preview-form">
            <h2>{node.data.title || 'Form'}</h2>
            <p>{node.data.content}</p>
            
            {node.data.properties?.fields && (
              <div className="preview-form-fields">
                {node.data.properties.fields.map((field, index) => (
                  <div key={index} className="preview-field">
                    <label>{field.label}</label>
                    <input
                      type={field.type}
                      placeholder={field.placeholder}
                      disabled
                    />
                  </div>
                ))}
              </div>
            )}

            <button
              className="preview-button preview-button-primary"
              onClick={() => handleNodeAction('submit', 'form_submit')}
            >
              {node.data.properties?.submitButton?.text || 'Submit'}
            </button>
          </div>
        );

      case 'list_picker':
        return (
          <div className="preview-list-picker">
            <h2>{node.data.title || 'Select Option'}</h2>
            <p>{node.data.content}</p>
            
            {node.data.properties?.options && (
              <div className="preview-options">
                {node.data.properties.options.map((option, index) => (
                  <button
                    key={index}
                    className="preview-option"
                    onClick={() => handleNodeAction(option.title || option.text, option.value)}
                  >
                    <div className="option-title">{option.title || option.text}</div>
                    {option.description && (
                      <div className="option-description">{option.description}</div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        );

      case 'confirmation':
        return (
          <div className="preview-confirmation">
            <h2>{node.data.title || 'Confirmation'}</h2>
            <p>{node.data.content}</p>
            
            <div className="preview-confirmation-buttons">
              <button
                className="preview-button preview-button-success"
                onClick={() => handleNodeAction('confirm', 'yes')}
              >
                {node.data.properties?.confirmButton?.text || 'Yes'}
              </button>
              <button
                className="preview-button preview-button-danger"
                onClick={() => handleNodeAction('cancel', 'no')}
              >
                {node.data.properties?.cancelButton?.text || 'No'}
              </button>
            </div>
          </div>
        );

      case 'text':
        return (
          <div className="preview-text">
            <p>{node.data.content || node.data.properties?.message}</p>
          </div>
        );

      case 'image':
        return (
          <div className="preview-image">
            {node.data.properties?.url && (
              <img src={node.data.properties.url} alt="Flow image" />
            )}
            {node.data.properties?.caption && (
              <p className="preview-caption">{node.data.properties.caption}</p>
            )}
          </div>
        );

      case 'button':
        return (
          <div className="preview-button-node">
            <button
              className={`preview-button preview-button-${node.data.properties?.style || 'primary'}`}
              onClick={() => handleNodeAction(node.data.properties?.text, node.data.properties?.action)}
            >
              {node.data.properties?.text || 'Button'}
            </button>
          </div>
        );

      case 'condition':
        return (
          <div className="preview-condition">
            <h3>Condition Check</h3>
            <p>
              If <strong>{node.data.properties?.field}</strong>{' '}
              <strong>{node.data.properties?.operator}</strong>{' '}
              <strong>{node.data.properties?.value}</strong>
            </p>
            <div className="preview-condition-paths">
              <button
                className="preview-button preview-button-success"
                onClick={() => handleNodeAction('true', 'true')}
              >
                True Path
              </button>
              <button
                className="preview-button preview-button-danger"
                onClick={() => handleNodeAction('false', 'false')}
              >
                False Path
              </button>
            </div>
          </div>
        );

      default:
        return (
          <div className="preview-unknown">
            <p>Unknown node type: {node.type}</p>
          </div>
        );
    }
  };

  const getPreviewDimensions = () => {
    switch (previewMode) {
      case 'mobile':
        return { width: '375px', height: '667px' };
      case 'tablet':
        return { width: '768px', height: '1024px' };
      case 'desktop':
        return { width: '1024px', height: '768px' };
      default:
        return { width: '375px', height: '667px' };
    }
  };

  if (loading) {
    return (
      <div className="flow-preview-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading flow preview...</p>
        </div>
      </div>
    );
  }

  if (!flow) {
    return (
      <div className="flow-preview-container">
        <div className="error-state">
          <AlertCircle size={48} />
          <h3>Flow not found</h3>
          <p>The requested flow could not be found.</p>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/flows')}
          >
            Back to Flows
          </button>
        </div>
      </div>
    );
  }

  const dimensions = getPreviewDimensions();

  return (
    <div className="flow-preview-container">
      {/* Header */}
      <div className="preview-header">
        <div className="header-left">
          <button
            className="btn btn-secondary"
            onClick={() => navigate('/flows')}
          >
            <ArrowLeft size={16} />
            Back to Flows
          </button>
          <div className="flow-info">
            <h1>{flow.name}</h1>
            <p>{flow.description}</p>
          </div>
        </div>

        <div className="header-right">
          <div className="preview-controls">
            <button
              className={`preview-mode-btn ${previewMode === 'mobile' ? 'active' : ''}`}
              onClick={() => setPreviewMode('mobile')}
              title="Mobile View"
            >
              <Smartphone size={16} />
            </button>
            <button
              className={`preview-mode-btn ${previewMode === 'tablet' ? 'active' : ''}`}
              onClick={() => setPreviewMode('tablet')}
              title="Tablet View"
            >
              <Tablet size={16} />
            </button>
            <button
              className={`preview-mode-btn ${previewMode === 'desktop' ? 'active' : ''}`}
              onClick={() => setPreviewMode('desktop')}
              title="Desktop View"
            >
              <Monitor size={16} />
            </button>
          </div>

          {flow?.status === 'draft' && (
            <button
              className="btn btn-success"
              onClick={handlePublishFlow}
            >
              <Upload size={16} />
              Publish Flow
            </button>
          )}

          <button
            className="btn btn-secondary"
            onClick={() => setShowTestModal(true)}
          >
            <Play size={16} />
            Test Flow
          </button>

          <button
            className="btn btn-primary"
            onClick={() => navigate(`/flows/${id}/edit`)}
          >
            <Eye size={16} />
            Edit Flow
          </button>
        </div>
      </div>

      {/* Flow Path */}
      {flowPath.length > 1 && (
        <div className="flow-path">
          <div className="path-label">Flow Path:</div>
          <div className="path-nodes">
            {flowPath.map((node, index) => (
              <div key={node.id} className="path-node">
                <span className="node-name">{node.data.title || node.type}</span>
                {index < flowPath.length - 1 && <span className="path-arrow">→</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview Area */}
      <div className="preview-area">
        <div className="preview-device" style={dimensions}>
          <div className="device-frame">
            <div className="device-content">
              {renderNodeContent(currentNode)}
            </div>
          </div>
        </div>
      </div>

      {/* Test Modal */}
      {showTestModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Test Flow</h3>
            </div>
            <div className="modal-body">
              <p>Enter a phone number to send a test flow:</p>
              <input
                type="tel"
                placeholder="+1234567890"
                value={testPhoneNumber}
                onChange={(e) => setTestPhoneNumber(e.target.value)}
                className="phone-input"
              />
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowTestModal(false);
                  setTestPhoneNumber('');
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleTestFlow}
                disabled={isTesting}
              >
                {isTesting ? 'Sending...' : 'Send Test'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlowPreview;
