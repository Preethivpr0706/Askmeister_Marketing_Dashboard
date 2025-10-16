import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  MarkerType,
  Panel
} from 'reactflow';
import 'reactflow/dist/style.css';
import { toast } from 'react-toastify';
import { 
  ArrowLeft, Save, Play, Plus, Trash2, Copy, Settings,
  MessageSquare, Image as ImageIcon, Video, FileText,
  List, Square, Zap, GitBranch, Clock, X
} from 'lucide-react';
import ChatbotService from '../../api/chatbotService';
import './ChatbotBuilder2.css';

// Enhanced Node Components
import TriggerNode from './nodes2/TriggerNode';
import SendMessageNode from './nodes2/SendMessageNode';
import WaitForReplyNode from './nodes2/WaitForReplyNode';
import ConditionNode from './nodes2/ConditionNode';
import DelayNode from './nodes2/DelayNode';

const nodeTypes = {
  trigger: TriggerNode,
  sendMessage: SendMessageNode,
  waitForReply: WaitForReplyNode,
  condition: ConditionNode,
  delay: DelayNode,
};

const nodeCategories = [
  {
    category: 'Triggers',
    nodes: [
      { type: 'trigger', label: 'Start', icon: Zap, color: '#10b981', description: 'Flow entry point' }
    ]
  },
  {
    category: 'Messages',
    nodes: [
      { type: 'sendMessage', label: 'Send Message', icon: MessageSquare, color: '#3b82f6', description: 'Send text, media, or interactive message' }
    ]
  },
  {
    category: 'User Input',
    nodes: [
      { type: 'waitForReply', label: 'Wait for Reply', icon: Clock, color: '#f59e0b', description: 'Wait for user response' }
    ]
  },
  {
    category: 'Logic',
    nodes: [
      { type: 'condition', label: 'Condition', icon: GitBranch, color: '#8b5cf6', description: 'Branch based on conditions' },
      { type: 'delay', label: 'Delay', icon: Clock, color: '#6b7280', description: 'Add time delay' }
    ]
  }
];

