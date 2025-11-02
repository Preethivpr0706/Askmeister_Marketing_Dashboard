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

  // Get case values from metadata
  const cases = data.cases || [];
  const conditionType = data.conditionType || 'equals';
  const hasMultipleCases = cases.length > 0;
  
  // Legacy support: if no cases defined, show true/false branches
  const isLegacyMode = !hasMultipleCases;

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
        <div className="node-title">
          {hasMultipleCases ? 'Switch' : 'Condition'}
        </div>
      </div>
      <div className="node-body">
        {isLegacyMode ? (
          <>
            <p className="node-description">
              {conditionType}: {data.compareValue || 'not set'}
            </p>
            <div className="condition-branches">
              <div className="branch-label true-branch">
                {data.trueLabel || 'True'}
              </div>
              <div className="branch-label false-branch">
                {data.falseLabel || 'False'}
              </div>
            </div>
          </>
        ) : (
          <>
            <p className="node-description">
              Match user input to cases
            </p>
            <div className="condition-cases-list">
              {cases.map((caseItem, index) => (
                <div key={index} className="case-item">
                  <span className="case-value">{caseItem.value || `Case ${index + 1}`}</span>
                  {caseItem.label && <span className="case-label">: {caseItem.label}</span>}
                </div>
              ))}
              {data.defaultCase && (
                <div className="case-item default-case">
                  <span className="case-value">Default</span>
                  {data.defaultCaseLabel && <span className="case-label">: {data.defaultCaseLabel}</span>}
                </div>
              )}
            </div>
          </>
        )}
      </div>
      
      {/* Render handles based on mode */}
      {isLegacyMode ? (
        <>
          <Handle
            type="source"
            position={Position.Bottom}
            id="true"
            isConnectable={isConnectable}
            className="custom-handle true-handle"
            style={{ left: '25%', transform: 'translateX(-50%)' }}
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="false"
            isConnectable={isConnectable}
            className="custom-handle false-handle"
            style={{ left: '75%', transform: 'translateX(-50%)' }}
          />
        </>
      ) : (
        <>
          {/* Dynamic handles for each case */}
          {cases.map((caseItem, index) => {
            const totalCases = cases.length + (data.defaultCase ? 1 : 0);
            const positionPercent = ((index + 1) / (totalCases + 1)) * 100;
            // Use index-based stable ID, but store case value for edge condition matching
            const handleId = `case-${index}`;
            return (
              <Handle
                key={handleId}
                type="source"
                position={Position.Bottom}
                id={handleId}
                isConnectable={isConnectable}
                className="custom-handle case-handle"
                style={{ left: `${positionPercent}%` }}
                data-case-value={caseItem.value}
                data-case-index={index}
              />
            );
          })}
          {/* Default case handle */}
          {data.defaultCase && (
            <Handle
              type="source"
              position={Position.Bottom}
              id="default"
              isConnectable={isConnectable}
              className="custom-handle default-handle"
              style={{ left: `${((cases.length + 1) / (cases.length + 2)) * 100}%` }}
            />
          )}
        </>
      )}
    </div>
  );
};

export default ConditionNode;
