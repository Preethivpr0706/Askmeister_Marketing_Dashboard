// src/api/chatbotService.jsx
import axios from 'axios';
const API_URL = import.meta.env.REACT_APP_API_URL || 'http://localhost:6292/api';
// const API_URL = import.meta.env.REACT_APP_API_URL || 'https://askmeister-marketing-dashboard-backend.onrender.com/api';

// Create axios instance with interceptors
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add authorization token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Optional: Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

class ChatbotService {
  // Flow management
  static async getFlows() {
    try {
      const response = await apiClient.get('/chatbot/flows');
      return Array.isArray(response.data.flows) ? response.data.flows : [];
    } catch (error) {
      console.error('Error fetching chatbot flows:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch chatbot flows');
    }
  }

  static async createFlow(flowData) {
    try {
      const response = await apiClient.post('/chatbot/flows', flowData);
      return response.data;
    } catch (error) {
      console.error('Error creating chatbot flow:', error);
      throw new Error(error.response?.data?.message || 'Failed to create chatbot flow');
    }
  }

  static async getFlowDetails(flowId) {
    try {
      const response = await apiClient.get(`/chatbot/flows/${flowId}`);
      return response.data.flow;
    } catch (error) {
      console.error(`Error fetching flow details for ID ${flowId}:`, error);
      throw new Error(error.response?.data?.message || 'Failed to fetch flow details');
    }
  }

  static async getCompleteFlow(flowId) {
    try {
      const response = await apiClient.get(`/chatbot/flows/${flowId}/complete`);
      console.log(response)
      return response.data.flow;
    } catch (error) {
      console.error(`Error fetching complete flow for ID ${flowId}:`, error);
      throw new Error(error.response?.data?.message || 'Failed to fetch complete flow');
    }
  }

  static async updateFlow(flowId, flowData) {
    try {
      const response = await apiClient.put(`/chatbot/flows/${flowId}`, flowData);
      return response.data;
    } catch (error) {
      console.error(`Error updating flow ID ${flowId}:`, error);
      throw new Error(error.response?.data?.message || 'Failed to update flow');
    }
  }

  static async deleteFlow(flowId) {
    try {
      const response = await apiClient.delete(`/chatbot/flows/${flowId}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting flow ID ${flowId}:`, error);
      throw new Error(error.response?.data?.message || 'Failed to delete flow');
    }
  }

  // Conversation integration
  static async getConversationStatus(conversationId) {
    try {
      const response = await apiClient.get(`/chatbot/conversations/${conversationId}/status`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching chatbot status for conversation ${conversationId}:`, error);
      throw new Error(error.response?.data?.message || 'Failed to fetch chatbot status');
    }
  }

  static async toggleChatbot(conversationId, enabled, flowId = null) {
    try {
      const response = await apiClient.post(`/chatbot/conversations/${conversationId}/toggle`, {
        enabled,
        flowId
      });
      return response.data;
    } catch (error) {
      console.error(`Error toggling chatbot for conversation ${conversationId}:`, error);
      throw new Error(error.response?.data?.message || 'Failed to toggle chatbot');
    }
  }

  static async processChatbotMessage(conversationId, message, flowId) {
    try {
      const response = await apiClient.post(`/chatbot/process`, {
        conversationId,
        message,
        flowId
      });
      console.log(response);
      return response.data;
    } catch (error) {
      console.error('Error processing message with chatbot:', error);
      throw new Error(error.response?.data?.message || 'Failed to process message with chatbot');
    }
  }

  // Additional methods to add to chatbotService.jsx

static async createNode(flowId, nodeData) {
  try {
    const response = await apiClient.post(`/chatbot/flows/${flowId}/nodes`, nodeData);
    return response.data;
  } catch (error) {
    console.error(`Error creating node in flow ${flowId}:`, error);
    throw new Error(error.response?.data?.message || 'Failed to create node');
  }
}

static async updateNode(flowId, nodeId, nodeData) {
  try {
    const response = await apiClient.put(`/chatbot/flows/${flowId}/nodes/${nodeId}`, nodeData);
    return response.data;
  } catch (error) {
    console.error(`Error updating node ${nodeId}:`, error);
    throw new Error(error.response?.data?.message || 'Failed to update node');
  }
}

static async deleteNode(flowId, nodeId) {
  try {
    const response = await apiClient.delete(`/chatbot/flows/${flowId}/nodes/${nodeId}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting node ${nodeId}:`, error);
    throw new Error(error.response?.data?.message || 'Failed to delete node');
  }
}

static async createEdge(flowId, sourceNodeId, targetNodeId, condition = null) {
  try {
    const response = await apiClient.post(`/chatbot/flows/${flowId}/edges`, {
      sourceNodeId,
      targetNodeId,
      condition
    });
    return response.data;
  } catch (error) {
    console.error(`Error creating edge in flow ${flowId}:`, error);
    throw new Error(error.response?.data?.message || 'Failed to create edge');
  }
}

static async updateEdge(flowId, edgeId, edgeData) {
  try {
    const response = await apiClient.put(`/chatbot/flows/${flowId}/edges/${edgeId}`, edgeData);
    return response.data;
  } catch (error) {
    console.error(`Error updating edge ${edgeId}:`, error);
    throw new Error(error.response?.data?.message || 'Failed to update edge');
  }
}

static async deleteEdge(flowId, edgeId) {
  try {
    const response = await apiClient.delete(`/chatbot/flows/${flowId}/edges/${edgeId}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting edge ${edgeId}:`, error);
    throw new Error(error.response?.data?.message || 'Failed to delete edge');
  }
}

static async uploadMedia(file, messageType) {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('messageType', messageType);

    const response = await apiClient.post('/chatbot/upload-media', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  } catch (error) {
    console.error('Error uploading media:', error);
    throw new Error(error.response?.data?.message || 'Failed to upload media');
  }
}

// static async testFlow(flowId, testMessage = 'Hello') {
//   try {
//     const response = await apiClient.post(`/chatbot/flows/${flowId}/test`, {
//       message: testMessage
//     });
//     return response.data;
//   } catch (error) {
//     console.error('Error testing flow:', error);
//     throw new Error(error.response?.data?.message || 'Failed to test flow');
//   }
// }
}

export default ChatbotService;