import React from 'react';
import { Handle, Position } from 'reactflow';
import { Zap, X } from 'lucide-react';
import './NodeStyles.css';

const TriggerNode = ({ data, isConnectable, id }) => {
  const handleDelete = (e) => {
    e.stopPropagation();
    // Emit delete event to parent
    if (data.onDelete) {
      data.onDelete(id);
    }
  };

  return (
    <div className="custom-node trigger-node">
      <button className="node-delete-btn" onClick={handleDelete} title="Delete node">
        <X size={12} />
      </button>
      <div className="node-header">
        <div className="node-icon">
          <Zap size={16} />
        </div>
        <div className="node-title">Start</div>
      </div>
      <div className="node-body">
        <p className="node-description">Flow entry point</p>
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

export default TriggerNode;
