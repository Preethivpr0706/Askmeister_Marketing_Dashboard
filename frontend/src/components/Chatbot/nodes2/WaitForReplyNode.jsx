import React from 'react';
import { Handle, Position } from 'reactflow';
import { Clock, X } from 'lucide-react';
import './NodeStyles.css';

const WaitForReplyNode = ({ data, isConnectable, id }) => {
  const handleDelete = (e) => {
    e.stopPropagation();
    // Emit delete event to parent
    if (data.onDelete) {
      data.onDelete(id);
    }
  };

  return (
    <div className="custom-node wait-reply-node">
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
          <Clock size={16} />
        </div>
        <div className="node-title">Wait for Reply</div>
      </div>
      <div className="node-body">
        <p className="node-description">
          {data.replyType && data.replyType !== 'any'
            ? `Expecting ${data.replyType}`
            : 'Waiting for user response'}
        </p>
        {data.timeout && (
          <div className="node-meta">
            Timeout: {data.timeout}s
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

export default WaitForReplyNode;
