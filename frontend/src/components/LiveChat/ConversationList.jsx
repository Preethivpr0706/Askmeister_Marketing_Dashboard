import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Search, Archive, Bot, User, MessageCircle, X, Menu, Trash2, CheckSquare, Square, Check } from 'lucide-react';
import { conversationService } from '../../api/conversationService';
import { useChatWebSocket } from '../../hooks/useChatWebSocket';
import { authService } from '../../api/authService';
import ConversationDeleteModal from './ConversationDeleteModal';
import ChatbotService from '../../api/chatbotService';
import { toast } from 'react-toastify';
import './ConversationList.css';
import './BotToggle.css';

const ConversationList = () => {
  const { id: activeConversationId } = useParams();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedConversations, setSelectedConversations] = useState(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showChatbotModal, setShowChatbotModal] = useState(false);
  const [availableFlows, setAvailableFlows] = useState([]);
  const [selectedFlow, setSelectedFlow] = useState(null);
  const [chatbotEnabled, setChatbotEnabled] = useState(false);
  const [isTogglingChatbot, setIsTogglingChatbot] = useState(false);
  
  const user = authService.getCurrentUser();
  const businessId = user?.businessId;

  const { notifications } = useChatWebSocket();

  const statusFilters = [
    { value: 'all', label: 'All', icon: '💬', count: 0 },
    { value: 'unread', label: 'Unread', icon: '🔴', count: 0 },
    { value: 'active', label: 'Active', icon: '🟢', count: 0 },
    { value: 'archived', label: 'Archived', icon: '📁', count: 0 }
  ];

  const fetchConversations = async (reset = false) => {
    if (!businessId) return;
    
    try {
      setLoading(true);
      const currentPage = reset ? 1 : page;
      
      const response = await conversationService.listConversations(
        statusFilter === 'all' ? null : statusFilter,
        currentPage
      );
      
      const sortedConversations = response.data.sort((a, b) => {
        const dateA = a.last_message_at ? new Date(a.last_message_at) : new Date(0);
        const dateB = b.last_message_at ? new Date(b.last_message_at) : new Date(0);
        return dateB - dateA;
      });
      
      setConversations(prev => 
        reset ? sortedConversations : [...prev, ...sortedConversations]
      );
      setHasMore(response.data.length === 20);
      if (reset) setPage(1);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations(true);
  }, [statusFilter, businessId]);

  useEffect(() => {
    fetchChatbotFlows();
  }, [businessId]);

  useEffect(() => {
    if (conversations.length > 0) {
      checkBulkChatbotStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations]);

  const fetchChatbotFlows = async () => {
    try {
      const flows = await ChatbotService.getFlows();
      setAvailableFlows(Array.isArray(flows) ? flows : []);
    } catch (error) {
      console.error('Error fetching chatbot flows:', error);
    }
  };

  const checkBulkChatbotStatus = async () => {
    try {
      // Check if any conversation has chatbot enabled to determine initial state
      // We'll check a few conversations to see if chatbot is enabled
      if (conversations.length > 0) {
        // Check first few conversations to determine bulk status
        const conversationsToCheck = conversations.slice(0, Math.min(5, conversations.length));
        let foundEnabled = false;
        let foundFlow = null;
        
        for (const conv of conversationsToCheck) {
          try {
            const response = await ChatbotService.getConversationStatus(conv.id);
            if (response && response.data && response.data.enabled && response.data.flowId) {
              foundEnabled = true;
              foundFlow = response.data.flow;
              break;
            }
          } catch (err) {
            // Continue checking other conversations
            console.log('Error checking conversation status:', err);
            continue;
          }
        }
        
        if (foundEnabled && foundFlow) {
          setChatbotEnabled(true);
          setSelectedFlow(foundFlow);
        } else {
          setChatbotEnabled(false);
          setSelectedFlow(null);
        }
      } else {
        setChatbotEnabled(false);
        setSelectedFlow(null);
      }
    } catch (error) {
      console.error('Error checking chatbot status:', error);
      setChatbotEnabled(false);
      setSelectedFlow(null);
    }
  };

  // Refresh when active conversation changes (route change), ensures unread cleared after leaving
  useEffect(() => {
    fetchConversations(true);
  }, [activeConversationId]);

  // Listen for read events from detail view to zero unread immediately without full refetch
  useEffect(() => {
    const handleConversationRead = (e) => {
      const readId = e?.detail?.conversationId?.toString();
      if (!readId) return;
      setConversations(prev => prev.map(c => (
        c.id?.toString() === readId ? { ...c, unread_count: 0 } : c
      )));
    };
    window.addEventListener('conversationRead', handleConversationRead);
    return () => window.removeEventListener('conversationRead', handleConversationRead);
  }, []);

  useEffect(() => {
    const newMessageNotifications = notifications.filter(
      n => n.type === 'new_message' || n.type === 'new_conversation'
    );
    if (newMessageNotifications.length > 0) {
      fetchConversations(true);
    }
  }, [notifications]);

  const loadMore = () => {
    setPage(prev => prev + 1);
  };

  useEffect(() => {
    if (page > 1) {
      fetchConversations();
    }
  }, [page]);

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (isYesterday) {
      return 'Yesterday';
    } else {
      const daysDiff = Math.floor((now - date) / (1000 * 60 * 60 * 24));
      if (daysDiff < 7) {
        return date.toLocaleDateString([], { weekday: 'short' });
      } else {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      }
    }
  };

  const getContactName = (conversation) => {
    if (conversation.contact_name && conversation.contact_name.trim() !== '') {
      return conversation.contact_name.trim();
    }
    return conversation.client_name || `+${conversation.phone_number}`;
  };

  const truncateMessage = (message, maxLength = 30) => {
    if (!message) return 'No messages yet';
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  };

  const filteredConversations = conversations.filter(conv => {
    const query = searchQuery.toLowerCase();
    const contactName = getContactName(conv).toLowerCase();
    const phoneNumber = conv.phone_number.toString();
    
    return contactName.includes(query) || phoneNumber.includes(query);
  });

  const getDisplayUnreadCount = (conversation) => {
    if (activeConversationId === conversation.id.toString()) {
      return 0;
    }
    return conversation.unread_count || 0;
  };

  const clearSearch = () => {
    setSearchQuery('');
    setIsSearchFocused(false);
  };

  const handleToggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedConversations(new Set());
  };

  const handleSelectConversation = (conversationId) => {
    setSelectedConversations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(conversationId)) {
        newSet.delete(conversationId);
      } else {
        newSet.add(conversationId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedConversations.size === filteredConversations.length) {
      setSelectedConversations(new Set());
    } else {
      setSelectedConversations(new Set(filteredConversations.map(c => c.id)));
    }
  };

  const handleBulkDelete = () => {
    if (selectedConversations.size === 0) return;
    setShowDeleteModal(true);
  };

  const confirmBulkDelete = async () => {
    try {
      setIsDeleting(true);
      const ids = Array.from(selectedConversations);
      await conversationService.deleteConversations(ids);
      setShowDeleteModal(false);
      setIsSelectionMode(false);
      setSelectedConversations(new Set());
      // Reload the page
      window.location.reload();
    } catch (error) {
      console.error('Error deleting conversations:', error);
      alert('Failed to delete conversations. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const words = name.split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleBulkChatbotToggle = async () => {
    if (chatbotEnabled) {
      // Disable bot for all conversations
      try {
        setIsTogglingChatbot(true);
        await ChatbotService.toggleChatbotForAll(false, null);
        toast.success('Chatbot disabled for all conversations');
        fetchConversations(true); // Refresh conversations
        // Wait for DB update and then verify status
        setTimeout(async () => {
          await checkBulkChatbotStatus();
        }, 1000);
      } catch (error) {
        console.error('Error disabling chatbot:', error);
        toast.error('Failed to disable chatbot for all conversations');
      } finally {
        setIsTogglingChatbot(false);
      }
    } else {
      // Show modal to select flow
      setShowChatbotModal(true);
    }
  };

  const handleEnableBulkChatbot = async () => {
    if (!selectedFlow) {
      toast.error('Please select a chatbot flow');
      return;
    }

    try {
      setIsTogglingChatbot(true);
      await ChatbotService.toggleChatbotForAll(true, selectedFlow.id);
      setShowChatbotModal(false);
      toast.success('Chatbot enabled for all conversations');
      fetchConversations(true); // Refresh conversations
      // Wait for DB update and then verify status
      setTimeout(async () => {
        await checkBulkChatbotStatus();
      }, 1000);
    } catch (error) {
      console.error('Error enabling chatbot:', error);
      toast.error('Failed to enable chatbot for all conversations');
    } finally {
      setIsTogglingChatbot(false);
    }
  };

  return (
    <div className="whatsapp-conversation-list">
      {/* Header */}
      <div className="wa-header">
        <div className="wa-header-content">
          {isSelectionMode ? (
            <>
              <div className="wa-profile-section">
                <button 
                  className="wa-action-btn wa-select-all-btn"
                  onClick={handleSelectAll}
                  title={selectedConversations.size === filteredConversations.length ? 'Deselect all' : 'Select all'}
                >
                  {selectedConversations.size === filteredConversations.length ? (
                    <CheckSquare size={20} />
                  ) : (
                    <Square size={20} />
                  )}
                </button>
                <div className="wa-profile-info">
                  <h3>{selectedConversations.size} selected</h3>
                </div>
              </div>
              <div className="wa-header-actions">
                {selectedConversations.size > 0 && (
                  <button 
                    className="wa-action-btn wa-delete-btn" 
                    onClick={handleBulkDelete}
                    title="Delete selected"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
                <button 
                  className="wa-action-btn" 
                  onClick={handleToggleSelectionMode}
                  title="Cancel"
                >
                  <X size={20} />
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="wa-profile-section">
                <div className="wa-profile-avatar">
                  <User size={20} />
                </div>
                <div className="wa-profile-info">
                  <h3>Chats</h3>
                </div>
              </div>
              <div className="wa-header-actions">
                <button 
                  className="wa-action-btn" 
                  onClick={handleToggleSelectionMode}
                  title="Select conversations"
                >
                  <CheckSquare size={20} />
                </button>
                <button className="wa-action-btn" title="Archive">
                  <Archive size={20} />
                </button>
                <button 
                  className={`wa-action-btn ${chatbotEnabled ? 'chatbot-active' : ''}`}
                  onClick={handleBulkChatbotToggle}
                  disabled={isTogglingChatbot}
                  title={chatbotEnabled ? 'Disable Chatbot for All' : 'Enable Chatbot for All'}
                >
                  <Bot size={20} />
                  {chatbotEnabled && <span className="chatbot-indicator"></span>}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="wa-search-container">
        <div className={`wa-search-wrapper ${isSearchFocused ? 'focused' : ''}`}>
          <div className="wa-search-input-container">
            <Search size={16} className="wa-search-icon" />
            <input
              type="text"
              placeholder="Search or start new chat"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              className="wa-search-input"
            />
            {searchQuery && (
              <button 
                className="wa-search-clear" 
                onClick={clearSearch}
                type="button"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="wa-filters">
        {statusFilters.map(filter => (
          <button
            key={filter.value}
            className={`wa-filter-btn ${statusFilter === filter.value ? 'active' : ''}`}
            onClick={() => setStatusFilter(filter.value)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Conversations List */}
      <div className="wa-conversations">
        <div className="wa-conversations-scroll">
          {loading && conversations.length === 0 ? (
            <div className="wa-loading">
              <div className="wa-spinner"></div>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="wa-empty-state">
              <MessageCircle size={64} className="wa-empty-icon" />
              <p>No conversations found</p>
              <span>Start messaging to see your chats here</span>
            </div>
          ) : (
            <>
              {filteredConversations.map(conv => {
                const displayUnreadCount = getDisplayUnreadCount(conv);
                const isActive = activeConversationId === conv.id.toString();
                const isSelected = selectedConversations.has(conv.id);
                
                const conversationContent = (
                  <>
                    {isSelectionMode && (
                      <div className="wa-selection-checkbox">
                        {isSelected ? (
                          <CheckSquare size={20} className="wa-checkbox-checked" />
                        ) : (
                          <Square size={20} className="wa-checkbox-unchecked" />
                        )}
                      </div>
                    )}
                    <div className="wa-avatar">
                      {conv.contact_avatar ? (
                        <img 
                          src={conv.contact_avatar} 
                          alt={getContactName(conv)}
                          className="wa-avatar-img"
                        />
                      ) : (
                        <div className="wa-avatar-placeholder">
                          {getInitials(getContactName(conv))}
                        </div>
                      )}
                    </div>
                    
                    <div className="wa-conversation-content">
                      <div className="wa-conversation-header">
                        <h4 className="wa-contact-name">
                          {getContactName(conv)}
                        </h4>
                        {!isSelectionMode && (
                          <span className="wa-time">
                            {formatTime(conv.last_message_at)}
                          </span>
                        )}
                      </div>
                      
                      {!isSelectionMode && (
                        <div className="wa-conversation-preview">
                          <p className="wa-last-message">
                            {truncateMessage(conv.last_message_content)}
                          </p>
                          {displayUnreadCount > 0 && (
                            <div className="wa-unread-count">
                              {displayUnreadCount > 99 ? '99+' : displayUnreadCount}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                );

                if (isSelectionMode) {
                  return (
                    <div
                      key={conv.id}
                      onClick={() => handleSelectConversation(conv.id)}
                      className={`wa-conversation-item ${isSelected ? 'selected' : ''}`}
                    >
                      {conversationContent}
                    </div>
                  );
                }

                return (
                  <Link
                    key={conv.id}
                    to={`/conversations/${conv.id}`}
                    className={`wa-conversation-item ${isActive ? 'active' : ''} ${displayUnreadCount > 0 ? 'unread' : ''}`}
                  >
                    {conversationContent}
                  </Link>
                );
              })}
              
              {hasMore && (
                <div className="wa-load-more">
                  <button 
                    className="wa-load-more-btn"
                    onClick={loadMore}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <div className="wa-spinner wa-spinner-small"></div>
                        Loading...
                      </>
                    ) : (
                      'Load more chats'
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Bulk Delete Confirmation Modal */}
      <ConversationDeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmBulkDelete}
        conversation={{ contact_name: `${selectedConversations.size} conversations` }}
        isLoading={isDeleting}
        isBulk={true}
        count={selectedConversations.size}
      />

      {/* Bulk Chatbot Toggle Modal */}
      {showChatbotModal && createPortal(
        <div className="bot-modal-overlay" onClick={() => setShowChatbotModal(false)}>
          <div className="bot-modal" onClick={(e) => e.stopPropagation()}>
            <div className="bot-modal-header">
              <h3>Enable Chatbot for All Conversations</h3>
              <button onClick={() => setShowChatbotModal(false)} className="close-btn">
                <X size={20} />
              </button>
            </div>

            <div className="bot-modal-body">
              <p className="bot-modal-description">
                Select a chatbot flow to automate responses for all conversations. This will apply to all existing and future conversations.
              </p>

              <div className="flow-selection">
                <label>Select Flow</label>
                {availableFlows.length === 0 ? (
                  <div className="no-flows">
                    <p>No chatbot flows available.</p>
                    <a href="/chatbot" target="_blank" rel="noopener noreferrer">
                      Create a flow
                    </a>
                  </div>
                ) : (
                  <div className="flow-list">
                    {availableFlows.map((flow) => (
                      <div
                        key={flow.id}
                        className={`flow-item ${selectedFlow?.id === flow.id ? 'selected' : ''}`}
                        onClick={() => setSelectedFlow(flow)}
                      >
                        <div className="flow-item-content">
                          <div className="flow-name">{flow.name}</div>
                          <div className="flow-description">
                            {flow.description || 'No description'}
                          </div>
                        </div>
                        {selectedFlow?.id === flow.id && (
                          <Check size={20} className="check-icon" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bot-modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setShowChatbotModal(false)}
                disabled={isTogglingChatbot}
              >
                Cancel
              </button>
              <button
                className="btn-enable"
                onClick={handleEnableBulkChatbot}
                disabled={!selectedFlow || isTogglingChatbot}
              >
                {isTogglingChatbot ? 'Enabling...' : 'Enable for All'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ConversationList;
