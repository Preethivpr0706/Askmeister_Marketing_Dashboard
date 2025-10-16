const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// Chatbot Flow operations
const createFlow = async (businessId, name, description = '', isActive = false) => {
  const id = uuidv4();
  const query = `
    INSERT INTO chatbot_flows (id, business_id, name, description, is_active)
    VALUES (?, ?, ?, ?, ?)
  `;
  
  await pool.query(query, [id, businessId, name, description, isActive]);
  return id;
};

const getFlows = async (businessId) => {
  console.log("Get flows called for businessId", businessId)
  const query = `
    SELECT * FROM chatbot_flows
    WHERE business_id = ?
    ORDER BY created_at DESC
  `;
  
  const [flows] = await pool.query(query, [businessId]);
  return flows;
};

const getFlowById = async (flowId, businessId) => {
  const query = `
    SELECT * FROM chatbot_flows
    WHERE id = ? AND business_id = ?
  `;
  
  const [flows] = await pool.query(query, [flowId, businessId]);
  return flows[0] || null;
};

const updateFlow = async (flowId, businessId, data) => {
  const { name, description, isActive } = data;
  
  const query = `
    UPDATE chatbot_flows
    SET name = ?, description = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND business_id = ?
  `;
  
  await pool.query(query, [name, description, isActive, flowId, businessId]);
  return true;
};

const deleteFlow = async (flowId, businessId) => {
  // First delete all nodes and edges associated with this flow
  await pool.query('DELETE FROM chatbot_edges WHERE flow_id = ?', [flowId]);
  await pool.query('DELETE FROM chatbot_nodes WHERE flow_id = ?', [flowId]);
  
  // Then delete the flow itself
  const query = `
    DELETE FROM chatbot_flows
    WHERE id = ? AND business_id = ?
  `;
  
  await pool.query(query, [flowId, businessId]);
  return true;
};

// Chatbot Node operations
const createNode = async (flowId, type, content, positionX, positionY, metadata = {}) => {
  const id = uuidv4();
  const query = `
    INSERT INTO chatbot_nodes (id, flow_id, type, content, position_x, position_y, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  
  await pool.query(query, [id, flowId, type, content, positionX, positionY, JSON.stringify(metadata)]);
  return id;
};

const getNodesByFlowId = async (flowId) => {
  const query = `
    SELECT * FROM chatbot_nodes
    WHERE flow_id = ?
  `;
  
  const [nodes] = await pool.query(query, [flowId]);
  
  // Parse metadata - handle both JSON string and already-parsed object
  return nodes.map(node => {
    let metadata = {};
    
    if (node.metadata) {
      // Check if metadata is already an object
      if (typeof node.metadata === 'object') {
        metadata = node.metadata;
      } 
      // If it's a string, try to parse it
      else if (typeof node.metadata === 'string') {
        try {
          metadata = JSON.parse(node.metadata);
        } catch (error) {
          console.error('Error parsing metadata for node:', node.id, error);
          metadata = {};
        }
      }
    }
    
    return {
      ...node,
      metadata
    };
  });
};

const updateNode = async (nodeId, flowId, data) => {
  const { type, content, positionX, positionY, metadata } = data;
  
  const query = `
    UPDATE chatbot_nodes
    SET type = ?, content = ?, position_x = ?, position_y = ?, metadata = ?
    WHERE id = ? AND flow_id = ?
  `;
  
  await pool.query(query, [
    type, 
    content, 
    positionX, 
    positionY, 
    JSON.stringify(metadata || {}), 
    nodeId, 
    flowId
  ]);
  
  return true;
};

const deleteNode = async (nodeId, flowId) => {
  // First delete all edges connected to this node
  await pool.query('DELETE FROM chatbot_edges WHERE source_node_id = ? OR target_node_id = ?', [nodeId, nodeId]);
  
  // Then delete the node itself
  const query = `
    DELETE FROM chatbot_nodes
    WHERE id = ? AND flow_id = ?
  `;
  
  await pool.query(query, [nodeId, flowId]);
  return true;
};

// Chatbot Edge operations
const createEdge = async (flowId, sourceNodeId, targetNodeId, condition = null) => {
  const id = uuidv4();
  const query = `
    INSERT INTO chatbot_edges (id, flow_id, source_node_id, target_node_id, edge_condition)
    VALUES (?, ?, ?, ?, ?)
  `;
  
  await pool.query(query, [id, flowId, sourceNodeId, targetNodeId, condition]);
  return id;
};

const getEdgesByFlowId = async (flowId) => {
  const query = `
    SELECT * FROM chatbot_edges
    WHERE flow_id = ?
  `;
  
  const [edges] = await pool.query(query, [flowId]);
  return edges;
};

const updateEdge = async (edgeId, flowId, data) => {
  const { sourceNodeId, targetNodeId, condition } = data;
  
  const query = `
    UPDATE chatbot_edges
    SET source_node_id = ?, target_node_id = ?, edge_condition = ?
    WHERE id = ? AND flow_id = ?
  `;
  
  await pool.query(query, [sourceNodeId, targetNodeId, condition, edgeId, flowId]);
  return true;
};

const deleteEdge = async (edgeId, flowId) => {
  const query = `
    DELETE FROM chatbot_edges
    WHERE id = ? AND flow_id = ?
  `;
  
  await pool.query(query, [edgeId, flowId]);
  return true;
};

// Get complete flow with nodes and edges
const getCompleteFlow = async (flowId, businessId) => {
  const flow = await getFlowById(flowId, businessId);
  
  if (!flow) {
    return null;
  }
  
  const nodes = await getNodesByFlowId(flowId);
  const edges = await getEdgesByFlowId(flowId);
  
  return {
    ...flow,
    nodes,
    edges
  };
};

// Toggle chatbot for a conversation
const toggleChatbotForConversation = async (conversationId, isActive, flowId = null) => {
  const query = `
    UPDATE conversations
    SET is_bot_active = ?, bot_flow_id = ?, current_node_id = NULL
    WHERE id = ?
  `;
  
  await pool.query(query, [isActive, flowId, conversationId]);
  return true;
};

// Update current node for a conversation
const updateConversationCurrentNode = async (conversationId, nodeId) => {
  const query = `
    UPDATE conversations
    SET current_node_id = ?
    WHERE id = ?
  `;
  
  await pool.query(query, [nodeId, conversationId]);
  return true;
};

module.exports = {
  // Flow operations
  createFlow,
  getFlows,
  getFlowById,
  updateFlow,
  deleteFlow,
  getCompleteFlow,
  
  // Node operations
  createNode,
  getNodesByFlowId,
  updateNode,
  deleteNode,
  
  // Edge operations
  createEdge,
  getEdgesByFlowId,
  updateEdge,
  deleteEdge,
  
  // Conversation operations
  toggleChatbotForConversation,
  updateConversationCurrentNode
};