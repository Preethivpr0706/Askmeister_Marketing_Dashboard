import React from 'react';
import { X, Volume2, VolumeX } from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';
import './NotificationModal.css';

const NotificationModal = ({ isOpen, onClose }) => {
  const {
    notifications,
    unreadCount,
    soundEnabled,
    toggleSound,
    markAllAsRead,
    clearNotifications
  } = useNotifications();

  if (!isOpen) return null;

  const formatNotificationTime = (timestamp) => {
    const now = new Date();
    const notificationTime = new Date(timestamp || now);
    const diffMs = now - notificationTime;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'new_message':
        return '💬';
      case 'typing':
        return '⌨️';
      case 'message_status':
        return '✅';
      default:
        return '🔔';
    }
  };

  const getNotificationMessage = (notification) => {
    switch (notification.type) {
      case 'new_message':
        return notification.message?.content || 'New message received';
      case 'typing':
        return notification.isTyping ? 'Someone is typing...' : 'Stopped typing';
      case 'message_status':
        return `Message ${notification.status}`;
      default:
        return 'Notification received';
    }
  };

  return (
    <div className="notification-modal-overlay" onClick={onClose}>
      <div className="notification-modal" onClick={(e) => e.stopPropagation()}>
        <div className="notification-modal-header">
          <div className="notification-modal-title">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <span className="notification-badge">{unreadCount}</span>
            )}
          </div>
          <div className="notification-modal-actions">
            <button
              className={`notification-sound-toggle ${soundEnabled ? 'active' : ''}`}
              onClick={toggleSound}
              title={soundEnabled ? 'Disable sound' : 'Enable sound'}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
            {notifications.length > 0 && (
              <button
                className="notification-clear-all"
                onClick={() => {
                  clearNotifications();
                  markAllAsRead();
                }}
              >
                Clear All
              </button>
            )}
            <button className="notification-modal-close" onClick={onClose}>
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="notification-modal-content">
          {notifications.length === 0 ? (
            <div className="notification-empty">
              <div className="notification-empty-icon">🔔</div>
              <div className="notification-empty-text">No notifications</div>
            </div>
          ) : (
            <div className="notification-list">
              {notifications.slice(-10).map((notification) => (
                <div key={notification.id} className="notification-item">
                  <div className="notification-item-icon">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="notification-item-content">
                    <div className="notification-item-message">
                      {getNotificationMessage(notification)}
                    </div>
                    <div className="notification-item-meta">
                      <span className="notification-item-time">
                        {formatNotificationTime(notification.timestamp)}
                      </span>
                      {notification.conversationId && (
                        <span className="notification-item-conversation">
                          Conversation #{notification.conversationId}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationModal;
