import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authService } from '../../api/authService';
import { businessService } from '../../api/businessService';

import {
  LayoutDashboard,
  FileText,
  Send,
  MessageSquare,
  MessageCircle,
  Settings,
  LogOut,
  Menu,
  X,
  Users,
  PlusCircle,
  List,
  Reply,
  Bot,
Megaphone,
BrainCircuit,
  Workflow,
  Shield,
  UserCog,
  Building2,
  UserX,
  Contact,
  UserPlus
} from 'lucide-react';
import './Sidebar.css';

function Sidebar({ isOpen, toggleSidebar }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userData, setUserData] = useState(null);

  const adminMenuItems = authService.isAdmin() ? [
    {
      title: 'Admin Panel',
      path: '/admin',
      icon: <Shield size={20} />
    }
  ] : [];

  const menuItems = authService.isAdmin() ? [
    {
      title: 'Settings',
      path: '/settings',
      icon: <Settings size={20} />
    }
  ] : [
    {
      title: 'Dashboard',
      path: '/',
      icon: <LayoutDashboard size={20} />
    },
    {
      title: 'Message Templates',
      path: '/templates',
      icon: <FileText size={20} />
    },
    {
      title: 'Campaigns',
      path: '/campaigns',
      icon: <Megaphone size={20} />
    },
    {
      title: 'Send Message',
      path: '/send-message',
      icon: <Send size={20} />
    },
    {
      title: 'Live Chat',
      path: '/conversations',
      icon: <MessageSquare size={20} />
    },
    {
      title: 'Quick Replies',
      path: '/quick-replies',
      icon: <Reply size={20} />
    },
    {
      title: 'Auto-Replies',
      path: '/auto-replies',
      icon: <Bot size={20} />
    },
    {
      title: 'Chatbot Builder',
      path: '/chatbot',
      icon: <BrainCircuit size={20} />
    },
    {
      title: 'Flow Builder',
      path: '/flows',
      icon: <Workflow size={20} />
    },
    {
      title: 'Contact List',
      path: '/contacts/list',
      icon: <Contact size={20} />
    },
    {
      title: 'Import Contacts',
      path: '/contacts/import',
      icon: <UserPlus size={20} />
    },
    {
      title: 'Unsubscribed',
      path: '/contacts/unsubscribed',
      icon: <UserX size={20} />
    },
    {
      title: 'Settings',
      path: '/settings',
      icon: <Settings size={20} />
    }
  ];

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    try {
      setIsLoading(true);
      await authService.logout();
      setShowLogoutConfirm(false);
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  // Auto-close sidebar on any route change
  useEffect(() => {
    if (isOpen) {
      toggleSidebar();
    }
  }, [location.pathname]);

  // Fetch user data via businessService to display name in footer
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const response = await businessService.getBusinessDetails();
        if (mounted && response.success) {
          setUserData(response.data.user || null);
        }
      } catch (e) {
        // noop
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="sidebar-overlay" onClick={toggleSidebar}></div>
      )}
      
      <div className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="logo-container">
            <div className="logo-wrapper">
              <MessageCircle size={24} className="logo-icon" />
              <div className="logo-pulse"></div>
            </div>
            <div className="brand-info">
              <span className="logo-text">AskMeister</span>
              <span className="logo-subtitle">WhatsApp Marketing</span>
            </div>
          </div>
          {isOpen && (
            <button className="toggle-button" onClick={toggleSidebar}>
              <X size={20} />
            </button>
          )}
        </div>

        <nav className="sidebar-nav">
          <ul className="menu-list">
            {menuItems.map((item) => (
              <li key={item.path} className="menu-item">
                <Link
                  to={item.path}
                  className={`menu-link ${location.pathname === item.path ? 'active' : ''}`}
                  onClick={() => { if (isOpen) toggleSidebar(); }}
                >
                  <span className="menu-icon">{item.icon}</span>
                  <span className="menu-text">{item.title}</span>
                  {location.pathname === item.path && (
                    <div className="active-indicator"></div>
                  )}
                </Link>
              </li>
            ))}

            {/* Show admin items directly in menu for admin users */}
            {adminMenuItems.map((item) => (
              <li key={item.path} className="menu-item">
                <Link
                  to={item.path}
                  className={`menu-link ${location.pathname === item.path ? 'active' : ''}`}
                  onClick={() => { if (isOpen) toggleSidebar(); }}
                >
                  <span className="menu-icon">{item.icon}</span>
                  <span className="menu-text">{item.title}</span>
                  {location.pathname === item.path && (
                    <div className="active-indicator"></div>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar">
              <Users size={20} />
            </div>
            <div className="user-info">
              <span className="user-name">{(() => {
                const u = userData;
                if (!u) return 'User';
                const firstName = u.firstName || '';
                const lastName = u.lastName || '';
                const fullName = `${firstName} ${lastName}`.trim();
                return fullName || u.name || 'User';
              })()}</span>
              <span className="user-status">Online</span>
            </div>
          </div>
          <button className="logout-button" onClick={handleLogout}>
            <span className="menu-icon"><LogOut size={20} /></span>
            <span className="menu-text">Logout</span>
          </button>
        </div>

      </div>

      {/* Logout Modal - Rendered outside sidebar */}
      {showLogoutConfirm && (
        <div className="logout-modal-overlay">
          <div className="logout-modal">
            <div className="logout-modal-header">
              <div className="logout-icon">
                <LogOut size={24} />
              </div>
              <h3>Confirm Logout</h3>
              <p>Are you sure you want to log out of AskMeister?</p>
            </div>
            <div className="logout-modal-actions">
              <button 
                className="btn btn-secondary" 
                onClick={cancelLogout}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button 
                className="btn btn-danger" 
                onClick={confirmLogout}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="spinner"></div>
                    Logging out...
                  </>
                ) : (
                  'Logout'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Sidebar;