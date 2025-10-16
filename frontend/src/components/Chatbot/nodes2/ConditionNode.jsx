import React from 'react';
import { Handle, Position } from 'reactflow';
import { GitBranch, X } from 'lucide-react';
import './NodeStyles.css';

const ConditionNode = ({ data, isConnectable, id }) => {
  const handleDelete = (e) => {
    e.stopPropagation();
    // Emit delete event to parent
    if (data.onDelete) {
      data.onDelete(id);
    }
  };

  return (
    <div className="custom-node condition-node">
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
          <GitBranch size={16} />
        </div>
        <div className="node-title">Condition</div>
      </div>
      <div className="node-body">
        <p className="node-description">
          {data.conditionType || 'equals'}: {data.compareValue || 'not set'}
        </p>
        <div className="condition-branches">
          <div className="branch-label true-branch">
            {data.trueLabel || 'True'}
          </div>
          <div className="branch-label false-branch">
            {data.falseLabel || 'False'}
          </div>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        isConnectable={isConnectable}
        className="custom-handle true-handle"
        style={{ left: '30%' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        isConnectable={isConnectable}
        className="custom-handle false-handle"
        style={{ left: '70%' }}
      />
    </div>
  );
};

export default ConditionNode;
