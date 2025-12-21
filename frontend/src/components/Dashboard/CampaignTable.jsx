import React from 'react';
import { MessageCircle, Users, Calendar, CheckCircle, Clock, AlertTriangle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './CampaignTable.css';

const CampaignTable = ({ campaigns = [] }) => {
  const navigate = useNavigate();

  const getStatusConfig = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return {
          class: 'status-completed',
          icon: <CheckCircle size={14} />,
          text: 'Completed',
          color: '#10b981',
          bgColor: 'rgba(16, 185, 129, 0.1)'
        };
      case 'scheduled':
        return {
          class: 'status-scheduled',
          icon: <Clock size={14} />,
          text: 'Scheduled',
          color: '#3b82f6',
          bgColor: 'rgba(59, 130, 246, 0.1)'
        };
      case 'sending':
        return {
          class: 'status-sending',
          icon: <MessageCircle size={14} />,
          text: 'Sending',
          color: '#f59e0b',
          bgColor: 'rgba(245, 158, 11, 0.1)'
        };
      case 'failed':
        return {
          class: 'status-failed',
          icon: <AlertTriangle size={14} />,
          text: 'Failed',
          color: '#ef4444',
          bgColor: 'rgba(239, 68, 68, 0.1)'
        };
      default:
        return {
          class: 'status-default',
          icon: <Clock size={14} />,
          text: status || 'Pending',
          color: '#6b7280',
          bgColor: 'rgba(107, 114, 128, 0.1)'
        };
    }
  };

  const totalRecipients = campaigns.reduce((acc, campaign) => acc + (parseInt(campaign.recipients) || 0), 0);

  return (
    <div className="recent-campaigns-modern">

      {/* Desktop Table View */}
      <div className="campaigns-table-container">
        <table className="campaigns-table-desktop">
          <thead>
            <tr>
              <th>Campaign</th>
              <th>Template</th>
              <th>Recipients</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.length === 0 ? (
              <tr>
                <td colSpan="5">
                  <div className="campaigns-empty-state">
                    <div className="empty-icon-wrapper">
                      <MessageCircle size={40} />
                    </div>
                    <h4>No campaigns yet</h4>
                    <p>Create your first campaign to get started</p>
                    <button 
                      className="empty-state-btn"
                      onClick={() => navigate('/send-message')}
                    >
                      Create Campaign
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              campaigns.map((campaign, index) => {
                const statusConfig = getStatusConfig(campaign.status);
                return (
                  <tr key={campaign.id || index} className="campaign-row-modern">
                    <td>
                      <div className="campaign-name-wrapper">
                        <div className="campaign-icon-modern">
                          <MessageCircle size={16} />
                        </div>
                        <span className="campaign-name-modern">{campaign.name || 'Unnamed Campaign'}</span>
                      </div>
                    </td>
                    <td>
                      <div className="template-wrapper-modern">
                        <span className="template-name-modern">{campaign.template || 'N/A'}</span>
                      </div>
                    </td>
                    <td>
                      <div className="recipients-wrapper-modern">
                        <Users size={14} />
                        <span>{campaign.recipients?.toLocaleString() || '0'}</span>
                      </div>
                    </td>
                    <td>
                      <div 
                        className={`status-badge-modern ${statusConfig.class}`}
                        style={{ 
                          color: statusConfig.color,
                          backgroundColor: statusConfig.bgColor
                        }}
                      >
                        {statusConfig.icon}
                        <span>{statusConfig.text}</span>
                      </div>
                    </td>
                    <td>
                      <div className="date-wrapper-modern">
                        <Calendar size={14} />
                        <span>{campaign.date || 'N/A'}</span>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="campaigns-cards-container">
        {campaigns.length === 0 ? (
          <div className="campaigns-empty-state-mobile">
            <div className="empty-icon-wrapper">
              <MessageCircle size={48} />
            </div>
            <h4>No campaigns yet</h4>
            <p>Create your first campaign to get started</p>
            <button 
              className="empty-state-btn"
              onClick={() => navigate('/send-message')}
            >
              Create Campaign
            </button>
          </div>
        ) : (
          campaigns.map((campaign, index) => {
            const statusConfig = getStatusConfig(campaign.status);
            return (
              <div key={campaign.id || index} className="campaign-card-modern">
                <div className="campaign-card-header">
                  <div className="campaign-card-icon">
                    <MessageCircle size={18} />
                  </div>
                  <div className="campaign-card-title-section">
                    <h4 className="campaign-card-name">{campaign.name || 'Unnamed Campaign'}</h4>
                    <div 
                      className={`campaign-card-status ${statusConfig.class}`}
                      style={{ 
                        color: statusConfig.color,
                        backgroundColor: statusConfig.bgColor
                      }}
                    >
                      {statusConfig.icon}
                      <span>{statusConfig.text}</span>
                    </div>
                  </div>
                </div>
                
                <div className="campaign-card-body">
                  <div className="campaign-card-info-row">
                    <div className="campaign-card-info-item">
                      <span className="info-label">Template</span>
                      <span className="info-value">{campaign.template || 'N/A'}</span>
                    </div>
                    <div className="campaign-card-info-item">
                      <span className="info-label">Recipients</span>
                      <div className="info-value-with-icon">
                        <Users size={14} />
                        <span>{campaign.recipients?.toLocaleString() || '0'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="campaign-card-date-row">
                    <Calendar size={14} />
                    <span>{campaign.date || 'N/A'}</span>
                  </div>
                </div>

                <div className="campaign-card-footer">
                  <button 
                    className="campaign-card-action"
                    onClick={() => navigate(`/campaigns/${campaign.id}`)}
                  >
                    View Details
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CampaignTable;