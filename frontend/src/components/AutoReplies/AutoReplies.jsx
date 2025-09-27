import { useState, useEffect } from 'react';
import { 
  Plus, Search, Filter, Edit, Trash, ToggleLeft, ToggleRight, 
  MessageSquare, Bot, Settings, TestTube, AlertCircle, CheckCircle
} from 'lucide-react';
import AutoReplyService from '../../api/autoReplyService';
import AutoReplyModal from './AutoReplyModal';
import './AutoReplies.css';

function AutoReplies() {
  const [autoReplies, setAutoReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingReply, setEditingReply] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const [stats, setStats] = useState(null);
  const [testMessage, setTestMessage] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  // Fetch auto-replies
  const fetchAutoReplies = async (page = 1) => {
    try {
      setLoading(true);
      const response = await AutoReplyService.getAutoReplies({
        page,
        limit: pagination.limit,
        search: searchQuery,
        active_only: activeFilter === 'active'
      });
      
      setAutoReplies(response.data);
      setPagination(response.pagination);
    } catch (err) {
      setError('Failed to fetch auto-replies: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      const response = await AutoReplyService.getAutoReplyStats();
      setStats(response.data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  useEffect(() => {
    fetchAutoReplies();
    fetchStats();
  }, [searchQuery, activeFilter]);

  // Handle search
  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  // Handle filter change
  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
  };

  // Handle create/edit
  const handleCreate = () => {
    setEditingReply(null);
    setShowModal(true);
  };

  const handleEdit = (reply) => {
    setEditingReply(reply);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingReply(null);
  };

  const handleSave = async (replyData) => {
    try {
      if (editingReply) {
        await AutoReplyService.updateAutoReply(editingReply.id, replyData);
      } else {
        await AutoReplyService.createAutoReply(replyData);
      }
      await fetchAutoReplies(pagination.page);
      await fetchStats();
      setShowModal(false);
      setEditingReply(null);
    } catch (err) {
      throw err;
    }
  };

  // Handle delete
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this auto-reply?')) {
      try {
        await AutoReplyService.deleteAutoReply(id);
        await fetchAutoReplies(pagination.page);
        await fetchStats();
      } catch (err) {
        setError('Failed to delete auto-reply: ' + (err.response?.data?.message || err.message));
      }
    }
  };

  // Handle toggle
  const handleToggle = async (id) => {
    try {
      await AutoReplyService.toggleAutoReply(id);
      await fetchAutoReplies(pagination.page);
      await fetchStats();
    } catch (err) {
      setError('Failed to toggle auto-reply: ' + (err.response?.data?.message || err.message));
    }
  };

  // Handle test
  const handleTest = async () => {
    if (!testMessage.trim()) return;
    
    try {
      setTesting(true);
      const response = await AutoReplyService.testAutoReply(testMessage);
      setTestResult(response.data);
    } catch (err) {
      setError('Failed to test auto-reply: ' + (err.response?.data?.message || err.message));
    } finally {
      setTesting(false);
    }
  };

  // Handle pagination
  const handlePageChange = (newPage) => {
    fetchAutoReplies(newPage);
  };

  if (loading && autoReplies.length === 0) {
    return (
      <div className="auto-replies loading-state">
        <div className="spinner"></div>
        <p>Loading auto-replies...</p>
      </div>
    );
  }

  return (
    <div className="auto-replies">
      {/* Header */}
      <div className="auto-replies-header">
        <div className="header-left">
          <h2>Auto-Replies</h2>
          <p>Manage keyword-based automatic responses</p>
        </div>
        <div className="header-right">
          <button className="btn btn-primary" onClick={handleCreate}>
            <Plus size={16} />
            <span>Add Auto-Reply</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              <MessageSquare size={20} />
            </div>
            <div className="stat-info">
              <h4>Total Auto-Replies</h4>
              <span className="stat-value">{stats.total_replies}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon active">
              <CheckCircle size={20} />
            </div>
            <div className="stat-info">
              <h4>Active</h4>
              <span className="stat-value">{stats.active_replies}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon inactive">
              <AlertCircle size={20} />
            </div>
            <div className="stat-info">
              <h4>Inactive</h4>
              <span className="stat-value">{stats.inactive_replies}</span>
            </div>
          </div>
        </div>
      )}

      {/* Test Section */}
      <div className="test-section">
        <h3>Test Auto-Replies</h3>
        <div className="test-input-group">
          <input
            type="text"
            placeholder="Type a message to test auto-replies..."
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            className="test-input"
          />
          <button 
            className="btn btn-secondary" 
            onClick={handleTest}
            disabled={testing || !testMessage.trim()}
          >
            {testing ? 'Testing...' : 'Test'}
            <TestTube size={16} />
          </button>
        </div>
        
        {testResult && (
          <div className={`test-result ${testResult.has_match ? 'match' : 'no-match'}`}>
            {testResult.has_match ? (
              <div className="match-found">
                <CheckCircle size={16} />
                <span>Match found!</span>
                <div className="matched-reply">
                  <strong>Keyword:</strong> {testResult.matching_reply.keyword}
                  <br />
                  <strong>Response:</strong> {testResult.matching_reply.response_message}
                </div>
              </div>
            ) : (
              <div className="no-match">
                <AlertCircle size={16} />
                <span>No auto-reply match found for this message.</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="search-container">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search keywords or responses..."
            value={searchQuery}
            onChange={handleSearch}
            className="search-input"
          />
        </div>
        
        <div className="filter-buttons">
          <button 
            className={`filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => handleFilterChange('all')}
          >
            All
          </button>
          <button 
            className={`filter-btn ${activeFilter === 'active' ? 'active' : ''}`}
            onClick={() => handleFilterChange('active')}
          >
            Active Only
          </button>
        </div>
      </div>

      {/* Auto-Replies List */}
      <div className="auto-replies-list">
        {error && (
          <div className="error-message">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {autoReplies.length === 0 ? (
          <div className="empty-state">
            <Bot size={48} />
            <h3>No Auto-Replies Found</h3>
            <p>Create your first auto-reply to get started with automated responses.</p>
            <button className="btn btn-primary" onClick={handleCreate}>
              <Plus size={16} />
              <span>Add Auto-Reply</span>
            </button>
          </div>
        ) : (
          <div className="replies-grid">
            {autoReplies.map((reply) => (
              <div key={reply.id} className="reply-card">
                <div className="reply-header">
                  <div className="reply-keyword">
                    <strong>"{reply.keyword}"</strong>
                  </div>
                  <div className="reply-actions">
                    <button 
                      className="btn-icon toggle-btn"
                      onClick={() => handleToggle(reply.id)}
                      title={reply.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {reply.is_active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                    </button>
                    <button 
                      className="btn-icon edit-btn"
                      onClick={() => handleEdit(reply)}
                      title="Edit"
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      className="btn-icon delete-btn"
                      onClick={() => handleDelete(reply.id)}
                      title="Delete"
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                </div>
                
                <div className="reply-content">
                  <p>{reply.response_message}</p>
                </div>
                
                <div className="reply-footer">
                  <div className="reply-status">
                    <span className={`status-badge ${reply.is_active ? 'active' : 'inactive'}`}>
                      {reply.is_active ? 'Active' : 'Inactive'}
                    </span>
                    {reply.priority > 0 && (
                      <span className="priority-badge">Priority: {reply.priority}</span>
                    )}
                  </div>
                  <div className="reply-date">
                    Created: {new Date(reply.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="pagination">
          <button 
            className="btn-icon page-btn" 
            disabled={pagination.page === 1}
            onClick={() => handlePageChange(pagination.page - 1)}
          >
            Previous
          </button>
          <span className="page-info">
            Page {pagination.page} of {pagination.pages}
          </span>
          <button 
            className="btn-icon page-btn" 
            disabled={pagination.page === pagination.pages}
            onClick={() => handlePageChange(pagination.page + 1)}
          >
            Next
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <AutoReplyModal
          reply={editingReply}
          onClose={handleModalClose}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

export default AutoReplies;
