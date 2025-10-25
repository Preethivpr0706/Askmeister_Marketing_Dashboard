// src/components/Admin/AdminStats.jsx
import { Users, Building2, UserCheck, UserX } from 'lucide-react';

function AdminStats({ stats, loading }) {
    const statCards = [
        {
            title: 'Total Users',
            value: loading ? '...' : stats.totalUsers,
            icon: <Users size={24} />,
            color: 'blue',
            description: 'All registered users'
        },
        {
            title: 'Total Businesses',
            value: loading ? '...' : stats.totalBusinesses,
            icon: <Building2 size={24} />,
            color: 'green',
            description: 'Active businesses'
        },
        {
            title: 'Admin Users',
            value: loading ? '...' : stats.adminUsers,
            icon: <UserCheck size={24} />,
            color: 'purple',
            description: 'Administrator accounts'
        },
        {
            title: 'Regular Users',
            value: loading ? '...' : stats.regularUsers,
            icon: <UserX size={24} />,
            color: 'orange',
            description: 'Standard user accounts'
        }
    ];

    return (
        <div className="admin-stats">
            <div className="admin-stats-header">
                <h2>System Overview</h2>
                <p>Monitor your platform's user and business metrics</p>
            </div>

            <div className="admin-stats-grid">
                {statCards.map((card, index) => (
                    <div key={index} className={`admin-stat-card ${card.color}`}>
                        <div className="admin-stat-icon">
                            {card.icon}
                        </div>
                        <div className="admin-stat-content">
                            <div className="admin-stat-value">
                                {card.value}
                            </div>
                            <div className="admin-stat-title">
                                {card.title}
                            </div>
                            <div className="admin-stat-description">
                                {card.description}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="admin-recent-activity">
                <h3>Recent Activity</h3>
                <div className="activity-placeholder">
                    <p>Activity tracking will be implemented here</p>
                    <p className="activity-note">This section will show recent user registrations, business creations, and admin actions.</p>
                </div>
            </div>
        </div>
    );
}

export default AdminStats;
