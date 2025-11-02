import { useEffect, useRef, useState, useCallback } from 'react';
import { authService } from '../api/authService';

export const useChatWebSocket = () => {
  const wsRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const reconnectTimeoutRef = useRef(null);
  const isConnectingRef = useRef(false);
  const processedNotificationIds = useRef(new Set());
  const maxReconnectAttempts = 5;

  const getBusinessId = () => {
    const user = authService.getCurrentUser();
    return user?.businessId;
  };

  const cleanup = useCallback(() => {
    console.log('Cleaning up WebSocket connection');
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.onmessage = null;
      wsRef.current.onopen = null;
      
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close(1000, 'Component unmounting');
      }
      wsRef.current = null;
    }
    
    isConnectingRef.current = false;
  }, []);

  const connect = useCallback(() => {
    if (isConnectingRef.current) {
      console.log('Connection already in progress, skipping...');
      return;
    }

    const businessId = getBusinessId();
    const token = localStorage.getItem('token');
    
    if (!businessId || !token) {
      console.log('Missing businessId or token');
      return;
    }

    isConnectingRef.current = true;
    
    if (wsRef.current) {
      console.log('Cleaning up existing connection');
      wsRef.current.onclose = null;
      wsRef.current.close();
    }

    // FIXED: Use the correct backend URL
    const getWebSocketUrl = () => {
        // For production (on EC2 / Nginx)
  if (window.location.hostname.includes("marketing.askmeister.com")) {
    return `wss://marketing.askmeister.com/backend/ws?businessId=${businessId}&token=${token}`;
  }

  // For Render (if still used)
  if (window.location.hostname.includes("render.com")) {
    return `wss://askmeister-marketing-dashboard-backend.onrender.com/ws?businessId=${businessId}&token=${token}`;
  }
      
      // For local development
      return `ws://localhost:5000/ws?businessId=${businessId}&token=${token}`;
    };

    const wsUrl = getWebSocketUrl();
    console.log('Connecting to WebSocket:', wsUrl);
    
    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected successfully');
        setIsConnected(true);
        setReconnectAttempts(0);
        isConnectingRef.current = false;
        processedNotificationIds.current.clear();
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('WebSocket message received:', message);
          
          const notificationId = message.id || 
            `${message.type}-${message.conversationId || ''}-${message.messageId || message.message?.id || Date.now()}-${Math.random()}`;
          
          if (processedNotificationIds.current.has(notificationId)) {
            console.log('Duplicate notification ignored:', notificationId);
            return;
          }
          
          processedNotificationIds.current.add(notificationId);
          message.id = notificationId;
          
          setNotifications(prev => {
            if (message.type === 'message_status') {
              const filtered = prev.filter(n => 
                !(n.type === 'message_status' && n.messageId === message.messageId)
              );
              return [...filtered, message];
            }
            return [...prev, message];
          });
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        isConnectingRef.current = false;
        
        if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
          console.log(`Reconnecting in ${delay}ms... (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts(prev => prev + 1);
            connect();
          }, delay);
        } else if (event.code === 1000) {
          console.log('WebSocket closed normally');
        } else {
          console.error('Max reconnection attempts reached');
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        isConnectingRef.current = false;
      };

    } catch (error) {
      console.error('Error creating WebSocket:', error);
      isConnectingRef.current = false;
    }
  }, [reconnectAttempts]);

  useEffect(() => {
    const businessId = getBusinessId();
    const token = localStorage.getItem('token');
    
    if (businessId && token) {
      connect();
    }

    return cleanup;
  }, []);

  const sendMessage = useCallback((message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('Sending WebSocket message:', message);
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    console.warn('WebSocket not connected, message not sent:', message);
    return false;
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    processedNotificationIds.current.clear();
  }, []);

  useEffect(() => {
    const cleanup = setInterval(() => {
      setNotifications(prev => {
        const now = Date.now();
        const filtered = prev.filter(n => {
          const notificationTime = new Date(n.timestamp || now).getTime();
          return now - notificationTime < 300000;
        });
        
        if (filtered.length !== prev.length) {
          const remainingIds = new Set(filtered.map(n => n.id));
          processedNotificationIds.current = remainingIds;
        }
        
        return filtered;
      });
    }, 60000);

    return () => clearInterval(cleanup);
  }, []);

  const reconnect = useCallback(() => {
    console.log('Manual reconnect requested');
    setReconnectAttempts(0);
    processedNotificationIds.current.clear();
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    isConnectingRef.current = false;
    connect();
  }, [connect]);

  return {
    isConnected,
    notifications,
    clearNotifications,
    sendMessage,
    reconnect
  };
};