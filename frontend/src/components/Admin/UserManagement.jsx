// src/components/Admin/UserManagement.jsx
import { useState, useEffect } from 'react';
import { adminService } from '../../api/adminService';
import { toast } from 'react-toastify';
import {
    Users,
    Plus,
    Edit,
    Trash2,
    Search,
    Filter,
    Eye,
    EyeOff,
    UserPlus,
    Shield,
    Mail,
    Phone,
    Building2
} from 'lucide-react';

function UserManagement({ onStatsUpdate }) {
    const [users, setUsers] = useState([]);
    const [businesses, setBusinesses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [formData, setFormData] = useState({
        email: '',
        name: '',
        password: '',
        phone: '',
        business_id: '',
        role: 'user'
    });

    useEffect(() => {
        loadUsers();
        loadBusinesses();
    }, []);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const response = await adminService.getAllUsers();
            if (response.success) {
                setUsers(response.data);
                onStatsUpdate(); // Update stats in parent component
            }
        } catch (error) {
            console.error('Error loading users:', error);
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const loadBusinesses = async () => {
        try {
            const response = await adminService.getAllBusinesses();
            if (response.success) {
                setBusinesses(response.data);
            }
        } catch (error) {
            console.error('Error loading businesses:', error);
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        try {
            const response = await adminService.createUser(formData);
            if (response.success) {
                toast.success('User created successfully');
                setShowCreateModal(false);
                resetForm();
                loadUsers();
            }
        } catch (error) {
            console.error('Error creating user:', error);
            toast.error(error.response?.data?.message || 'Failed to create user');
        }
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        try {
            const response = await adminService.updateUser(selectedUser.id, formData);
            if (response.success) {
                toast.success('User updated successfully');
                setShowEditModal(false);
                setSelectedUser(null);
                resetForm();
                loadUsers();
            }
        } catch (error) {
            console.error('Error updating user:', error);
            toast.error(error.response?.data?.message || 'Failed to update user');
        }
    };

    const handleDeleteUser = async (user) => {
        if (!window.confirm(`Are you sure you want to delete ${user.name}?`)) {
            return;
        }

        try {
            const response = await adminService.deleteUser(user.id);
            if (response.success) {
                toast.success('User deleted successfully');
                loadUsers();
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            toast.error(error.response?.data?.message || 'Failed to delete user');
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        try {
            const response = await adminService.resetUserPassword(selectedUser.id, formData.password);
            if (response.success) {
                toast.success('Password reset successfully');
                setShowPasswordModal(false);
                setSelectedUser(null);
                resetForm();
            }
        } catch (error) {
            console.error('Error resetting password:', error);
            toast.error(error.response?.data?.message || 'Failed to reset password');
        }
    };

    const resetForm = () => {
        setFormData({
            email: '',
            name: '',
            password: '',
            phone: '',
            business_id: '',
            role: 'user'
        });
    };

    const openEditModal = (user) => {
        setSelectedUser(user);
        setFormData({
            email: user.email,
            name: user.name,
            phone: user.phone || '',
            business_id: user.business_id || '',
            role: user.role
        });
        setShowEditModal(true);
    };

    const openPasswordModal = (user) => {
        setSelectedUser(user);
        setFormData({
            password: ''
        });
        setShowPasswordModal(true);
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            user.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = roleFilter === 'all' || user.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    if (loading) {
        return (
            <div className="admin-loading">
                <div className="loading-spinner"></div>
                <p>Loading users...</p>
            </div>
        );
    }

    return (
        <div className="user-management">
            <div className="user-management-header">
                <div className="header-content">
                    <h2>User Management</h2>
                    <p>Manage system users and their permissions</p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => setShowCreateModal(true)}
                >
                    <UserPlus size={20} />
                    Add User
                </button>
            </div>

            <div className="user-management-filters">
                <div className="search-box">
                    <Search size={20} />
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="filter-select">
                    <Filter size={20} />
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                    >
                        <option value="all">All Roles</option>
                        <option value="admin">Admin</option>
                        <option value="user">User</option>
                    </select>
                </div>
            </div>

            <div className="user-management-table">
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Phone</th>
                            <th>Business</th>
                            <th>Role</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.map((user) => (
                            <tr key={user.id}>
                                <td>
                                    <div className="user-info">
                                        <div className="user-name">{user.name}</div>
                                    </div>
                                </td>
                                <td>{user.email}</td>
                                <td>{user.phone || '-'}</td>
                                <td>
                                    {user.business_name ? (
                                        <div className="business-tag">
                                            <Building2 size={14} />
                                            {user.business_name}
                                        </div>
                                    ) : (
                                        <span className="no-business">No Business</span>
                                    )}
                                </td>
                                <td>
                                    <span className={`role-badge ${user.role}`}>
                                        <Shield size={12} />
                                        {user.role}
                                    </span>
                                </td>
                                <td>{new Date(user.created_at).toLocaleDateString()}</td>
                                <td>
                                    <div className="action-buttons">
                                        <button
                                            className="btn btn-sm btn-outline"
                                            onClick={() => openEditModal(user)}
                                            title="Edit User"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button
                                            className="btn btn-sm btn-outline"
                                            onClick={() => openPasswordModal(user)}
                                            title="Reset Password"
                                        >
                                            <EyeOff size={16} />
                                        </button>
                                        <button
                                            className="btn btn-sm btn-danger"
                                            onClick={() => handleDeleteUser(user)}
                                            title="Delete User"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {filteredUsers.length === 0 && (
                    <div className="no-users">
                        <Users size={48} />
                        <p>No users found</p>
                    </div>
                )}
            </div>

            {/* Create User Modal */}
            {showCreateModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>Create New User</h3>
                            <button
                                className="modal-close"
                                onClick={() => setShowCreateModal(false)}
                            >
                                ×
                            </button>
                        </div>
                        <form onSubmit={handleCreateUser}>
                            <div className="form-group">
                                <label>Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Password</label>
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Phone (Optional)</label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                />
                            </div>
                            <div className="form-group">
                                <label>Business</label>
                                <select
                                    value={formData.business_id}
                                    onChange={(e) => setFormData({...formData, business_id: e.target.value})}
                                    required
                                >
                                    <option value="">Select Business</option>
                                    {businesses.map((business) => (
                                        <option key={business.id} value={business.id}>
                                            {business.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Role</label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                                >
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div className="modal-actions">
                                <button type="button" onClick={() => setShowCreateModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Create User
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {showEditModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>Edit User</h3>
                            <button
                                className="modal-close"
                                onClick={() => setShowEditModal(false)}
                            >
                                ×
                            </button>
                        </div>
                        <form onSubmit={handleUpdateUser}>
                            <div className="form-group">
                                <label>Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Phone (Optional)</label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                />
                            </div>
                            <div className="form-group">
                                <label>Business</label>
                                <select
                                    value={formData.business_id}
                                    onChange={(e) => setFormData({...formData, business_id: e.target.value})}
                                    required
                                >
                                    <option value="">Select Business</option>
                                    {businesses.map((business) => (
                                        <option key={business.id} value={business.id}>
                                            {business.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Role</label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                                >
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div className="modal-actions">
                                <button type="button" onClick={() => setShowEditModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Update User
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Reset Password Modal */}
            {showPasswordModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>Reset Password</h3>
                            <button
                                className="modal-close"
                                onClick={() => setShowPasswordModal(false)}
                            >
                                ×
                            </button>
                        </div>
                        <form onSubmit={handleResetPassword}>
                            <div className="form-group">
                                <label>New Password</label>
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                                    required
                                    minLength="6"
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" onClick={() => setShowPasswordModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Reset Password
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default UserManagement;
