import React, { useState, useEffect } from 'react';
import { Bot, X, Check } from 'lucide-react';
import ChatbotService from '../../api/chatbotService';
import { toast } from 'react-toastify';
import './BotToggle.css';

const BotToggle = ({ conversationId, onToggle }) => {
  const [showModal, setShowModal] = useState(false);
  const [availableFlows, setAvailableFlows] = useState([]);
  const [selectedFlow, setSelectedFlow] = useState(null);
  const [chatbotEnabled, setChatbotEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchChatbotFlows();
    checkChatbotStatus();
  }, [conversationId]);

  const fetchChatbotFlows = async () => {
    try {
      const flows = await ChatbotService.getFlows();
      console.log(flows);
      setAvailableFlows(Array.isArray(flows) ? flows : []);
    } catch (error) {
      console.error('Error fetching chatbot flows:', error);
      toast.error('Failed to load chatbot flows');
    }
  };

  const checkChatbotStatus = async () => {
    try {
      const response = await ChatbotService.getConversationStatus(conversationId);
      if (response.data.enabled && response.data.flowId) {
        setChatbotEnabled(true);
        const flow = response.data.flow;
        setSelectedFlow(flow);
      }
    } catch (error) {
      console.error('Error checking chatbot status:', error);
    }
  };

  const handleToggle = async () => {
    if (chatbotEnabled) {
      // Disable bot
      try {
        setIsLoading(true);
        await ChatbotService.toggleChatbot(conversationId, false, null);
        setChatbotEnabled(false);
        setSelectedFlow(null);
        toast.success('Chatbot disabled for this conversation');
        if (onToggle) onToggle(false, null);
      } catch (error) {
        console.error('Error disabling chatbot:', error);
        toast.error('Failed to disable chatbot');
      } finally {
        setIsLoading(false);
      }
    } else {
      // Show modal to select flow
      setShowModal(true);
    }
  };

  const handleEnableBot = async () => {
    if (!selectedFlow) {
      toast.error('Please select a chatbot flow');
      return;
    }

    try {
      setIsLoading(true);
      await ChatbotService.toggleChatbot(conversationId, true, selectedFlow.id);
      setChatbotEnabled(true);
      setShowModal(false);
      toast.success('Chatbot enabled for this conversation');
      if (onToggle) onToggle(true, selectedFlow.id);
    } catch (error) {
      console.error('Error enabling chatbot:', error);
      toast.error('Failed to enable chatbot');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        className={`bot-toggle-btn ${chatbotEnabled ? 'active' : ''}`}
        onClick={handleToggle}
        disabled={isLoading}
        title={chatbotEnabled ? 'Disable Bot' : 'Enable Bot'}
      >
        <Bot size={20} />
        {chatbotEnabled && <span className="bot-active-indicator"></span>}
      </button>

      {showModal && (
        <div className="bot-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="bot-modal" onClick={(e) => e.stopPropagation()}>
            <div className="bot-modal-header">
              <h3>Enable Chatbot</h3>
              <button onClick={() => setShowModal(false)} className="close-btn">
                <X size={20} />
              </button>
            </div>

            <div className="bot-modal-body">
              <p className="bot-modal-description">
                Select a chatbot flow to automate responses for this conversation.
              </p>

              <div className="flow-selection">
                <label>Select Flow</label>
                {availableFlows.length === 0 ? (
                  <div className="no-flows">
                    <p>No chatbot flows available.</p>
                    <a href="/chatbot/flows" target="_blank" rel="noopener noreferrer">
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
                onClick={() => setShowModal(false)}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                className="btn-enable"
                onClick={handleEnableBot}
                disabled={!selectedFlow || isLoading}
              >
                {isLoading ? 'Enabling...' : 'Enable Bot'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BotToggle;
