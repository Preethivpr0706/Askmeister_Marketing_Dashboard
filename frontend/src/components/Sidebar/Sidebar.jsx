import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authService } from '../../api/authService';
import { businessService } from '../../api/businessService';

import {
  LayoutDashboard,
  FileText,
  Send,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  X,
  Users,
  PlusCircle,
  List,
  Reply,
  Bot,
  ChevronDown,
  ChevronRight,
Megaphone,
BrainCircuit,
Workflow,
Shield,
UserCog,
Building2
} from 'lucide-react';
import './Sidebar.css';

function Sidebar({ isOpen, toggleSidebar }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [contactsOpen, setContactsOpen] = useState(location.pathname.startsWith('/contacts'));
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

  const toggleContacts = () => {
    setContactsOpen(!contactsOpen);
  };

  // Auto-close sidebar on any route change
  useEffect(() => {
    if (isOpen) {
      toggleSidebar();
    }
  }, [location.pathname]);

  // Auto-expand Contacts when navigating to any contacts route (only for regular users)
  useEffect(() => {
    if (!authService.isAdmin() && location.pathname.startsWith('/contacts')) {
      setContactsOpen(true);
    } else {
      setContactsOpen(false);
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
              <MessageSquare size={28} className="logo-icon" />
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

            {/* Contacts Dropdown - only show for regular users */}
            {!authService.isAdmin() && (
              <li className={`menu-item dropdown-item ${contactsOpen ? 'expanded' : ''}`}>
                <div className={`menu-link dropdown-toggle ${contactsOpen ? 'open' : ''}`} onClick={toggleContacts}>
                  <span className="menu-icon"><Users size={20} /></span>
                  <span className="menu-text">Contacts</span>
                  <span className="dropdown-arrow">
                    {contactsOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </span>
                </div>
                <div className={`submenu-container ${contactsOpen ? 'open' : ''}`}>
                  <ul className="submenu-list">
                    <li className="submenu-item">
                      <Link
                        to="/contacts/list"
                        className={`submenu-link ${location.pathname === '/contacts/list' ? 'active' : ''}`}
                        onClick={() => { if (isOpen) toggleSidebar(); }}
                      >
                        <List size={16} />
                        <span className="submenu-text">Contact List</span>
                      </Link>
                    </li>
                    <li className="submenu-item">
                      <Link
                        to="/contacts/import"
                        className={`submenu-link ${location.pathname === '/contacts/import' ? 'active' : ''}`}
                        onClick={() => { if (isOpen) toggleSidebar(); }}
                      >
                        <PlusCircle size={16} />
                        <span className="submenu-text">Import Contacts</span>
                      </Link>
                    </li>
                  </ul>
                </div>
              </li>
            )}
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