import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, PlusCircle, Bell, User } from 'lucide-react';
import { useState, useEffect } from 'react';
import { businessService } from '../../api/businessService';
import { useNotifications } from '../../contexts/NotificationContext';
import NotificationModal from './NotificationModal';
import './Header.css';

function Header({ toggleSidebar }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { pathname } = location;
  const [businessData, setBusinessData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  const { unreadCount, markAllAsRead } = useNotifications();

  useEffect(() => {
    const fetchBusinessData = async () => {
      try {
        const response = await businessService.getBusinessDetails();
        if (response.success) {
          const { user, business } = response.data;
          setBusinessData(business);
          setUserData(user);
        }
      } catch (error) {
        console.error('Error fetching business data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBusinessData();
  }, []);

  const getActionButton = () => {
    switch (pathname) {
      case '/templates':
        return {
          text: 'Create Template',
          path: '/templates/create',
          icon: <PlusCircle size={16} />
        };
      case '/campaigns':
        return {
          text: 'Create Campaign',
          path: '/send-message',
          icon: <PlusCircle size={16} />
        };
      default:
        return null;
    }
  };

  const actionButton = getActionButton();

  const handleDashboardClick = () => {
    navigate('/');
  };

  const handleNotificationClick = () => {
    setShowNotificationModal(true);
    markAllAsRead(); // Mark as read when opening modal
  };

  return (
    <header className="header">
      <div className="header-left">
        <button className="menu-toggle" onClick={toggleSidebar}>
          <Menu size={20} />
        </button>

        {/* Brand Section */}
        <div className="brand-section" onClick={handleDashboardClick}>
          <div className="logo-container">
            <div className="logo">
              <img
                src="/images/askmeister.jpg"
                alt="AskMeister Logo"
                className="logo-image"
                onError={(e) => {
                  // Fallback to text logo if image fails to load
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <span className="logo-text-fallback">AM</span>
            </div>
          </div>
          <div className="brand-info">
            <h1 className="brand-name">AskMeister</h1>
            <div className="brand-tagline">Smart Messaging Platform</div>
          </div>
        </div>

        {/* Divider */}
        <div className="header-divider"></div>

        {/* Business Section */}
        <div className="business-section">
          {!loading && businessData ? (
            <div className="business-info">
              <div className="business-avatar">
                {businessData.profile_image_url ? (
                  <img
                    src={businessData.profile_image_url}
                    alt={businessData.name}
                    className="business-image"
                  />
                ) : (
                  <div className="business-placeholder">
                    {businessData.name?.charAt(0)?.toUpperCase() || 'B'}
                  </div>
                )}
              </div>
              <div className="business-details">
                <div className="business-name-row">
                  <span className="business-name">{businessData.name || 'Your Business'}</span>
                  <div className="status-indicator">
                    <div className="status-dot"></div>
                    <span className="status-text">Connected</span>
                  </div>
                </div>
                <div className="business-contact">
                  {businessData.contact_phone && (
                    <span className="contact-phone">📞 {businessData.contact_phone}</span>
                  )}
                  {!businessData.contact_phone && businessData.contact_email && (
                    <span className="contact-email">✉️ {businessData.contact_email}</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="business-loading">
              <div className="loading-placeholder"></div>
            </div>
          )}
        </div>
      </div>

      <div className="header-right">
        {actionButton && (
          <button
            className="btn btn-primary create-btn"
            onClick={() => navigate(actionButton.path)}
          >
            {actionButton.icon}
            <span>{actionButton.text}</span>
          </button>
        )}
        <div className="header-actions">
          <button
            className="header-action-btn notification-btn"
            onClick={handleNotificationClick}
            title="Notifications"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </button>
          <div className="user-profile">
            <button
              className="user-profile-btn"
              onClick={() => navigate('/settings')}
            >
              <div className="avatar">
                <User size={20} />
              </div>
              <span className="user-name">
                {(() => {
                  if (!userData) return 'User';
                  const firstName = userData.firstName || '';
                  const lastName = userData.lastName || '';
                  const fullName = `${firstName} ${lastName}`.trim();
                  return fullName || userData.name || 'User';
                })()}
              </span>
            </button>
          </div>
        </div>
      </div>

      <NotificationModal
        isOpen={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
      />
    </header>
  );
}

export default Header;