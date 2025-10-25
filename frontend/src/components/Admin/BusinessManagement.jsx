// src/components/Admin/BusinessManagement.jsx
import { useState, useEffect } from 'react';
import { adminService } from '../../api/adminService';
import { toast } from 'react-toastify';
import {
    Building2,
    Plus,
    Edit,
    Trash2,
    Search,
    Filter,
    Eye,
    Settings,
    Users,
    Globe,
    Phone,
    Mail
} from 'lucide-react';

function BusinessManagement({ onStatsUpdate }) {
    const [businesses, setBusinesses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [industryFilter, setIndustryFilter] = useState('all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [selectedBusiness, setSelectedBusiness] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        profile_image_url: '',
        industry: 'technology',
        size: 'medium',
        contact_email: '',
        contact_phone: '',
        website: ''
    });
    const [settingsData, setSettingsData] = useState({
        whatsapp_api_token: '',
        whatsapp_business_account_id: '',
        whatsapp_phone_number_id: '',
        facebook_app_id: '',
        webhook_verify_token: ''
    });

    useEffect(() => {
        loadBusinesses();
    }, []);

    const loadBusinesses = async () => {
        try {
            setLoading(true);
            const response = await adminService.getAllBusinesses();
            if (response.success) {
                setBusinesses(response.data);
                onStatsUpdate(); // Update stats in parent component
            }
        } catch (error) {
            console.error('Error loading businesses:', error);
            toast.error('Failed to load businesses');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateBusiness = async (e) => {
        e.preventDefault();
        try {
            const response = await adminService.createBusiness(formData);
            if (response.success) {
                toast.success('Business created successfully');
                setShowCreateModal(false);
                resetForm();
                loadBusinesses();
            }
        } catch (error) {
            console.error('Error creating business:', error);
            toast.error(error.response?.data?.message || 'Failed to create business');
        }
    };

    const handleUpdateBusiness = async (e) => {
        e.preventDefault();
        try {
            const response = await adminService.updateBusiness(selectedBusiness.id, formData);
            if (response.success) {
                toast.success('Business updated successfully');
                setShowEditModal(false);
                setSelectedBusiness(null);
                resetForm();
                loadBusinesses();
            }
        } catch (error) {
            console.error('Error updating business:', error);
            toast.error(error.response?.data?.message || 'Failed to update business');
        }
    };

    const handleDeleteBusiness = async (business) => {
        if (!window.confirm(`Are you sure you want to delete ${business.name}? This action cannot be undone.`)) {
            return;
        }

        try {
            const response = await adminService.deleteBusiness(business.id);
            if (response.success) {
                toast.success('Business deleted successfully');
                loadBusinesses();
            }
        } catch (error) {
            console.error('Error deleting business:', error);
            toast.error(error.response?.data?.message || 'Failed to delete business');
        }
    };

    const handleUpdateSettings = async (e) => {
        e.preventDefault();
        try {
            const response = await adminService.updateBusinessSettings(selectedBusiness.id, settingsData);
            if (response.success) {
                toast.success('Business settings updated successfully');
                setShowSettingsModal(false);
                setSelectedBusiness(null);
                resetSettingsForm();
            }
        } catch (error) {
            console.error('Error updating business settings:', error);
            toast.error(error.response?.data?.message || 'Failed to update business settings');
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            profile_image_url: '',
            industry: 'technology',
            size: 'medium',
            contact_email: '',
            contact_phone: '',
            website: ''
        });
    };

    const resetSettingsForm = () => {
        setSettingsData({
            whatsapp_api_token: '',
            whatsapp_business_account_id: '',
            whatsapp_phone_number_id: '',
            facebook_app_id: '',
            webhook_verify_token: ''
        });
    };

    const openEditModal = (business) => {
        setSelectedBusiness(business);
        setFormData({
            name: business.name,
            description: business.description || '',
            profile_image_url: business.profile_image_url || '',
            industry: business.industry,
            size: business.size,
            contact_email: business.contact_email || '',
            contact_phone: business.contact_phone || '',
            website: business.website || ''
        });
        setShowEditModal(true);
    };

    const openSettingsModal = async (business) => {
        setSelectedBusiness(business);
        try {
            const response = await adminService.getBusinessSettings(business.id);
            if (response.success) {
                setSettingsData(response.data);
            }
        } catch (error) {
            console.error('Error loading business settings:', error);
        }
        setShowSettingsModal(true);
    };

    const industries = [
        'technology',
        'retail',
        'healthcare',
        'finance',
        'other'
    ];

    const sizes = [
        'small',
        'medium',
        'large',
        'enterprise'
    ];

    const filteredBusinesses = businesses.filter(business => {
        const matchesSearch = business.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            business.contact_email?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesIndustry = industryFilter === 'all' || business.industry === industryFilter;
        return matchesSearch && matchesIndustry;
    });

    if (loading) {
        return (
            <div className="admin-loading">
                <div className="loading-spinner"></div>
                <p>Loading businesses...</p>
            </div>
        );
    }

    return (
        <div className="business-management">
            <div className="business-management-header">
                <div className="header-content">
                    <h2>Business Management</h2>
                    <p>Manage businesses and their configurations</p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => setShowCreateModal(true)}
                >
                    <Plus size={20} />
                    Add Business
                </button>
            </div>

            <div className="business-management-filters">
                <div className="search-box">
                    <Search size={20} />
                    <input
                        type="text"
                        placeholder="Search businesses..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="filter-select">
                    <Filter size={20} />
                    <select
                        value={industryFilter}
                        onChange={(e) => setIndustryFilter(e.target.value)}
                    >
                        <option value="all">All Industries</option>
                        {industries.map((industry) => (
                            <option key={industry} value={industry}>
                                {industry.charAt(0).toUpperCase() + industry.slice(1)}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="business-management-grid">
                {filteredBusinesses.map((business) => (
                    <div key={business.id} className="business-card">
                        <div className="business-card-header">
                            <div className="business-info">
                                <h3>{business.name}</h3>
                                <div className="business-meta">
                                    <span className={`industry-badge ${business.industry}`}>
                                        {business.industry}
                                    </span>
                                    <span className={`size-badge ${business.size}`}>
                                        {business.size}
                                    </span>
                                </div>
                            </div>
                            <div className="business-actions">
                                <button
                                    className="btn btn-sm btn-outline"
                                    onClick={() => openEditModal(business)}
                                    title="Edit Business"
                                >
                                    <Edit size={16} />
                                </button>
                                <button
                                    className="btn btn-sm btn-outline"
                                    onClick={() => openSettingsModal(business)}
                                    title="Settings"
                                >
                                    <Settings size={16} />
                                </button>
                                <button
                                    className="btn btn-sm btn-danger"
                                    onClick={() => handleDeleteBusiness(business)}
                                    title="Delete Business"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="business-card-content">
                            {business.description && (
                                <p className="business-description">{business.description}</p>
                            )}

                            <div className="business-details">
                                {business.contact_email && (
                                    <div className="detail-item">
                                        <Mail size={14} />
                                        <span>{business.contact_email}</span>
                                    </div>
                                )}
                                {business.contact_phone && (
                                    <div className="detail-item">
                                        <Phone size={14} />
                                        <span>{business.contact_phone}</span>
                                    </div>
                                )}
                                {business.website && (
                                    <div className="detail-item">
                                        <Globe size={14} />
                                        <span>{business.website}</span>
                                    </div>
                                )}
                            </div>

                            <div className="business-stats">
                                <div className="stat">
                                    <Users size={14} />
                                    <span>{business.user_count} users</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {filteredBusinesses.length === 0 && (
                    <div className="no-businesses">
                        <Building2 size={48} />
                        <p>No businesses found</p>
                    </div>
                )}
            </div>

            {/* Create Business Modal */}
            {showCreateModal && (
                <div className="modal-overlay">
                    <div className="modal large">
                        <div className="modal-header">
                            <h3>Create New Business</h3>
                            <button
                                className="modal-close"
                                onClick={() => setShowCreateModal(false)}
                            >
                                ×
                            </button>
                        </div>
                        <form onSubmit={handleCreateBusiness}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Business Name</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Industry</label>
                                    <select
                                        value={formData.industry}
                                        onChange={(e) => setFormData({...formData, industry: e.target.value})}
                                    >
                                        {industries.map((industry) => (
                                            <option key={industry} value={industry}>
                                                {industry.charAt(0).toUpperCase() + industry.slice(1)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Size</label>
                                    <select
                                        value={formData.size}
                                        onChange={(e) => setFormData({...formData, size: e.target.value})}
                                    >
                                        {sizes.map((size) => (
                                            <option key={size} value={size}>
                                                {size.charAt(0).toUpperCase() + size.slice(1)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Contact Email</label>
                                    <input
                                        type="email"
                                        value={formData.contact_email}
                                        onChange={(e) => setFormData({...formData, contact_email: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Contact Phone</label>
                                <input
                                    type="tel"
                                    value={formData.contact_phone}
                                    onChange={(e) => setFormData({...formData, contact_phone: e.target.value})}
                                />
                            </div>
                            <div className="form-group">
                                <label>Website</label>
                                <input
                                    type="url"
                                    value={formData.website}
                                    onChange={(e) => setFormData({...formData, website: e.target.value})}
                                />
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                                    rows="3"
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" onClick={() => setShowCreateModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Create Business
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Business Modal */}
            {showEditModal && (
                <div className="modal-overlay">
                    <div className="modal large">
                        <div className="modal-header">
                            <h3>Edit Business</h3>
                            <button
                                className="modal-close"
                                onClick={() => setShowEditModal(false)}
                            >
                                ×
                            </button>
                        </div>
                        <form onSubmit={handleUpdateBusiness}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Business Name</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Industry</label>
                                    <select
                                        value={formData.industry}
                                        onChange={(e) => setFormData({...formData, industry: e.target.value})}
                                    >
                                        {industries.map((industry) => (
                                            <option key={industry} value={industry}>
                                                {industry.charAt(0).toUpperCase() + industry.slice(1)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Size</label>
                                    <select
                                        value={formData.size}
                                        onChange={(e) => setFormData({...formData, size: e.target.value})}
                                    >
                                        {sizes.map((size) => (
                                            <option key={size} value={size}>
                                                {size.charAt(0).toUpperCase() + size.slice(1)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Contact Email</label>
                                    <input
                                        type="email"
                                        value={formData.contact_email}
                                        onChange={(e) => setFormData({...formData, contact_email: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Contact Phone</label>
                                <input
                                    type="tel"
                                    value={formData.contact_phone}
                                    onChange={(e) => setFormData({...formData, contact_phone: e.target.value})}
                                />
                            </div>
                            <div className="form-group">
                                <label>Website</label>
                                <input
                                    type="url"
                                    value={formData.website}
                                    onChange={(e) => setFormData({...formData, website: e.target.value})}
                                />
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                                    rows="3"
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" onClick={() => setShowEditModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Update Business
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Settings Modal */}
            {showSettingsModal && (
                <div className="modal-overlay">
                    <div className="modal large">
                        <div className="modal-header">
                            <h3>Business Settings</h3>
                            <button
                                className="modal-close"
                                onClick={() => setShowSettingsModal(false)}
                            >
                                ×
                            </button>
                        </div>
                        <form onSubmit={handleUpdateSettings}>
                            <div className="form-group">
                                <label>WhatsApp API Token</label>
                                <textarea
                                    value={settingsData.whatsapp_api_token}
                                    onChange={(e) => setSettingsData({...settingsData, whatsapp_api_token: e.target.value})}
                                    rows="2"
                                    placeholder="Enter your WhatsApp API token"
                                />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>WhatsApp Business Account ID</label>
                                    <input
                                        type="text"
                                        value={settingsData.whatsapp_business_account_id}
                                        onChange={(e) => setSettingsData({...settingsData, whatsapp_business_account_id: e.target.value})}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>WhatsApp Phone Number ID</label>
                                    <input
                                        type="text"
                                        value={settingsData.whatsapp_phone_number_id}
                                        onChange={(e) => setSettingsData({...settingsData, whatsapp_phone_number_id: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Facebook App ID</label>
                                    <input
                                        type="text"
                                        value={settingsData.facebook_app_id}
                                        onChange={(e) => setSettingsData({...settingsData, facebook_app_id: e.target.value})}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Webhook Verify Token</label>
                                    <input
                                        type="text"
                                        value={settingsData.webhook_verify_token}
                                        onChange={(e) => setSettingsData({...settingsData, webhook_verify_token: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button type="button" onClick={() => setShowSettingsModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Update Settings
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default BusinessManagement;
