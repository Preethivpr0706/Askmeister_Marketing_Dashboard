import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Copy,
  Trash2,
  Download,
  Upload,
  Play,
  Eye,
  BarChart3,
  Calendar,
  Tag
} from 'lucide-react';
import flowService from '../../api/flowService';
import TestFlowModal from './TestFlowModal';
import './FlowList.css';

const FlowList = () => {
  const navigate = useNavigate();
  const [flows, setFlows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedFlows, setSelectedFlows] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [flowToDelete, setFlowToDelete] = useState(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [flowToDuplicate, setFlowToDuplicate] = useState(null);
  const [duplicateName, setDuplicateName] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [showTestModal, setShowTestModal] = useState(false);
  const [flowToTest, setFlowToTest] = useState(null);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [flowToPublish, setFlowToPublish] = useState(null);

  useEffect(() => {
    // Check authentication first
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    
    fetchFlows();
  }, [searchTerm, statusFilter, categoryFilter, navigate]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeDropdown && !event.target.closest('.dropdown')) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [activeDropdown]);

  const fetchFlows = async () => {
    try {
      setLoading(true);

      const filters = {};
      if (searchTerm) filters.search = searchTerm;
      if (statusFilter) filters.status = statusFilter;
      if (categoryFilter) filters.category = categoryFilter;

      console.log('Fetching flows with filters:', filters);
      const response = await flowService.getFlows(filters);
      console.log('Flow API Response:', response); // Debug log
      
      // Handle different response structures
      let flowsData = [];
      if (response && response.data) {
        flowsData = Array.isArray(response.data) ? response.data : [];
      } else if (Array.isArray(response)) {
        flowsData = response;
      }
      
      console.log('Processed flows data:', flowsData);
      setFlows(flowsData);
    } catch (error) {
      console.error('Error fetching flows:', error);
      
      // More specific error handling
      if (error.message.includes('Network error')) {
        toast.error('Cannot connect to server. Please check if the backend is running.');
      } else if (error.message.includes('401') || error.message.includes('Access denied')) {
        toast.error('Session expired. Please log in again.');
        navigate('/login');
      } else {
        toast.error('Failed to fetch flows: ' + error.message);
      }
      
      setFlows([]); // Ensure flows is always an array
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFlow = async (flowId) => {
    try {
      await flowService.deleteFlow(flowId);
      toast.success('Flow deleted successfully');
      fetchFlows();
      setShowDeleteModal(false);
      setFlowToDelete(null);
    } catch (error) {
      toast.error('Failed to delete flow');
      console.error('Error deleting flow:', error);
    }
  };

  const handleDuplicateFlow = async () => {
    if (!duplicateName.trim()) {
      toast.error('Please enter a name for the duplicated flow');
      return;
    }

    try {
      await flowService.duplicateFlow(flowToDuplicate.id, duplicateName);
      toast.success('Flow duplicated successfully');
      fetchFlows();
      setShowDuplicateModal(false);
      setFlowToDuplicate(null);
      setDuplicateName('');
    } catch (error) {
      toast.error('Failed to duplicate flow');
      console.error('Error duplicating flow:', error);
    }
  };

  const handleExportFlow = async (flowId, flowName) => {
    try {
      await flowService.downloadFlow(flowId, `${flowName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_flow.json`);
      toast.success('Flow exported successfully');
    } catch (error) {
      toast.error('Failed to export flow');
      console.error('Error exporting flow:', error);
    }
  };

  const handleImportFlow = async () => {
    if (!importFile) {
      toast.error('Please select a file to import');
      return;
    }

    try {
      await flowService.uploadFlow(importFile);
      toast.success('Flow imported successfully');
      fetchFlows();
      setShowImportModal(false);
      setImportFile(null);
    } catch (error) {
      toast.error('Failed to import flow');
      console.error('Error importing flow:', error);
    }
  };

  const handleTestFlow = (flow) => {
    setFlowToTest(flow);
    setShowTestModal(true);
  };

  const handleConfirmTest = async (phoneNumber) => {
    if (!flowToTest || !flowToTest.id) {
      toast.error('Flow information not available');
      setShowTestModal(false);
      setFlowToTest(null);
      return;
    }

    try {
      await flowService.testFlow(flowToTest.id, phoneNumber);
      toast.success('Test flow sent successfully');
      setShowTestModal(false);
      setFlowToTest(null);
    } catch (error) {
      toast.error('Failed to send test flow');
      console.error('Error testing flow:', error);
    }
  };

  const handlePublishFlow = (flow) => {
    setFlowToPublish(flow);
    setShowPublishModal(true);
  };

  const handleConfirmPublish = async () => {
    if (!flowToPublish || !flowToPublish.id) {
      toast.error('Flow information not available');
      setShowPublishModal(false);
      setFlowToPublish(null);
      return;
    }

    try {
      const result = await flowService.publishFlow(flowToPublish.id);
      toast.success('Flow published successfully! It will be reviewed by WhatsApp.');

      // Refresh the flows list to update the status
      fetchFlows();
      setShowPublishModal(false);
      setFlowToPublish(null);
    } catch (error) {
      toast.error('Failed to publish flow');
      console.error('Error publishing flow:', error);
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredFlows = (Array.isArray(flows) ? flows : []).filter(flow => {
    const matchesSearch = !searchTerm || 
      flow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      flow.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !statusFilter || flow.status === statusFilter;
    const matchesCategory = !categoryFilter || flow.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flow-list-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading flows...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flow-list-container">
      {/* Header */}
      <div className="flow-list-header">
        <div className="header-content">
          <div className="header-title">
            <h1>Flow Builder</h1>
            <p>Create and manage WhatsApp Flows for interactive experiences</p>
          </div>
          <div className="header-actions">
            <button
              className="btn btn-secondary"
              onClick={() => setShowImportModal(true)}
            >
              <Upload size={16} />
              Import
            </button>
            <Link to="/flows/create" className="btn btn-primary">
              <Plus size={16} />
              Create Flow
            </Link>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flow-filters">
        <div className="search-bar">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search flows..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <button
          className={`filter-toggle ${showFilters ? 'active' : ''}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter size={16} />
          Filters
        </button>

        {showFilters && (
          <div className="filter-options">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="published">Published</option>
            </select>
            
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All Categories</option>
              <option value="LEAD_GENERATION">Lead Generation</option>
              <option value="CUSTOMER_SUPPORT">Customer Support</option>
              <option value="SIGN_UP">Sign Up</option>
              <option value="SIGN_IN">Sign In</option>
              <option value="APPOINTMENT_BOOKING">Appointment Booking</option>
              <option value="SHOPPING">Shopping</option>
              <option value="CONTACT_US">Contact Us</option>
              <option value="SURVEY">Survey</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        )}
      </div>

      {/* Flows Grid */}
      <div className="flows-grid">
        {filteredFlows.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📱</div>
            <h3>No flows found</h3>
            <p>Create your first WhatsApp Flow to get started</p>
            <Link to="/flows/create" className="btn btn-primary">
              <Plus size={16} />
              Create Flow
            </Link>
          </div>
        ) : (
          filteredFlows.map((flow) => (
            <div key={flow.id} className="flow-card">
              <div className="flow-card-header">
                <div className="flow-info">
                  <h3>{flow.name}</h3>
                  <p>{flow.description || 'No description'}</p>
                </div>
                <div className="flow-actions">
                  <div className="dropdown">
                    <button 
                      className="dropdown-toggle"
                      onClick={() => setActiveDropdown(activeDropdown === flow.id ? null : flow.id)}
                    >
                      <MoreVertical size={16} />
                    </button>
                    <div className={`dropdown-menu ${activeDropdown === flow.id ? 'active' : ''}`}>
                      <button onClick={() => {
                        setActiveDropdown(null);
                        navigate(`/flows/${flow.id}/edit`);
                      }}>
                        <Edit size={14} />
                        Edit
                      </button>
                      <button onClick={() => {
                        setActiveDropdown(null);
                        navigate(`/flows/${flow.id}`);
                      }}>
                        <Eye size={14} />
                        View
                      </button>
                      {flow.status === 'draft' && (
                        <button onClick={() => {
                          setActiveDropdown(null);
                          handlePublishFlow(flow);
                        }}>
                          <Upload size={14} />
                          Publish
                        </button>
                      )}
                      <button onClick={() => {
                        setActiveDropdown(null);
                        handleTestFlow(flow);
                      }}>
                        <Play size={14} />
                        Test
                      </button>
                      <button onClick={() => {
                        setActiveDropdown(null);
                        setFlowToDuplicate(flow);
                        setShowDuplicateModal(true);
                      }}>
                        <Copy size={14} />
                        Duplicate
                      </button>
                      <button onClick={() => {
                        setActiveDropdown(null);
                        handleExportFlow(flow.id, flow.name);
                      }}>
                        <Download size={14} />
                        Export
                      </button>
                      <button onClick={() => {
                        setActiveDropdown(null);
                        navigate(`/flows/${flow.id}/analytics`);
                      }}>
                        <BarChart3 size={14} />
                        Analytics
                      </button>
                      <hr />
                      <button 
                        className="danger"
                        onClick={() => {
                          setActiveDropdown(null);
                          setFlowToDelete(flow);
                          setShowDeleteModal(true);
                        }}
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flow-card-body">
                <div className="flow-meta">
                  <div className="meta-item">
                    <Tag size={14} />
                    <span className={`status-badge ${getStatusColor(flow.status)}`}>
                      {flow.status}
                    </span>
                  </div>
                  <div className="meta-item">
                    <span className="category-icon">
                      {getCategoryIcon(flow.category)}
                    </span>
                    <span>{flow.category}</span>
                  </div>
                  <div className="meta-item">
                    <Calendar size={14} />
                    <span>{formatDate(flow.updated_at)}</span>
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

              <div className="flow-card-footer">
                <button
                  className="btn btn-outline"
                  onClick={() => navigate(`/flows/${flow.id}/edit`)}
                >
                  Edit Flow
                </button>
                {flow.status === 'draft' && (
                  <button
                    className="btn btn-primary"
                    onClick={() => handlePublishFlow(flow)}
                  >
                    <Upload size={16} />
                    Publish Flow
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Delete Flow</h3>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete "{flowToDelete?.name}"? This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowDeleteModal(false);
                  setFlowToDelete(null);
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={() => handleDeleteFlow(flowToDelete.id)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Modal */}
      {showDuplicateModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Duplicate Flow</h3>
            </div>
            <div className="modal-body">
              <p>Enter a name for the duplicated flow:</p>
              <input
                type="text"
                placeholder="New flow name"
                value={duplicateName}
                onChange={(e) => setDuplicateName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowDuplicateModal(false);
                  setFlowToDuplicate(null);
                  setDuplicateName('');
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleDuplicateFlow}
              >
                Duplicate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Import Flow</h3>
            </div>
            <div className="modal-body">
              <p>Select a JSON file to import:</p>
              <input
                type="file"
                accept=".json"
                onChange={(e) => setImportFile(e.target.files[0])}
              />
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleImportFlow}
                disabled={!importFile}
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Flow Modal */}
      <TestFlowModal
        isOpen={showTestModal}
        onClose={() => {
          setShowTestModal(false);
          setFlowToTest(null);
        }}
        onTest={handleConfirmTest}
        flowName={flowToTest?.name || ''}
        isLoading={loading}
      />

      {/* Publish Confirmation Modal */}
      {showPublishModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Publish Flow</h3>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to publish "{flowToPublish?.name}" to WhatsApp?</p>
              <p className="warning-text">
                📋 This will submit the flow for WhatsApp review. Once approved, it will be available to your customers.
              </p>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowPublishModal(false);
                  setFlowToPublish(null);
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleConfirmPublish}
                disabled={loading}
              >
                {loading ? 'Publishing...' : 'Publish Flow'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlowList;
