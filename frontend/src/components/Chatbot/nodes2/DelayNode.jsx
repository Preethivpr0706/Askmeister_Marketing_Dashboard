import React from 'react';
import { Handle, Position } from 'reactflow';
import { Clock, X } from 'lucide-react';
import './NodeStyles.css';

const DelayNode = ({ data, isConnectable, id }) => {
  const handleDelete = (e) => {
    e.stopPropagation();
    // Emit delete event to parent
    if (data.onDelete) {
      data.onDelete(id);
    }
  };

  return (
    <div className="custom-node delay-node">
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
        <div className="node-title">Delay</div>
      </div>
      <div className="node-body">
        <p className="node-description">
          Wait {data.duration || 5} seconds
        </p>
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

export default DelayNode;
