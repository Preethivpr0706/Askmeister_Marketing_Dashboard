import React, { useState, useEffect } from 'react';
import { Search, X, Check, ExternalLink, Play, Eye } from 'lucide-react';
import flowService from '../../api/flowService';
import './FlowSelector.css';

const FlowSelector = ({ isOpen, onClose, onSelect, selectedFlowId = null }) => {
  const [flows, setFlows] = useState([]);
  const [filteredFlows, setFilteredFlows] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFlow, setSelectedFlow] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadFlows();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedFlowId && flows.length > 0) {
      const flow = flows.find(f => f.id === selectedFlowId);
      setSelectedFlow(flow);
    }
  }, [selectedFlowId, flows]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredFlows(flows);
    } else {
      const filtered = flows.filter(flow =>
        flow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        flow.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        flow.category?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredFlows(filtered);
    }
  }, [searchTerm, flows]);

  const loadFlows = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await flowService.getFlows({ status: 'published' });
      setFlows(response.data || []);
    } catch (err) {
      setError('Failed to load flows: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectFlow = (flow) => {
    setSelectedFlow(flow);
  };

  const handleConfirmSelection = () => {
    if (selectedFlow) {
      onSelect(selectedFlow);
      onClose();
    }
  };

  const handleRemoveFlow = () => {
    setSelectedFlow(null);
    onSelect(null);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'published': return '#10B981';
      case 'approved': return '#3B82F6';
      case 'pending': return '#F59E0B';
      case 'draft': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'published': return 'Published';
      case 'approved': return 'Approved';
      case 'pending': return 'Pending';
      case 'draft': return 'Draft';
      default: return status;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="flow-selector-overlay">
      <div className="flow-selector-modal">
        <div className="flow-selector-header">
          <h2>Select WhatsApp Flow</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="flow-selector-content">
          {/* Search */}
          <div className="search-section">
            <div className="search-input-container">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search flows by name, description, or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
          </div>

          {/* Selected Flow Display */}
          {selectedFlow && (
            <div className="selected-flow-section">
              <div className="selected-flow-card">
                <div className="selected-flow-info">
                  <h3>{selectedFlow.name}</h3>
                  <p>{selectedFlow.description || 'No description'}</p>
                  <div className="flow-meta">
                    <span className="flow-category">{selectedFlow.category}</span>
                    <span 
                      className="flow-status"
                      style={{ color: getStatusColor(selectedFlow.status) }}
                    >
                      {getStatusLabel(selectedFlow.status)}
                    </span>
                  </div>
                </div>
                <button 
                  className="remove-flow-btn"
                  onClick={handleRemoveFlow}
                  title="Remove flow"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Flows List */}
          <div className="flows-section">
            <div className="flows-header">
              <h3>Available Flows</h3>
              <span className="flows-count">
                {filteredFlows.length} flow{filteredFlows.length !== 1 ? 's' : ''}
              </span>
            </div>

            {isLoading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Loading flows...</p>
              </div>
            ) : error ? (
              <div className="error-state">
                <p>{error}</p>
                <button className="btn btn-secondary" onClick={loadFlows}>
                  Retry
                </button>
              </div>
            ) : filteredFlows.length === 0 ? (
              <div className="empty-state">
                <p>No flows found</p>
                {searchTerm && (
                  <button 
                    className="btn btn-secondary"
                    onClick={() => setSearchTerm('')}
                  >
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              <div className="flows-list">
                {filteredFlows.map((flow) => (
                  <div
                    key={flow.id}
                    className={`flow-card ${selectedFlow?.id === flow.id ? 'selected' : ''}`}
                    onClick={() => handleSelectFlow(flow)}
                  >
                    <div className="flow-card-content">
                      <div className="flow-header">
                        <h4>{flow.name}</h4>
                        <div className="flow-actions">
                          <span 
                            className="flow-status-badge"
                            style={{ backgroundColor: getStatusColor(flow.status) }}
                          >
                            {getStatusLabel(flow.status)}
                          </span>
                        </div>
                      </div>
                      
                      <p className="flow-description">
                        {flow.description || 'No description available'}
                      </p>
                      
                      <div className="flow-meta">
                        <span className="flow-category">{flow.category}</span>
                        <span className="flow-version">v{flow.version}</span>
                        <span className="flow-language">{flow.language}</span>
                      </div>

                      {flow.flow_data?.screens && (
                        <div className="flow-stats">
                          <span>{flow.flow_data.screens.length} screen{flow.flow_data.screens.length !== 1 ? 's' : ''}</span>
                        </div>
                      )}
                    </div>

                    {selectedFlow?.id === flow.id && (
                      <div className="selected-indicator">
                        <Check size={16} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flow-selector-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="btn btn-primary"
            onClick={handleConfirmSelection}
            disabled={!selectedFlow}
          >
            {selectedFlow ? 'Use Selected Flow' : 'Select Flow'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FlowSelector;
