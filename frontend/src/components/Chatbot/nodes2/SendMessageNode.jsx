import React from 'react';
import { Handle, Position } from 'reactflow';
import { MessageSquare, Image, Video, FileText, Square, List, X } from 'lucide-react';
import './NodeStyles.css';

const SendMessageNode = ({ data, isConnectable, id }) => {
  const getIcon = () => {
    switch (data.messageType) {
      case 'image': return <Image size={16} />;
      case 'video': return <Video size={16} />;
      case 'document': return <FileText size={16} />;
      case 'buttons': return <Square size={16} />;
      case 'list': return <List size={16} />;
      default: return <MessageSquare size={16} />;
    }
  };

  const getTypeLabel = () => {
    return data.messageType ? data.messageType.charAt(0).toUpperCase() + data.messageType.slice(1) : 'Text';
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    // Emit delete event to parent
    if (data.onDelete) {
      data.onDelete(id);
    }
  };

  return (
    <div className="custom-node send-message-node">
      <button className="node-delete-btn" onClick={handleDelete} title="Delete node">
        <X size={12} />
      </button>
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className="custom-handle"
      />
      <div className="node-header">
        <div className="node-icon">
          {getIcon()}
        </div>
        <div className="node-title">Send {getTypeLabel()}</div>
      </div>
      <div className="node-body">
        <p className="node-content-preview">
          {data.content || 'Configure message...'}
        </p>
        {data.buttons && data.buttons.length > 0 && (
          <div className="node-meta">
            {data.buttons.length} button{data.buttons.length > 1 ? 's' : ''}
          </div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        className="custom-handle"
      />
    </div>
  );
};

export default SendMessageNode;
