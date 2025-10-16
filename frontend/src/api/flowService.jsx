import axios from 'axios';

// const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_BASE_URL = import.meta.env.REACT_APP_API_URL || 'https://askmeister-marketing-dashboard-backend.onrender.com/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: `${API_BASE_URL}/api/flows`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/**
 * Flow Service
 * Handles all flow-related API operations
 */
class FlowService {
  
  /**
   * Create a new flow
   * @param {Object} flowData - Flow data
   * @returns {Promise<Object>} Created flow
   */
  async createFlow(flowData) {
    try {
      console.log('Creating flow with data:', flowData);
      const response = await api.post('/', flowData);
      console.log('Create flow response:', response);
      return response.data;
    } catch (error) {
      console.error('Create flow error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get all flows for the current business
   * @param {Object} filters - Optional filters
   * @returns {Promise<Object>} Flows list with pagination
   */
  async getFlows(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      if (filters.status) params.append('status', filters.status);
      if (filters.category) params.append('category', filters.category);
      if (filters.search) params.append('search', filters.search);
      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);

      console.log('Making API request to:', `/?${params.toString()}`);
      console.log('Auth token present:', !!localStorage.getItem('token'));
      
      const response = await api.get(`/?${params.toString()}`);
      console.log('API response received:', response);
      return response.data;
    } catch (error) {
      console.error('API error details:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get a specific flow by ID
   * @param {string} flowId - Flow ID
   * @returns {Promise<Object>} Flow object
   */
  async getFlowById(flowId) {
    try {
      const response = await api.get(`/${flowId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Update a flow
   * @param {string} flowId - Flow ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated flow
   */
  async updateFlow(flowId, updateData) {
    try {
      console.log('Updating flow:', flowId, 'with data:', updateData);
      const response = await api.put(`/${flowId}`, updateData);
      console.log('Update flow response:', response);
      return response.data;
    } catch (error) {
      console.error('Update flow error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Delete a flow
   * @param {string} flowId - Flow ID
   * @returns {Promise<Object>} Success response
   */
  async deleteFlow(flowId) {
    try {
      const response = await api.delete(`/${flowId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Duplicate a flow
   * @param {string} flowId - Original flow ID
   * @param {string} newName - New flow name
   * @returns {Promise<Object>} Duplicated flow
   */
  async duplicateFlow(flowId, newName) {
    try {
      const response = await api.post(`/${flowId}/duplicate`, { name: newName });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Save flow structure (nodes and edges)
   * @param {string} flowId - Flow ID
   * @param {Array} nodes - Flow nodes
   * @param {Array} edges - Flow edges
   * @returns {Promise<Object>} Success response
   */
  async saveFlowStructure(flowId, nodes, edges) {
    try {
      const response = await api.post(`/${flowId}/structure`, { nodes, edges });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Validate flow structure
   * @param {Object} flowData - Flow data to validate
   * @returns {Promise<Object>} Validation result
   */
  async validateFlow(flowData) {
    try {
      const response = await api.post('/validate', { flow_data: flowData });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Publish flow to WhatsApp API
   * @param {string} flowId - Flow ID
   * @returns {Promise<Object>} Publish result
   */
  async publishFlow(flowId) {
    try {
      const response = await api.post(`/${flowId}/publish`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Test flow by sending to a test number
   * @param {string} flowId - Flow ID
   * @param {string} phoneNumber - Test phone number
   * @returns {Promise<Object>} Test result
   */
  async testFlow(flowId, phoneNumber) {
    try {
      const response = await api.post(`/${flowId}/test`, { phone_number: phoneNumber });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get flow analytics
   * @param {string} flowId - Flow ID
   * @param {Object} dateRange - Date range for analytics
   * @returns {Promise<Object>} Analytics data
   */
  async getFlowAnalytics(flowId, dateRange = {}) {
    try {
      const params = new URLSearchParams();
      
      if (dateRange.start_date) params.append('start_date', dateRange.start_date);
      if (dateRange.end_date) params.append('end_date', dateRange.end_date);

      const response = await api.get(`/${flowId}/analytics?${params.toString()}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Export flow as JSON
   * @param {string} flowId - Flow ID
   * @returns {Promise<Blob>} JSON file blob
   */
  async exportFlow(flowId) {
    try {
      const response = await api.get(`/${flowId}/export`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Import flow from JSON
   * @param {Object} flowData - Flow data to import
   * @param {string} name - Optional new name for imported flow
   * @returns {Promise<Object>} Imported flow
   */
  async importFlow(flowData, name = null) {
    try {
      console.log('Importing flow with data:', flowData, 'name:', name);
      const response = await api.post('/import', { 
        flow_data: flowData, 
        name 
      });
      console.log('Import flow response:', response);
      return response.data;
    } catch (error) {
      console.error('Import flow error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get flow in WhatsApp format for debugging
   * @param {string} flowId - Flow ID
   * @returns {Promise<Object>} Flow in WhatsApp format
   */
  async getFlowWhatsAppFormat(flowId) {
    try {
      const response = await api.get(`/${flowId}/whatsapp-format`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Download flow as JSON file
   * @param {string} flowId - Flow ID
   * @param {string} filename - Optional filename
   */
  async downloadFlow(flowId, filename = null) {
    try {
      const blob = await this.exportFlow(flowId);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `flow_${flowId}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Upload and import flow from file
   * @param {File} file - JSON file to import
   * @param {string} name - Optional new name for imported flow
   * @returns {Promise<Object>} Imported flow
   */
  async uploadFlow(file, name = null) {
    try {
      console.log('Uploading flow file:', file.name, 'name:', name);
      const text = await file.text();
      console.log('File content:', text);
      const flowData = JSON.parse(text);
      console.log('Parsed flow data:', flowData);
      return await this.importFlow(flowData, name);
    } catch (error) {
      console.error('Upload flow error:', error);
      throw new Error('Invalid JSON file or flow data');
    }
  }

  /**
   * Get flow categories
   * @returns {Array} Available flow categories
   */
  getFlowCategories() {
    return [
      { value: 'LEAD_GENERATION', label: 'Lead Generation' },
      { value: 'CUSTOMER_SUPPORT', label: 'Customer Support' },
      { value: 'SIGN_UP', label: 'Sign Up' },
      { value: 'SIGN_IN', label: 'Sign In' },
      { value: 'APPOINTMENT_BOOKING', label: 'Appointment Booking' },
      { value: 'SHOPPING', label: 'Shopping' },
      { value: 'CONTACT_US', label: 'Contact Us' },
      { value: 'SURVEY', label: 'Survey' },
      { value: 'OTHER', label: 'Other' }
    ];
  }

  /**
   * Get flow statuses
   * @returns {Array} Available flow statuses
   */
  getFlowStatuses() {
    return [
      { value: 'draft', label: 'Draft', color: 'gray' },
      { value: 'pending', label: 'Pending', color: 'yellow' },
      { value: 'approved', label: 'Approved', color: 'green' },
      { value: 'rejected', label: 'Rejected', color: 'red' },
      { value: 'published', label: 'Published', color: 'blue' }
    ];
  }

  /**
   * Get node types
   * @returns {Array} Available node types
   */
  getNodeTypes() {
    return [
      { 
        value: 'screen', 
        label: 'Screen', 
        description: 'A basic screen with text and optional media',
        icon: '📱',
        color: '#3B82F6'
      },
      { 
        value: 'form', 
        label: 'Form', 
        description: 'A form with input fields for data collection',
        icon: '📝',
        color: '#10B981'
      },
      { 
        value: 'list_picker', 
        label: 'List Picker', 
        description: 'A list of options for user selection',
        icon: '📋',
        color: '#8B5CF6'
      },
      { 
        value: 'confirmation', 
        label: 'Confirmation', 
        description: 'A confirmation screen with yes/no options',
        icon: '✅',
        color: '#F59E0B'
      },
      { 
        value: 'text', 
        label: 'Text', 
        description: 'Simple text message',
        icon: '💬',
        color: '#6B7280'
      },
      { 
        value: 'image', 
        label: 'Image', 
        description: 'Image with optional caption',
        icon: '🖼️',
        color: '#EC4899'
      },
      { 
        value: 'button', 
        label: 'Button', 
        description: 'Interactive button with actions',
        icon: '🔘',
        color: '#EF4444'
      },
      { 
        value: 'condition', 
        label: 'Condition', 
        description: 'Conditional logic for flow branching',
        icon: '🔀',
        color: '#14B8A6'
      }
    ];
  }

  /**
   * Get edge types
   * @returns {Array} Available edge types
   */
  getEdgeTypes() {
    return [
      { value: 'default', label: 'Default', description: 'Default connection' },
      { value: 'condition', label: 'Condition', description: 'Conditional connection' },
      { value: 'button_click', label: 'Button Click', description: 'Button click connection' },
      { value: 'form_submit', label: 'Form Submit', description: 'Form submission connection' }
    ];
  }

  /**
   * Handle API errors
   * @param {Error} error - Error object
   * @returns {Error} Formatted error
   */
  handleError(error) {
    if (error.response) {
      // Server responded with error status
      const { data } = error.response;
      return new Error(data.message || 'An error occurred');
    } else if (error.request) {
      // Request was made but no response received
      return new Error('Network error. Please check your connection.');
    } else {
      // Something else happened
      return new Error(error.message || 'An unexpected error occurred');
    }
  }

  /**
   * Create default flow structure
   * @param {string} name - Flow name
   * @returns {Object} Default flow structure
   */
  createDefaultFlow(name) {
    return {
      name,
      description: '',
      version: '1.0.0',
      category: 'CUSTOMER_SUPPORT',
      language: 'en_US',
      flow_data: {
        nodes: [
          {
            id: 'start',
            type: 'screen',
            title: 'Welcome',
            content: 'Welcome to our flow!',
            position: { x: 100, y: 100 },
            properties: {
              header: {
                type: 'text',
                content: 'Welcome'
              },
              body: 'Welcome to our flow!',
              footer: ''
            }
          }
        ],
        edges: []
      }
    };
  }

  /**
   * Validate flow structure locally
   * @param {Object} flowData - Flow data to validate
   * @returns {Object} Validation result
   */
  validateFlowLocally(flowData) {
    const errors = [];
    const warnings = [];

    // Check if flow has nodes
    if (!flowData.nodes || flowData.nodes.length === 0) {
      errors.push('Flow must have at least one node');
    }

    // Check for unconnected nodes
    if (flowData.nodes && flowData.edges) {
      const connectedNodes = new Set();
      flowData.edges.forEach(edge => {
        connectedNodes.add(edge.source);
        connectedNodes.add(edge.target);
      });

      const unconnectedNodes = flowData.nodes.filter(node => !connectedNodes.has(node.id));
      if (unconnectedNodes.length > 0) {
        warnings.push(`Found ${unconnectedNodes.length} unconnected nodes`);
      }
    }

    // Check for required fields in nodes
    if (flowData.nodes) {
      flowData.nodes.forEach((node, index) => {
        if (!node.type) {
          errors.push(`Node ${index + 1} is missing type`);
        }
        if (!node.id) {
          errors.push(`Node ${index + 1} is missing ID`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

export default new FlowService();
