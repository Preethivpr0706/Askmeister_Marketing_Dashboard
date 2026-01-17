import axios from 'axios';
import { authService } from './authService';

const API_URL = import.meta.env.REACT_APP_API_URL || 'http://localhost:5000/api';
// const API_URL = import.meta.env.REACT_APP_API_URL || 'https://askmeister-marketing-dashboard-backend.onrender.com/api';
//const API_URL= import.meta.env.REACT_APP_API_URL || 'https://marketing.askmeister.com/backend/api';

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
  
  // For FormData, don't set Content-Type - let browser/axios set it with boundary
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  
  console.log(config);
  return config;
});

// Add response interceptor
apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      authService.logout();
    }
    return Promise.reject(error);
  }
);

export const conversationService = {
  listConversations: async (status = null, page = 1) => {
    try {
      const params = { page };
      if (status && status !== 'all') {
        params.status = status;
      }
      
      const response = await apiClient.get('/conversations', { params });
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch conversations');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error fetching conversations:', error.response?.data);
      throw error.response?.data || error;
    }
  },

  getConversation: async (conversationId) => {
    try {
      const response = await apiClient.get(`/conversations/${conversationId}`);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch conversation');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error fetching conversation:', error.response?.data);
      throw error.response?.data || error;
    }
  },

  getConversationMessages: async (conversationId) => {
  try {
    const response = await apiClient.get(
      `/conversations/${conversationId}/messages`
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
},

  sendMessage: async (conversationId, messageData) => {
    try {
      const response = await apiClient.post(
        `/conversations/${conversationId}/messages`,
        messageData
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to send message');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error sending message:', error.response?.data);
      throw error.response?.data || error;
    }
  },

 closeConversation: async (conversationId) => {
    try {
      const response = await apiClient.post(
        `/conversations/${conversationId}/close`
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to close conversation');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error closing conversation:', error.response?.data);
      throw error.response?.data || error;
    }
  },

  archiveConversation: async (conversationId) => {
    try {
      const response = await apiClient.post(
        `/conversations/${conversationId}/archive`
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to archive conversation');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error archiving conversation:', error.response?.data);
      throw error.response?.data || error;
    }
  },

  reopenConversation: async (conversationId) => {
    try {
      const response = await apiClient.post(
        `/conversations/${conversationId}/reopen`
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to reopen conversation');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error reopening conversation:', error.response?.data);
      throw error.response?.data || error;
    }
  },

  deleteConversation: async (conversationId) => {
    try {
      const response = await apiClient.delete(
        `/conversations/${conversationId}`
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to delete conversation');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error deleting conversation:', error.response?.data);
      throw error.response?.data || error;
    }
  },

  deleteConversations: async (conversationIds) => {
    try {
      const response = await apiClient.delete('/conversations/bulk', { data: { ids: conversationIds } });
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to delete conversations');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error deleting conversations:', error.response?.data);
      throw error.response?.data || error;
    }
  },

  getConversationStats: async () => {
    try {
      const response = await apiClient.get('/conversations/stats/overview');
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch conversation stats');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error fetching conversation stats:', error.response?.data);
      throw error.response?.data || error;
    }
  },

  uploadFile: async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post('/files/upload', formData, {
      // Don't set Content-Type header - let axios set it automatically with boundary
      // Setting it manually prevents axios from adding the required boundary parameter
      timeout: 600000, // 10 minutes timeout for large files
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          console.log(`Upload progress: ${percentCompleted}%`);
        }
      }
    });

    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to upload file');
    }

    return response.data.data;
  } catch (error) {
    console.error('Error uploading file:', error);
    // Provide better error messages
    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      throw new Error('Network error: Unable to connect to server. Please check your connection.');
    }
    if (error.response?.data) {
      throw new Error(error.response.data.message || error.response.data.error || 'Failed to upload file');
    }
    if (error.message) {
      throw error;
    }
    throw new Error('Failed to upload file. Please try again.');
  }
},

sendFileMessage: async (conversationId, fileId, caption = '') => {
  try {
    const response = await apiClient.post(
      `/files/conversations/${conversationId}/send-file`,
      { fileId, caption }
    );

    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to send file message');
    }

    return response.data.data;
  } catch (error) {
    console.error('Error sending file message:', error.response?.data);
    throw error.response?.data || error;
  }
}

};

export default conversationService;