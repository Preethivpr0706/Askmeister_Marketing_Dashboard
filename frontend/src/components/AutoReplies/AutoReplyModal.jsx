import { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import './AutoReplyModal.css';

function AutoReplyModal({ reply, onClose, onSave }) {
  const [formData, setFormData] = useState({
    keyword: '',
    response_message: '',
    is_active: true,
    priority: 0
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (reply) {
      setFormData({
        keyword: reply.keyword || '',
        response_message: reply.response_message || '',
        is_active: reply.is_active !== undefined ? reply.is_active : true,
        priority: reply.priority || 0
      });
    }
  }, [reply]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    if (formError) {
      setFormError('');
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.keyword.trim()) {
      newErrors.keyword = 'Keyword is required';
    } else if (formData.keyword.length < 2) {
      newErrors.keyword = 'Keyword must be at least 2 characters';
    }
    
    if (!formData.response_message.trim()) {
      newErrors.response_message = 'Response message is required';
    } else if (formData.response_message.length < 5) {
      newErrors.response_message = 'Response message must be at least 5 characters';
    }
    
    if (formData.priority < 0 || formData.priority > 100) {
      newErrors.priority = 'Priority must be between 0 and 100';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setSaving(true);
      await onSave(formData);
    } catch (error) {
      console.error('Error saving auto-reply:', error);
      const message = error?.message || 'Failed to save auto-reply';
      setFormError(message);
      // If backend reports duplicate keyword(s), mark keyword field
      if (message.toLowerCase().includes('keyword')) {
        setErrors(prev => ({
          ...prev,
          keyword: message
        }));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content auto-reply-modal">
        <div className="modal-header">
          <h3>{reply ? 'Edit Auto-Reply' : 'Create Auto-Reply'}</h3>
          <button className="btn-icon close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auto-reply-form">
          {formError && (
            <div className="error-message" style={{ marginBottom: '12px' }}>
              <AlertCircle size={14} />
              <span>{formError}</span>
            </div>
          )}
          <div className="form-group">
            <label htmlFor="keyword">
              Keyword <span className="required">*</span>
            </label>
            <input
              type="text"
              id="keyword"
              name="keyword"
              value={formData.keyword}
              onChange={handleChange}
              placeholder="e.g., contact, help, pricing"
              className={errors.keyword ? 'error' : ''}
            />
            {errors.keyword && (
              <div className="error-message">
                <AlertCircle size={14} />
                <span>{errors.keyword}</span>
              </div>
            )}
            <div className="field-help">
              Single or multiple keywords supported (comma-separated). Keywords are case-insensitive and match anywhere in the message.
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="response_message">
              Response Message <span className="required">*</span>
            </label>
            <textarea
              id="response_message"
              name="response_message"
              value={formData.response_message}
              onChange={handleChange}
              placeholder="Enter the automatic response message..."
              rows={4}
              className={errors.response_message ? 'error' : ''}
            />
            {errors.response_message && (
              <div className="error-message">
                <AlertCircle size={14} />
                <span>{errors.response_message}</span>
              </div>
            )}
            <div className="field-help">
              This message will be sent automatically when the keyword is detected.
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="priority">
                Priority
              </label>
              <input
                type="number"
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                min="0"
                max="100"
                className={errors.priority ? 'error' : ''}
              />
              {errors.priority && (
                <div className="error-message">
                  <AlertCircle size={14} />
                  <span>{errors.priority}</span>
                </div>
              )}
              <div className="field-help">
                Higher priority replies are checked first (0-100).
              </div>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                />
                <span className="checkbox-text">Active</span>
              </label>
              <div className="field-help">
                Only active auto-replies will be triggered.
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? 'Saving...' : (reply ? 'Update' : 'Create')}
              <Save size={16} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AutoReplyModal;
