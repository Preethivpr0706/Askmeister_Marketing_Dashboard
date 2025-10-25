// src/components/Admin/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { authService } from '../../api/authService';
import { adminService } from '../../api/adminService';
import UserManagement from './UserManagement';
import BusinessManagement from './BusinessManagement';
import AdminStats from './AdminStats';
import { Users, Building2, BarChart3, Shield } from 'lucide-react';
import './AdminDashboard.css';

function AdminDashboard() {
    const location = useLocation();
    const [activeTab, setActiveTab] = useState('overview');
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalBusinesses: 0,
        adminUsers: 0,
        regularUsers: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Set active tab based on current route
        if (location.pathname.includes('/users')) {
            setActiveTab('users');
        } else if (location.pathname.includes('/businesses')) {
            setActiveTab('businesses');
        } else {
            setActiveTab('overview');
        }

        loadStats();
    }, [location.pathname]);

    const loadStats = async () => {
        try {
            setLoading(true);
            const [usersResponse, businessesResponse] = await Promise.all([
                adminService.getAllUsers(),
                adminService.getAllBusinesses()
            ]);

            if (usersResponse.success && businessesResponse.success) {
                const users = usersResponse.data;
                const businesses = businessesResponse.data;

                setStats({
                    totalUsers: users.length,
                    totalBusinesses: businesses.length,
                    adminUsers: users.filter(user => user.role === 'admin').length,
                    regularUsers: users.filter(user => user.role === 'user').length
                });
            }
        } catch (error) {
            console.error('Error loading admin stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const tabs = [
        {
            id: 'overview',
            label: 'Overview',
            icon: <BarChart3 size={20} />,
            path: '/admin'
        },
        {
            id: 'users',
            label: 'User Management',
            icon: <Users size={20} />,
            path: '/admin/users'
        },
        {
            id: 'businesses',
            label: 'Business Management',
            icon: <Building2 size={20} />,
            path: '/admin/businesses'
        }
    ];

    if (!authService.isAdmin()) {
        return (
            <div className="admin-access-denied">
                <div className="access-denied-content">
                    <Shield size={64} className="access-denied-icon" />
                    <h2>Access Denied</h2>
                    <p>You don't have permission to access the admin panel.</p>
                    <Link to="/" className="btn btn-primary">Go Back</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-dashboard">
            <div className="admin-header">
                <div className="admin-header-content">
                    <div className="admin-title">
                        <Shield size={32} className="admin-icon" />
                        <h1>Admin Panel</h1>
                    </div>
                    <div className="admin-subtitle">
                        Manage users, businesses, and system settings
                    </div>
                </div>
            </div>

            <div className="admin-container">
                <div className="admin-sidebar">
                    <nav className="admin-nav">
                        {tabs.map((tab) => (
                            <Link
                                key={tab.id}
                                to={tab.path}
                                className={`admin-nav-item ${activeTab === tab.id ? 'active' : ''}`}
                            >
                                <span className="admin-nav-icon">{tab.icon}</span>
                                <span className="admin-nav-label">{tab.label}</span>
                            </Link>
                        ))}
                    </nav>
                </div>

                <div className="admin-content">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}

export default AdminDashboard;
