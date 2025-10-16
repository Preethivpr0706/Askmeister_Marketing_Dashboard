import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
  CheckCircle,
  AlertCircle,
  Info,
  Play,
  Eye,
  Download,
  Upload
} from 'lucide-react';
import flowService from '../../api/flowService';
import campaignService from '../../api/campaignService';
import './FlowCampaignIntegration.css';

const FlowCampaignIntegration = ({ campaignId, onFlowSelected }) => {
  const [flows, setFlows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFlow, setSelectedFlow] = useState(null);
  const [flowPreview, setFlowPreview] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    fetchFlows();
  }, []);

  const fetchFlows = async () => {
    try {
      setLoading(true);
      const response = await flowService.getFlows({ status: 'published' });
      setFlows(response.data || []);
    } catch (error) {
      toast.error('Failed to fetch flows');
      console.error('Error fetching flows:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFlowSelect = (flow) => {
    setSelectedFlow(flow);
    if (onFlowSelected) {
      onFlowSelected(flow);
    }
  };

  const handlePreviewFlow = async (flow) => {
    try {
      const response = await flowService.getFlowById(flow.id);
      setFlowPreview(response.data);
      setShowPreview(true);
    } catch (error) {
      toast.error('Failed to load flow preview');
      console.error('Error loading flow preview:', error);
    }
  };

  const handleTestFlow = async (flow) => {
    const phoneNumber = prompt('Enter phone number to test (with country code):');
    if (!phoneNumber) return;

    try {
      await flowService.testFlow(flow.id, phoneNumber);
      toast.success('Test flow sent successfully');
    } catch (error) {
      toast.error('Failed to send test flow');
      console.error('Error testing flow:', error);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      published: 'bg-blue-100 text-blue-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getCategoryIcon = (category) => {
    const icons = {
      LEAD_GENERATION: '📢',
      CUSTOMER_SUPPORT: '💬',
      SIGN_UP: '📝',
      SIGN_IN: '🔐',
      APPOINTMENT_BOOKING: '📅',
      SHOPPING: '🛒',
      CONTACT_US: '📞',
      SURVEY: '📊',
      OTHER: '📋'
    };
    return icons[category] || '📋';
  };

  if (loading) {
    return (
      <div className="flow-campaign-integration">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading flows...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flow-campaign-integration">
      <div className="integration-header">
        <h3>Select WhatsApp Flow</h3>
        <p>Choose a published flow to include in your campaign</p>
      </div>

      {flows.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📱</div>
          <h4>No Published Flows</h4>
          <p>You need to create and publish a flow before you can use it in campaigns.</p>
          <button
            className="btn btn-primary"
            onClick={() => window.open('/flows/create', '_blank')}
          >
            Create Flow
          </button>
        </div>
      ) : (
        <div className="flows-grid">
          {flows.map((flow) => (
            <div
              key={flow.id}
              className={`flow-card ${selectedFlow?.id === flow.id ? 'selected' : ''}`}
              onClick={() => handleFlowSelect(flow)}
            >
              <div className="flow-card-header">
                <div className="flow-info">
                  <h4>{flow.name}</h4>
                  <p>{flow.description || 'No description'}</p>
                </div>
                <div className="flow-status">
                  <span className={`status-badge ${getStatusColor(flow.status)}`}>
                    {flow.status}
                  </span>
                </div>
              </div>

              <div className="flow-card-body">
                <div className="flow-meta">
                  <div className="meta-item">
                    <span className="category-icon">
                      {getCategoryIcon(flow.category)}
                    </span>
                    <span>{flow.category}</span>
                  </div>
                  <div className="meta-item">
                    <span>Version: {flow.version}</span>
                  </div>
                </div>

                {flow.completion_rate && (
                  <div className="flow-stats">
                    <div className="stat">
                      <span className="stat-label">Completion Rate</span>
                      <span className="stat-value">{flow.completion_rate}%</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flow-card-actions">
                <button
                  className="btn btn-icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePreviewFlow(flow);
                  }}
                  title="Preview Flow"
                >
                  <Eye size={16} />
                </button>
                <button
                  className="btn btn-icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTestFlow(flow);
                  }}
                  title="Test Flow"
                >
                  <Play size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedFlow && (
        <div className="selected-flow-info">
          <div className="info-header">
            <CheckCircle size={20} className="success-icon" />
            <h4>Selected Flow</h4>
          </div>
          <div className="info-content">
            <p><strong>Name:</strong> {selectedFlow.name}</p>
            <p><strong>Category:</strong> {selectedFlow.category}</p>
            <p><strong>Version:</strong> {selectedFlow.version}</p>
            {selectedFlow.description && (
              <p><strong>Description:</strong> {selectedFlow.description}</p>
            )}
          </div>
        </div>
      )}

      {/* Flow Preview Modal */}
      {showPreview && flowPreview && (
        <div className="modal-overlay">
          <div className="modal flow-preview-modal">
            <div className="modal-header">
              <h3>Flow Preview: {flowPreview.name}</h3>
              <button
                className="close-btn"
                onClick={() => setShowPreview(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="preview-info">
                <p><strong>Category:</strong> {flowPreview.category}</p>
                <p><strong>Version:</strong> {flowPreview.version}</p>
                <p><strong>Language:</strong> {flowPreview.language}</p>
                {flowPreview.description && (
                  <p><strong>Description:</strong> {flowPreview.description}</p>
                )}
              </div>
              
              <div className="preview-structure">
                <h4>Flow Structure</h4>
                {flowPreview.flow_data?.nodes && (
                  <div className="nodes-list">
                    {flowPreview.flow_data.nodes.map((node, index) => (
                      <div key={node.id} className="node-item">
                        <span className="node-number">{index + 1}</span>
                        <span className="node-type">{node.type}</span>
                        <span className="node-title">{node.data?.title || node.data?.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowPreview(false)}
              >
                Close
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  handleFlowSelect(flowPreview);
                  setShowPreview(false);
                }}
              >
                Select This Flow
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlowCampaignIntegration;
