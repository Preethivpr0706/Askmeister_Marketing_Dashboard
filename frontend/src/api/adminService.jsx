// src/api/adminService.jsx
import axios from 'axios';

const API_URL = import.meta.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request interceptor for auth
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor for auth errors
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export const adminService = {
    // User Management
    getAllUsers: async () => {
        const response = await apiClient.get('/admin/users');
        return response.data;
    },

    getUserById: async (id) => {
        const response = await apiClient.get(`/admin/users/${id}`);
        return response.data;
    },

    createUser: async (userData) => {
        const response = await apiClient.post('/admin/users', userData);
        return response.data;
    },

    updateUser: async (id, userData) => {
        const response = await apiClient.put(`/admin/users/${id}`, userData);
        return response.data;
    },

    deleteUser: async (id) => {
        const response = await apiClient.delete(`/admin/users/${id}`);
        return response.data;
    },

    resetUserPassword: async (id, newPassword) => {
        const response = await apiClient.post(`/admin/users/${id}/reset-password`, { newPassword });
        return response.data;
    },

    // Business Management
    getAllBusinesses: async () => {
        const response = await apiClient.get('/admin/businesses');
        return response.data;
    },

    getBusinessById: async (id) => {
        const response = await apiClient.get(`/admin/businesses/${id}`);
        return response.data;
    },

    createBusiness: async (businessData) => {
        const response = await apiClient.post('/admin/businesses', businessData);
        return response.data;
    },

    updateBusiness: async (id, businessData) => {
        const response = await apiClient.put(`/admin/businesses/${id}`, businessData);
        return response.data;
    },

    deleteBusiness: async (id) => {
        const response = await apiClient.delete(`/admin/businesses/${id}`);
        return response.data;
    },

    getBusinessSettings: async (id) => {
        const response = await apiClient.get(`/admin/businesses/${id}/settings`);
        return response.data;
    },

    updateBusinessSettings: async (id, settingsData) => {
        const response = await apiClient.put(`/admin/businesses/${id}/settings`, settingsData);
        return response.data;
    }
};

export { apiClient };
