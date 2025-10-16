import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import ChatbotService from '../../api/chatbotService';
import './ChatbotFlows.css';

const ChatbotFlows = () => {
  const [flows, setFlows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFlow, setNewFlow] = useState({ name: '', description: '' });

  useEffect(() => {
    fetchFlows();
  }, []);

  const fetchFlows = async () => {
    try {
      setLoading(true);
      const data = await ChatbotService.getFlows();
      const flowsArray = Array.isArray(data) ? data : [];
      setFlows(flowsArray);
      console.log('Flows:', flowsArray.map(f => ({ id: f.id, name: f.name })));
    } catch (error) {
      console.error('Error fetching flows:', error);
      toast.error('Failed to load chatbot flows');
    } finally {
      setLoading(false);
    }
  };

  const createFlow = async () => {
    try {
      if (!newFlow.name.trim()) {
        toast.error('Flow name is required');
        return;
      }

      const data = await ChatbotService.createFlow(newFlow);
      setFlows([...flows, data]);
      setShowCreateModal(false);
      setNewFlow({ name: '', description: '' });
      toast.success('Chatbot flow created successfully');
    } catch (error) {
      console.error('Error creating flow:', error);
      toast.error('Failed to create chatbot flow');
    }
  };

  const deleteFlow = async (id) => {
    if (!window.confirm('Are you sure you want to delete this flow?')) return;

    try {
      await ChatbotService.deleteFlow(id);
      setFlows(flows.filter(flow => flow.id !== id));
      toast.success('Chatbot flow deleted successfully');
    } catch (error) {
      console.error('Error deleting flow:', error);
      toast.error('Failed to delete chatbot flow');
    }
  };

  if (loading) {
    return <div className="chatbot-flows loading">Loading chatbot flows...</div>;
  }

  return (
    <div className="chatbot-flows">
      <div className="flows-header">
        <div>
          <h2>Chatbot Flows</h2>
          <p className="flows-subtitle">Create and manage your chatbot conversation flows</p>
        </div>
        <button onClick={() => setShowCreateModal(true)}>Create New Flow</button>
      </div>

      {flows.length === 0 ? (
        <div className="no-flows">
          <p>No chatbot flows yet. Create your first flow to get started with building chatbot conversations</p>
        </div>
      ) : (
        <div className="flows-list">
          {flows.map(flow => (
            <div key={flow.id} className="flow-card">
              <h3>{flow.name}</h3>
              <p>{flow.description || 'No description provided'}</p>
              <div className="flow-card-actions">
                <Link to={`/chatbot/builder2/${flow.id}`}>
                  <button>Edit Flow</button>
                </Link>
                <button onClick={() => deleteFlow(flow.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <div className="create-flow-modal" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Create New Chatbot Flow</h2>
            
            <div className="form-group">
              <label>Flow Name *</label>
              <input
                type="text"
                value={newFlow.name}
                onChange={(e) => setNewFlow({ ...newFlow, name: e.target.value })}
                placeholder="e.g., Customer Support Flow"
              />
            </div>
            
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={newFlow.description}
                onChange={(e) => setNewFlow({ ...newFlow, description: e.target.value })}
                placeholder="Describe what this flow is for..."
                rows={4}
              />
            </div>
            
            <div className="modal-actions">
              <button onClick={() => setShowCreateModal(false)}>
                Cancel
              </button>
              <button onClick={createFlow}>
                Create Flow
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatbotFlows;