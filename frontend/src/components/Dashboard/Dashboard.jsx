import { 
  BarChart3, 
  MessagesSquare, 
  FileText, 
  Zap, 
  Activity, 
  TrendingUp, 
  Users, 
  Calendar,
  CheckCircle,
  XCircle,
  ArrowRight,
  Loader2
} from 'lucide-react';
import StatCard from './StatCard';
import DeliveryChart from './DeliveryChart';
import CampaignTable from './CampaignTable';
import './Dashboard.css';
import { useState, useEffect } from 'react';
import { dashboardService } from '../../api/dashboardService';
import { useNavigate } from 'react-router-dom';

function Dashboard() {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState({
    stats: null,
    recentCampaigns: [],
    topTemplates: [],
    messageStats: null,
    isLoading: true,
    error: null
  });

  const formatActivityDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const fetchDashboardData = async () => {
    try {
      const [stats, campaigns, templates, messageStats] = await Promise.all([
        dashboardService.getDashboardStats(),
        dashboardService.getRecentCampaigns(),
        dashboardService.getTopTemplates(),
        dashboardService.getMessageStats()
      ]);

      setDashboardData({
        stats: stats.data,
        recentCampaigns: campaigns.data,
        topTemplates: templates.data,
        messageStats: messageStats.data,
        isLoading: false,
        error: null
      });
    } catch (error) {
      setDashboardData(prev => ({
        ...prev,
        isLoading: false,
        error: error.message
      }));
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (dashboardData.isLoading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner">
          <Loader2 size={32} className="spinner-icon" />
        </div>
        <p className="loading-text">Loading dashboard data...</p>
      </div>
    );
  }

  if (dashboardData.error) {
    return (
      <div className="dashboard-error">
        <div className="error-icon">
          <XCircle size={48} />
        </div>
        <h3 className="error-title">Error Loading Dashboard</h3>
        <p className="error-message">{dashboardData.error}</p>
        <button className="error-retry-btn" onClick={fetchDashboardData}>
          Try Again
        </button>
      </div>
    );
  }

  const { stats, recentCampaigns, topTemplates, messageStats } = dashboardData;

  const statsCards = [
    {
      title: 'Total Campaigns',
      value: stats?.totalCampaigns || 0,
      change: stats?.campaignGrowth || '0%',
      icon: <MessagesSquare size={20} />,
      color: 'blue'
    },
    {
      title: 'Messages Sent',
      value: (stats?.totalMessages || 0).toLocaleString(),
      change: stats?.messageGrowth || '0%',
      icon: <Zap size={20} />,
      color: 'green'
    },
    {
      title: 'Templates Created',
      value: stats?.totalTemplates || 0,
      change: stats?.templateGrowth || '0%',
      icon: <FileText size={20} />,
      color: 'purple'
    },
    {
      title: 'Success Rate',
      value: `${stats?.successRate || 0}%`,
      change: stats?.successRateChange || '0%',
      icon: <Activity size={20} />,
      color: 'yellow'
    },
    {
      title: 'Messages Delivered',
      value: `${(stats?.deliveredMessages || 0).toLocaleString()} (${stats?.deliveryRate || 0}%)`,
      change: stats?.deliveryGrowth || '0%',
      icon: <CheckCircle size={20} />,
      color: 'success'
    },
    {
      title: 'Failed Messages',
      value: `${(stats?.failedMessages || 0).toLocaleString()} (${stats?.failureRate || 0}%)`,
      change: stats?.failureGrowth || '0%',
      icon: <XCircle size={20} />,
      color: 'error'
    }
  ];

  const deliveryData = {
    labels: ['Delivered', 'Read', 'Replied', 'Failed', 'Pending'],
    datasets: [{
      label: 'Message Status',
      data: [
        messageStats?.delivered || 0,
        messageStats?.read || 0,
        messageStats?.replied || 0,
        messageStats?.failed || 0,
        messageStats?.pending || 0
      ],
      backgroundColor: [
        '#10b981',
        '#3b82f6',
        '#8b5cf6',
        '#ef4444',
        '#f59e0b',
      ],
    }],
  };

  const activityData = {
    labels: messageStats?.timeline?.map(item => formatActivityDate(item.date)) || [],
    datasets: [
      {
        label: 'Messages Sent',
        data: messageStats?.timeline?.map(item => item.sent) || [],
        backgroundColor: '#3b82f6',
      },
      {
        label: 'Messages Read',
        data: messageStats?.timeline?.map(item => item.read) || [],
        backgroundColor: '#10b981',
      },
    ],
  };

  return (
    <div className="dashboard-modern">
      {/* Dashboard Header */}
      <div className="dashboard-header">
        <div className="dashboard-header-content">
          <h1 className="dashboard-title">Dashboard</h1>
          <p className="dashboard-subtitle">Welcome back! Here's what's happening with your campaigns.</p>
        </div>
      </div>

      {/* Stats Grid */}
      <section className="dashboard-stats-section">
        <div className="stats-grid-modern">
          {statsCards.map((stat, index) => (
            <StatCard key={index} {...stat} />
          ))}
        </div>
      </section>

      {/* Charts Section */}
      <section className="dashboard-charts-section">
        <div className="charts-grid">
          <div className="chart-card-modern">
            <div className="chart-card-header">
              <div className="chart-header-content">
                <div className="chart-header-icon">
                  <BarChart3 size={20} />
                </div>
                <div>
                  <h3 className="chart-title">Message Delivery Status</h3>
                  <p className="chart-subtitle">Distribution of message statuses</p>
                </div>
              </div>
              <button className="chart-filter-btn">
                <Calendar size={16} />
                <span>Last 30 days</span>
              </button>
            </div>
            <div className="chart-wrapper-modern">
              <DeliveryChart data={deliveryData} type="pie" />
            </div>
          </div>
          
          <div className="chart-card-modern">
            <div className="chart-card-header">
              <div className="chart-header-content">
                <div className="chart-header-icon">
                  <Activity size={20} />
                </div>
                <div>
                  <h3 className="chart-title">Message Activity</h3>
                  <p className="chart-subtitle">Sent vs read messages over time</p>
                </div>
              </div>
              <button className="chart-filter-btn">
                <Calendar size={16} />
                <span>This Week</span>
              </button>
            </div>
            <div className="chart-wrapper-modern">
              <DeliveryChart data={activityData} type="bar" />
            </div>
          </div>
        </div>
      </section>

      {/* Recent Campaigns Section */}
      <section className="dashboard-campaigns-section">
        <div className="campaigns-card-modern">
          <div className="campaigns-card-header">
            <div className="campaigns-header-content">
              <div className="campaigns-header-icon">
                <TrendingUp size={20} />
              </div>
              <div>
                <h3 className="campaigns-title">Recent Campaigns</h3>
                <p className="campaigns-subtitle">Your latest marketing campaigns</p>
              </div>
            </div>
            <button 
              className="view-all-btn"
              onClick={() => navigate('/campaigns')}
            >
              <span>View All</span>
              <ArrowRight size={16} />
            </button>
          </div>
          <div className="campaigns-table-wrapper">
            <CampaignTable campaigns={recentCampaigns} />
          </div>
        </div>
      </section>

      {/* Top Templates Section */}
      <section className="dashboard-templates-section">
        <div className="templates-card-modern">
          <div className="templates-card-header">
            <div className="templates-header-content">
              <div className="templates-header-icon">
                <FileText size={20} />
              </div>
              <div>
                <h3 className="templates-title">Top Performing Templates</h3>
                <p className="templates-subtitle">Your best performing message templates</p>
              </div>
            </div>
          </div>
          <div className="templates-list">
            {topTemplates && topTemplates.length > 0 ? (
              topTemplates.map((template, index) => (
                <div key={index} className="template-item-modern">
                  <div className="template-item-content">
                    <div className="template-item-icon">
                      <FileText size={18} />
                    </div>
                    <div className="template-item-info">
                      <span className="template-item-name">{template.name}</span>
                      <span className="template-item-category">{template.category || 'General'}</span>
                    </div>
                  </div>
                  <div className="template-item-metric">
                    <span className="template-metric-value">{template.deliveryRate || 0}%</span>
                    <span className="template-metric-label">Delivery Rate</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="templates-empty">
                <FileText size={40} />
                <p>No templates yet</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default Dashboard;