const ChatbotBuilder2 = () => {
  const { flowId } = useParams();
  const navigate = useNavigate();
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [flowData, setFlowData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showNodePanel, setShowNodePanel] = useState(true);
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  const reactFlowWrapper = useRef(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  // Load flow data
  useEffect(() => {
    if (!flowId) {
      toast.error('Invalid flow ID');
      navigate('/chatbot/flows');
      return;
    }
    
    loadFlowData();
  }, [flowId]);

  // Handle window resize for mobile responsiveness
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      
      // Auto-hide panels on mobile when not needed
      if (mobile) {
        setShowNodePanel(false);
        setShowConfigPanel(false);
      } else {
        setShowNodePanel(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadFlowData = async () => {
    try {
      setIsLoading(true);
      const data = await ChatbotService.getCompleteFlow(flowId);
      setFlowData(data);
      
      // Convert backend nodes to React Flow format
      const rfNodes = (data.nodes || []).map(node => ({
        id: node.id,
        type: node.type,
        position: { x: node.position_x || 0, y: node.position_y || 0 },
        data: {
          ...node.metadata,
          content: node.content,
          label: node.content,
          onChange: (updatedData) => handleNodeDataChange(node.id, updatedData),
          onDelete: (nodeId) => handleNodeDelete(nodeId)
        }
      }));
      
      const rfEdges = (data.edges || []).map(edge => ({
        id: edge.id,
        source: edge.source_node_id,
        target: edge.target_node_id,
        label: edge.edge_condition || edge.condition || '',
        type: 'smoothstep',
        animated: true,
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
        data: { condition: edge.edge_condition || edge.condition }
      }));
      
      setNodes(rfNodes);
      setEdges(rfEdges);
    } catch (error) {
      console.error('Error loading flow:', error);
      toast.error('Failed to load chatbot flow');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNodeDataChange = useCallback(async (nodeId, newData, showToast = false) => {
    try {
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return;
      
      await ChatbotService.updateNode(flowId, nodeId, {
        type: node.type,
        content: newData.content || node.data.content,
        positionX: node.position.x,
        positionY: node.position.y,
        metadata: {
          ...node.data,
          ...newData,
          onChange: undefined,
          label: undefined
        }
      });
      
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, ...newData, onChange: n.data.onChange } }
            : n
        )
      );
      
      // Only show toast for significant changes, not for every text input
      if (showToast) {
        toast.success('Node updated');
      }
    } catch (error) {
      console.error('Error updating node:', error);
      toast.error('Failed to update node');
    }
  }, [flowId, nodes, setNodes]);

  const onConnect = useCallback(async (params) => {
    try {
      const sourceNode = nodes.find((n) => n.id === params.source);
      let condition = null;
      
      // Derive condition from source handle if applicable
      if (sourceNode && params.sourceHandle) {
        const data = sourceNode.data || {};
        if (data.buttons && Array.isArray(data.buttons)) {
          const btn = data.buttons.find(b => b.id === params.sourceHandle);
          condition = btn?.text || btn?.value;
        } else if (data.options && Array.isArray(data.options)) {
          const opt = data.options.find(o => o.id === params.sourceHandle);
          condition = opt?.text || opt?.title;
        }
      }

      const response = await ChatbotService.createEdge(flowId, params.source, params.target, condition);
      
      const newEdge = {
        ...params,
        id: response.edgeId,
        label: condition || '',
        type: 'smoothstep',
        animated: true,
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
        data: { condition }
      };
      
      setEdges((eds) => addEdge(newEdge, eds));
      toast.success('Connection created');
    } catch (error) {
      console.error('Error creating edge:', error);
      toast.error('Failed to create connection');
    }
  }, [flowId, nodes, setEdges]);

  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
    setShowConfigPanel(true);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setShowConfigPanel(false);
  }, []);

  const onNodeDragStop = useCallback(async (event, node) => {
    try {
      await ChatbotService.updateNode(flowId, node.id, {
        type: node.type,
        content: node.data.content,
        positionX: node.position.x,
        positionY: node.position.y,
        metadata: {
          ...node.data,
          onChange: undefined,
          label: undefined
        }
      });
    } catch (error) {
      console.error('Error updating node position:', error);
    }
  }, [flowId]);
  const onNodesDelete = useCallback(async (nodesToDelete) => {
    try {
      for (const node of nodesToDelete) {
        await ChatbotService.deleteNode(flowId, node.id);
      }
      // Edges connected to deleted nodes will be automatically removed by ReactFlow
      toast.success('Node(s) deleted');
    } catch (error) {
      console.error('Error deleting nodes:', error);
      toast.error('Failed to delete nodes');
    }
  }, [flowId]);
  const handleNodeDelete = useCallback(async (nodeId) => {
    try {
      await ChatbotService.deleteNode(flowId, nodeId);
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
      toast.success('Node deleted');
    } catch (error) {
      console.error('Error deleting node:', error);
      toast.error('Failed to delete node');
    }
  }, [flowId, setNodes, setEdges]);

  const onEdgesDelete = useCallback(async (edgesToDelete) => {
    try {
      for (const edge of edgesToDelete) {
        await ChatbotService.deleteEdge(flowId, edge.id);
      }
      toast.success('Connection(s) deleted');
    } catch (error) {
      console.error('Error deleting edges:', error);
      toast.error('Failed to delete connections');
    }
  }, [flowId]);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    async (event) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const type = event.dataTransfer.getData('application/reactflow');

      if (typeof type === 'undefined' || !type) {
        return;
      }

      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      try {
        const response = await ChatbotService.createNode(flowId, {
          type,
          content: `New ${type} node`,
          positionX: position.x,
          positionY: position.y,
          metadata: {}
        });

        const newNode = {
          id: response.nodeId,
          type,
          position,
          data: {
            content: `New ${type} node`,
            label: `New ${type} node`,
            onChange: (updatedData) => handleNodeDataChange(response.nodeId, updatedData),
            onDelete: (nodeId) => handleNodeDelete(nodeId)
          },
        };

        setNodes((nds) => nds.concat(newNode));
        toast.success('Node added');
      } catch (error) {
        console.error('Error adding node:', error);
        toast.error('Failed to add node');
      }
    },
    [reactFlowInstance, flowId, setNodes, handleNodeDataChange]
  );

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      // Save flow metadata
      await ChatbotService.updateFlow(flowId, {
        name: flowData.name,
        description: flowData.description,
        isActive: flowData.is_active
      });
      
      // Save all nodes with their current data
      for (const node of nodes) {
        await ChatbotService.updateNode(flowId, node.id, {
          type: node.type,
          content: node.data.content || '',
          positionX: node.position.x,
          positionY: node.position.y,
          metadata: {
            ...node.data,
            onChange: undefined,
            onDelete: undefined,
            label: undefined
          }
        });
      }
      
      // Save all edges
      for (const edge of edges) {
        await ChatbotService.updateEdge(flowId, edge.id, {
          sourceNodeId: edge.source,
          targetNodeId: edge.target,
          condition: edge.data?.condition || edge.label || null
        });
      }
      
      toast.success('Flow saved successfully');
    } catch (error) {
      console.error('Error saving flow:', error);
      toast.error('Failed to save flow');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    try {
      if (!flowData || !flowData.nodes || flowData.nodes.length === 0) {
        toast.error('No flow data to test');
        return;
      }

      toast.info('Testing flow...');
      
      // Test with a simple message
      const result = await ChatbotService.testFlow(flowId, 'Hello');
      
      if (result.success) {
        toast.success('Flow test completed successfully!');
        console.log('Test result:', result);
      } else {
        toast.error('Flow test failed');
      }
    } catch (error) {
      console.error('Error testing flow:', error);
      toast.error('Failed to test flow: ' + (error.message || 'Unknown error'));
    }
  };

  if (isLoading) {
    return (
      <div className="builder-loading">
        <div className="loading-spinner"></div>
        <p>Loading chatbot builder...</p>
      </div>
    );
  }

  return (
    <div className="chatbot-builder-container">
      {/* Top Toolbar */}
      <div className="builder-toolbar">
        <div className="toolbar-left">
          <button className="toolbar-btn" onClick={() => navigate('/chatbot/flows')}>
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>
          <div className="flow-info">
            <h2>{flowData?.name || 'Untitled Flow'}</h2>
            <span className="flow-status">{flowData?.is_active ? 'Active' : 'Draft'}</span>
          </div>
        </div>
        <div className="toolbar-right">
          {isMobile && (
            <button 
              className="toolbar-btn" 
              onClick={() => setShowNodePanel(!showNodePanel)}
            >
              <Plus size={20} />
              <span>Nodes</span>
            </button>
          )}
          <button className="toolbar-btn" onClick={handleTest}>
            <Play size={20} />
            <span>Test</span>
          </button>
          <button 
            className="toolbar-btn primary" 
            onClick={handleSave}
            disabled={isSaving}
          >
            <Save size={20} />
            <span>{isSaving ? 'Saving...' : 'Save'}</span>
          </button>
        </div>
      </div>

      <div className="builder-content">
        {/* Left Sidebar - Node Palette */}
        {showNodePanel && (
          <div className={`node-palette ${isMobile ? 'mobile-panel' : ''}`}>
            <div className="palette-header">
              <h3>Add Nodes</h3>
              {isMobile && (
                <button 
                  className="close-panel-btn"
                  onClick={() => setShowNodePanel(false)}
                >
                  <X size={20} />
                </button>
              )}
            </div>
            <div className="palette-content">
              {nodeCategories.map((category) => (
                <div key={category.category} className="node-category">
                  <h4>{category.category}</h4>
                  {category.nodes.map((node) => {
                    const Icon = node.icon;
                    return (
                      <div
                        key={node.type}
                        className="node-palette-item"
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.setData('application/reactflow', node.type);
                          event.dataTransfer.effectAllowed = 'move';
                        }}
                      >
                        <div className="node-icon" style={{ backgroundColor: node.color }}>
                          <Icon size={20} />
                        </div>
                        <div className="node-info">
                          <div className="node-label">{node.label}</div>
                          <div className="node-description">{node.description}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Canvas */}
        <div className="flow-canvas" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onNodeDragStop={onNodeDragStop}
            onEdgesDelete={onEdgesDelete}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            fitView
            attributionPosition="bottom-left"
          >
            <Background color="#aaa" gap={16} />
            <Controls />
            <MiniMap 
              nodeColor={(node) => {
                const colors = {
                  trigger: '#10b981',
                  sendMessage: '#3b82f6',
                  waitForReply: '#f59e0b',
                  condition: '#8b5cf6',
                  delay: '#6b7280'
                };
                return colors[node.type] || '#6b7280';
              }}
            />
          </ReactFlow>
        </div>

        {/* Right Sidebar - Node Configuration */}
        {showConfigPanel && selectedNode && (
          <div className={`config-panel ${isMobile ? 'mobile-panel' : ''}`}>
            <div className="config-header">
              <h3>Configure Node</h3>
              <button onClick={() => setShowConfigPanel(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="config-content">
              <NodeConfigPanel node={selectedNode} onChange={handleNodeDataChange} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Node Configuration Panel Component
const NodeConfigPanel = ({ node, onChange }) => {
  const [localData, setLocalData] = useState(node.data);
  const [isUploading, setIsUploading] = useState(false);
  const debounceTimeoutRef = useRef(null);

  useEffect(() => {
    setLocalData(node.data);
  }, [node]);

  const handleChange = (field, value, shouldDebounce = false) => {
    const updated = { ...localData, [field]: value };
    setLocalData(updated);
    
    if (shouldDebounce) {
      // Clear existing timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      
      // Set new timeout for debounced save (no toast for text inputs)
      debounceTimeoutRef.current = setTimeout(() => {
        onChange(node.id, updated, false);
      }, 1000); // 1 second debounce
    } else {
      // Immediate save for non-text fields (show toast for significant changes)
      onChange(node.id, updated, true);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  const handleMediaUpload = async (event, messageType) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const result = await ChatbotService.uploadMedia(file, messageType);

      // Update node data with media ID and URL
      const updated = {
        ...localData,
        mediaId: result.mediaId,
        mediaUrl: result.mediaUrl,
        mediaFilename: file.name,
        [`${messageType}Url`]: result.mediaUrl,
        // Add acknowledgment message for successful upload
        uploadAcknowledgment: `${messageType.charAt(0).toUpperCase() + messageType.slice(1)} uploaded successfully!`
      };
      setLocalData(updated);
      onChange(node.id, updated);

      toast.success(`${messageType.charAt(0).toUpperCase() + messageType.slice(1)} uploaded successfully!`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload media');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="node-config">
      <div className="config-section">
        <label>Node Type</label>
        <div className="node-type-badge">{node.type}</div>
      </div>

      {node.type === 'sendMessage' && (
        <>
          <div className="config-section">
            <label>Message Type</label>
            <select
              value={localData.messageType || 'text'}
              onChange={(e) => handleChange('messageType', e.target.value)}
            >
              <option value="text">Text</option>
              <option value="image">Image</option>
              <option value="video">Video</option>
              <option value="document">Document</option>
              <option value="buttons">Buttons</option>
              <option value="list">List</option>
            </select>
          </div>
          <div className="config-section">
            <label>Message Content</label>
            <textarea
              value={localData.content || ''}
              onChange={(e) => handleChange('content', e.target.value, true)}
              placeholder="Enter message content..."
              rows={4}
            />
          </div>

          {/* Media Upload for non-text types */}
          {(localData.messageType === 'image' || localData.messageType === 'video' || localData.messageType === 'document') && (
            <div className="config-section">
              <label>{localData.messageType.charAt(0).toUpperCase() + localData.messageType.slice(1)} Upload</label>
              <div className="media-upload-container">
                <input
                  type="file"
                  id={`file-${node.id}`}
                  accept={
                    localData.messageType === 'image' ? 'image/*' :
                    localData.messageType === 'video' ? 'video/*' :
                    localData.messageType === 'document' ? '.pdf,.doc,.docx,.txt' : '*'
                  }
                  onChange={(e) => handleMediaUpload(e, localData.messageType)}
                  style={{ display: 'none' }}
                />
                <label htmlFor={`file-${node.id}`} className="upload-button">
                  {isUploading ? 'Uploading...' : `Upload ${localData.messageType}`}
                </label>
                {localData.mediaUrl && (
                  <div className="uploaded-media-info">
                    <p>✅ Media uploaded: {localData.mediaFilename}</p>
                    <button
                      type="button"
                      onClick={() => handleChange('mediaUrl', null)}
                      className="remove-media-btn"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Interactive Buttons Configuration */}
          {localData.messageType === 'buttons' && (
            <div className="config-section">
              <label>Interactive Buttons (Max 3)</label>
              <div className="buttons-config">
                {(localData.buttons || []).map((button, index) => (
                  <div key={index} className="button-item">
                    <input
                      type="text"
                      placeholder="Button text"
                      value={button.title || ''}
                      onChange={(e) => {
                        const newButtons = [...(localData.buttons || [])];
                        newButtons[index] = { ...newButtons[index], title: e.target.value };
                        handleChange('buttons', newButtons, true);
                      }}
                    />
                    <select
                      value={button.type || 'reply'}
                      onChange={(e) => {
                        const newButtons = [...(localData.buttons || [])];
                        newButtons[index] = { ...newButtons[index], type: e.target.value };
                        handleChange('buttons', newButtons);
                      }}
                    >
                      <option value="reply">Reply</option>
                      <option value="call">Call</option>
                      <option value="url">URL</option>
                    </select>
                    {button.type === 'url' && (
                      <input
                        type="url"
                        placeholder="URL"
                        value={button.payload || ''}
                        onChange={(e) => {
                          const newButtons = [...(localData.buttons || [])];
                          newButtons[index] = { ...newButtons[index], payload: e.target.value };
                          handleChange('buttons', newButtons, true);
                        }}
                      />
                    )}
                    {button.type === 'call' && (
                      <input
                        type="tel"
                        placeholder="Phone number"
                        value={button.payload || ''}
                        onChange={(e) => {
                          const newButtons = [...(localData.buttons || [])];
                          newButtons[index] = { ...newButtons[index], payload: e.target.value };
                          handleChange('buttons', newButtons, true);
                        }}
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const newButtons = (localData.buttons || []).filter((_, i) => i !== index);
                        handleChange('buttons', newButtons);
                      }}
                      className="remove-btn"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {(localData.buttons || []).length < 3 && (
                  <button
                    type="button"
                    onClick={() => {
                      const newButtons = [...(localData.buttons || []), { title: '', type: 'reply' }];
                      handleChange('buttons', newButtons);
                    }}
                    className="add-btn"
                  >
                    Add Button ({(localData.buttons || []).length}/3)
                  </button>
                )}
                {(localData.buttons || []).length >= 3 && (
                  <p className="max-buttons-reached">Maximum 3 buttons reached</p>
                )}
              </div>
            </div>
          )}

          {/* List Configuration */}
          {localData.messageType === 'list' && (
            <div className="config-section">
              <label>List Configuration (Max 10 items)</label>
              <div className="list-config">
                <input
                  type="text"
                  placeholder="List title"
                  value={localData.listTitle || ''}
                  onChange={(e) => handleChange('listTitle', e.target.value, true)}
                />
                <input
                  type="text"
                  placeholder="List description"
                  value={localData.listDescription || ''}
                  onChange={(e) => handleChange('listDescription', e.target.value, true)}
                />
                <div className="list-items">
                  <h4>List Items</h4>
                  {(localData.listItems || []).map((item, index) => (
                    <div key={index} className="list-item">
                      <input
                        type="text"
                        placeholder="Item title"
                        value={item.title || ''}
                        onChange={(e) => {
                          const newItems = [...(localData.listItems || [])];
                          newItems[index] = { ...newItems[index], title: e.target.value };
                          handleChange('listItems', newItems, true);
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Item description"
                        value={item.description || ''}
                        onChange={(e) => {
                          const newItems = [...(localData.listItems || [])];
                          newItems[index] = { ...newItems[index], description: e.target.value };
                          handleChange('listItems', newItems, true);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newItems = (localData.listItems || []).filter((_, i) => i !== index);
                          handleChange('listItems', newItems);
                        }}
                        className="remove-btn"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  {(localData.listItems || []).length < 10 && (
                    <button
                      type="button"
                      onClick={() => {
                        const newItems = [...(localData.listItems || []), { title: '', description: '' }];
                        handleChange('listItems', newItems);
                      }}
                      className="add-btn"
                    >
                      Add Item ({(localData.listItems || []).length}/10)
                    </button>
                  )}
                  {(localData.listItems || []).length >= 10 && (
                    <p className="max-items-reached">Maximum 10 items reached</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {node.type === 'waitForReply' && (
        <>
          <div className="config-section">
            <label>Expected Reply Type</label>
            <select
              value={localData.replyType || 'any'}
              onChange={(e) => handleChange('replyType', e.target.value)}
            >
              <option value="any">Any</option>
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="email">Email</option>
            </select>
          </div>
          <div className="config-section">
            <label>Timeout (seconds)</label>
            <input
              type="number"
              value={localData.timeout || 300}
              onChange={(e) => handleChange('timeout', parseInt(e.target.value))}
              min={0}
            />
          </div>
        </>
      )}

      {node.type === 'condition' && (
        <>
          <div className="config-section">
            <label>Condition Type</label>
            <select
              value={localData.conditionType || 'equals'}
              onChange={(e) => handleChange('conditionType', e.target.value)}
            >
              <option value="equals">Equals</option>
              <option value="contains">Contains</option>
              <option value="startsWith">Starts With</option>
              <option value="regex">Regex</option>
            </select>
          </div>
          <div className="config-section">
            <label>Value to Compare</label>
            <input
              type="text"
              value={localData.compareValue || ''}
              onChange={(e) => handleChange('compareValue', e.target.value, true)}
              placeholder="Enter value to match..."
            />
          </div>
          <div className="config-section">
            <label>True Branch Label</label>
            <input
              type="text"
              value={localData.trueLabel || 'True'}
              onChange={(e) => handleChange('trueLabel', e.target.value, true)}
              placeholder="e.g., 'Yes', 'Support', 'Option A'"
            />
          </div>
          <div className="config-section">
            <label>False Branch Label</label>
            <input
              type="text"
              value={localData.falseLabel || 'False'}
              onChange={(e) => handleChange('falseLabel', e.target.value, true)}
              placeholder="e.g., 'No', 'General', 'Option B'"
            />
          </div>
          <div className="config-section">
            <div className="condition-info">
              <p><strong>How it works:</strong></p>
              <p>• Connect the <strong>left handle</strong> (True) to the path when condition matches</p>
              <p>• Connect the <strong>right handle</strong> (False) to the path when condition doesn't match</p>
            </div>
          </div>
        </>
      )}

      {node.type === 'delay' && (
        <div className="config-section">
          <label>Delay Duration (seconds)</label>
          <input
            type="number"
            value={localData.duration || 5}
            onChange={(e) => handleChange('duration', parseInt(e.target.value))}
            min={1}
          />
        </div>
      )}
    </div>
  );
};

export default ChatbotBuilder2;
