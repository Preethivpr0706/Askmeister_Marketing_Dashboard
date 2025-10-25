import React, { createContext, useContext, useState, useEffect } from 'react';
import { useChatWebSocket } from '../hooks/useChatWebSocket';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { notifications, clearNotifications, isConnected } = useChatWebSocket();
  const [unreadCount, setUnreadCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);

  // Calculate unread count from notifications
  useEffect(() => {
    const unread = notifications.filter(notification => {
      // Count new messages and typing indicators as unread
      return notification.type === 'new_message' || notification.type === 'typing';
    }).length;

    setUnreadCount(unread);
  }, [notifications]);

  // Play notification sound for new messages
  useEffect(() => {
    if (soundEnabled && notifications.length > 0) {
      const latestNotification = notifications[notifications.length - 1];

      if (latestNotification.type === 'new_message') {
        // Play notification sound
        try {
          // Create a simple beep sound using Web Audio API
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);

          oscillator.frequency.value = 800;
          oscillator.type = 'sine';

          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.2);
        } catch (error) {
          console.log('Could not play notification sound:', error);
        }
      }
    }
  }, [notifications, soundEnabled]);

  const markAllAsRead = () => {
    setUnreadCount(0);
  };

  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
  };

  const value = {
    notifications,
    unreadCount,
    soundEnabled,
    showNotifications,
    isConnected,
    clearNotifications,
    markAllAsRead,
    toggleSound,
    setShowNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
