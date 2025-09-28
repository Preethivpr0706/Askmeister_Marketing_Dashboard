// src/api/autoReplyService.js
import axios from 'axios';

//const API_URL = import.meta.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const API_URL = import.meta.env.REACT_APP_API_URL || 'https://askmeister-marketing-dashboard-backend.onrender.com/api';
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

class AutoReplyService {
    static async getAutoReplies(params = {}) {
        try {
            const response = await apiClient.get('/auto-replies', {
                params: {
                    page: params.page || 1,
                    limit: params.limit || 10,
                    search: params.search || '',
                    active_only: params.active_only || false
                }
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching auto-replies:', error);
            throw new Error(error.response?.data?.message || 'Failed to fetch auto-replies');
        }
    }

    static async getAutoReply(id) {
        try {
            const response = await apiClient.get(`/auto-replies/${id}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching auto-reply:', error);
            throw new Error(error.response?.data?.message || 'Failed to fetch auto-reply');
        }
    }

    static async createAutoReply(data) {
        try {
            const response = await apiClient.post('/auto-replies', data);
            return response.data;
        } catch (error) {
            console.error('Error creating auto-reply:', error);
            throw new Error(error.response?.data?.message || 'Failed to create auto-reply');
        }
    }

    static async updateAutoReply(id, data) {
        try {
            const response = await apiClient.put(`/auto-replies/${id}`, data);
            return response.data;
        } catch (error) {
            console.error('Error updating auto-reply:', error);
            throw new Error(error.response?.data?.message || 'Failed to update auto-reply');
        }
    }

    static async deleteAutoReply(id) {
        try {
            const response = await apiClient.delete(`/auto-replies/${id}`);
            return response.data;
        } catch (error) {
            console.error('Error deleting auto-reply:', error);
            throw new Error(error.response?.data?.message || 'Failed to delete auto-reply');
        }
    }

    static async toggleAutoReply(id) {
        try {
            const response = await apiClient.patch(`/auto-replies/${id}/toggle`);
            return response.data;
        } catch (error) {
            console.error('Error toggling auto-reply:', error);
            throw new Error(error.response?.data?.message || 'Failed to toggle auto-reply');
        }
    }

    static async getAutoReplyStats() {
        try {
            const response = await apiClient.get('/auto-replies/stats');
            return response.data;
        } catch (error) {
            console.error('Error fetching auto-reply stats:', error);
            throw new Error(error.response?.data?.message || 'Failed to fetch auto-reply stats');
        }
    }

    static async testAutoReply(message) {
        try {
            const response = await apiClient.post('/auto-replies/test', {
                message
            });
            return response.data;
        } catch (error) {
            console.error('Error testing auto-reply:', error);
            throw new Error(error.response?.data?.message || 'Failed to test auto-reply');
        }
    }
}

export default AutoReplyService;