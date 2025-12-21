import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, PlusCircle, Bell, User, ChevronDown } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
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
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);

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

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getActionButton = () => {
    switch (pathname) {
      case '/templates':
        return {
          text: 'Create Template',
          path: '/templates/create',
          icon: <PlusCircle size={18} />
        };
      case '/campaigns':
        return {
          text: 'Create Campaign',
          path: '/send-message',
          icon: <PlusCircle size={18} />
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
    markAllAsRead();
  };

  const handleUserMenuToggle = () => {
    setShowUserMenu(!showUserMenu);
  };

  const handleSettingsClick = () => {
    navigate('/settings');
    setShowUserMenu(false);
  };

  const getUserDisplayName = () => {
    if (!userData) return 'User';
    const firstName = userData.firstName || '';
    const lastName = userData.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || userData.name || 'User';
  };

  const getUserInitials = () => {
    if (!userData) return 'U';
    const firstName = userData.firstName || '';
    const lastName = userData.lastName || '';
    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    }
    return (userData.name || 'User').charAt(0).toUpperCase();
  };

  return (
    <header className="header-modern">
      <div className="header-container">
        {/* Left Section */}
        <div className="header-left-section">
          <button 
            className="header-menu-btn" 
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
          >
            <Menu size={22} />
          </button>

          <div className="header-brand" onClick={handleDashboardClick}>
            <div className="brand-logo">
              <img
                src="/images/askmeister.jpg"
                alt="AskMeister Logo"
                className="brand-logo-image"
                onError={(e) => {
                  e.target.style.display = 'none';
                  if (e.target.nextSibling) {
                    e.target.nextSibling.style.display = 'flex';
                  }
                }}
              />
              <span className="brand-logo-fallback">AM</span>
            </div>
            <div className="brand-text">
              <h1 className="brand-title">AskMeister</h1>
              <span className="brand-subtitle">Smart Messaging</span>
            </div>
          </div>

          <div className="header-divider-vertical"></div>

          {/* Business Info */}
          {!loading && businessData && (
            <div className="header-business-info">
              <div className="business-avatar-wrapper">
                {businessData.profile_image_url ? (
                  <img
                    src={businessData.profile_image_url}
                    alt={businessData.name}
                    className="business-avatar-img"
                  />
                ) : (
                  <div className="business-avatar-placeholder">
                    {businessData.name?.charAt(0)?.toUpperCase() || 'B'}
                  </div>
                )}
                <div className="business-status-dot"></div>
              </div>
              <div className="business-details-wrapper">
                <div className="business-name-wrapper">
                  <span className="business-name-text">
                    {businessData.name || 'Your Business'}
                  </span>
                  <span className="business-status-badge">Connected</span>
                </div>
                {(businessData.contact_phone || businessData.contact_email) && (
                  <span className="business-contact-info">
                    {businessData.contact_phone || businessData.contact_email}
                  </span>
                )}
              </div>
            </div>
          )}

          {loading && (
            <div className="header-business-skeleton">
              <div className="skeleton-avatar"></div>
              <div className="skeleton-text">
                <div className="skeleton-line skeleton-line-short"></div>
                <div className="skeleton-line"></div>
              </div>
            </div>
          )}
        </div>

        {/* Right Section */}
        <div className="header-right-section">
          {actionButton && (
            <button
              className="header-action-primary"
              onClick={() => navigate(actionButton.path)}
            >
              <span className="action-icon">{actionButton.icon}</span>
              <span className="action-text">{actionButton.text}</span>
            </button>
          )}

          <div className="header-actions-group">
            <button
              className="header-action-icon notification-action"
              onClick={handleNotificationClick}
              aria-label="Notifications"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="notification-count-badge">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            <div className="header-user-menu" ref={userMenuRef}>
              <button
                className="header-user-button"
                onClick={handleUserMenuToggle}
                aria-label="User menu"
              >
                <div className="user-avatar-circle">
                  <User size={18} />
                </div>
                <span className="user-name-text">{getUserDisplayName()}</span>
                <ChevronDown size={16} className="user-menu-chevron" />
              </button>

              {showUserMenu && (
                <div className="user-menu-dropdown">
                  <div className="user-menu-header">
                    <div className="user-menu-avatar">
                      {getUserInitials()}
                    </div>
                    <div className="user-menu-info">
                      <div className="user-menu-name">{getUserDisplayName()}</div>
                      {userData?.email && (
                        <div className="user-menu-email">{userData.email}</div>
                      )}
                    </div>
                  </div>
                  <div className="user-menu-divider"></div>
                  <button
                    className="user-menu-item"
                    onClick={handleSettingsClick}
                  >
                    <User size={16} />
                    <span>Settings</span>
                  </button>
                </div>
              )}
            </div>
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