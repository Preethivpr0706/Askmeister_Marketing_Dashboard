const axios = require('axios');
const FormData = require('form-data');
require('dotenv').config();
const { pool } = require('../config/database');
const ConversationController = require('./conversationController');
const chatbotModel = require('../models/chatbotModel');
const conversationService = require('../services/conversationService');

// Flow Controllers
exports.createFlow = async (req, res) => {
  try {
    const { name, description, isActive } = req.body;
    const businessId = req.user.businessId;
    
    if (!name) {
      return res.status(400).json({ error: 'Flow name is required' });
    }
    
    const flowId = await chatbotModel.createFlow(businessId, name, description, isActive);
    
    res.status(201).json({ 
      success: true, 
      flowId,
      message: 'Chatbot flow created successfully' 
    });
  } catch (error) {
    console.error('Error creating chatbot flow:', error);
    res.status(500).json({ error: 'Failed to create chatbot flow' });
  }
};

exports.getFlows = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const flows = await chatbotModel.getFlows(businessId);
    
    res.status(200).json({ 
      success: true, 
      flows 
    });
  } catch (error) {
    console.error('Error fetching chatbot flows:', error);
    res.status(500).json({ error: 'Failed to fetch chatbot flows' });
  }
};

exports.getFlowById = async (req, res) => {
  try {
    const { flowId } = req.params;
    const businessId = req.user.businessId;
    
    const flow = await chatbotModel.getFlowById(flowId, businessId);
    
    if (!flow) {
      return res.status(404).json({ error: 'Chatbot flow not found' });
    }
    
    res.status(200).json({ 
      success: true, 
      flow 
    });
  } catch (error) {
    console.error('Error fetching chatbot flow:', error);
    res.status(500).json({ error: 'Failed to fetch chatbot flow' });
  }
};

exports.updateFlow = async (req, res) => {
  try {
    const { flowId } = req.params;
    const { name, description, isActive } = req.body;
    const businessId = req.user.businessId;
    
    if (!name) {
      return res.status(400).json({ error: 'Flow name is required' });
    }
    
    const flow = await chatbotModel.getFlowById(flowId, businessId);
    
    if (!flow) {
      return res.status(404).json({ error: 'Chatbot flow not found' });
    }
    
    await chatbotModel.updateFlow(flowId, businessId, { name, description, isActive });
    
    res.status(200).json({ 
      success: true, 
      message: 'Chatbot flow updated successfully' 
    });
  } catch (error) {
    console.error('Error updating chatbot flow:', error);
    res.status(500).json({ error: 'Failed to update chatbot flow' });
  }
};

exports.deleteFlow = async (req, res) => {
  try {
    const { flowId } = req.params;
    const businessId = req.user.businessId;
    
    const flow = await chatbotModel.getFlowById(flowId, businessId);
    
    if (!flow) {
      return res.status(404).json({ error: 'Chatbot flow not found' });
    }
    
    await chatbotModel.deleteFlow(flowId, businessId);
    
    res.status(200).json({ 
      success: true, 
      message: 'Chatbot flow deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting chatbot flow:', error);
    res.status(500).json({ error: 'Failed to delete chatbot flow' });
  }
};

// Node Controllers
exports.createNode = async (req, res) => {
  try {
    const { flowId } = req.params;
    const { type, content, positionX, positionY, metadata } = req.body;
    const businessId = req.user.businessId;
    
    if (!type || !content) {
      return res.status(400).json({ error: 'Node type and content are required' });
    }
    
    const flow = await chatbotModel.getFlowById(flowId, businessId);
    
    if (!flow) {
      return res.status(404).json({ error: 'Chatbot flow not found' });
    }
    
    const nodeId = await chatbotModel.createNode(flowId, type, content, positionX, positionY, metadata);
    
    res.status(201).json({ 
      success: true, 
      nodeId,
      message: 'Node created successfully' 
    });
  } catch (error) {
    console.error('Error creating node:', error);
    res.status(500).json({ error: 'Failed to create node' });
  }
};

exports.updateNode = async (req, res) => {
  try {
    const { flowId, nodeId } = req.params;
    const { type, content, positionX, positionY, metadata } = req.body;
    const businessId = req.user.businessId;
    
    const flow = await chatbotModel.getFlowById(flowId, businessId);
    
    if (!flow) {
      return res.status(404).json({ error: 'Chatbot flow not found' });
    }
    
    await chatbotModel.updateNode(nodeId, flowId, { type, content, positionX, positionY, metadata });
    
    res.status(200).json({ 
      success: true, 
      message: 'Node updated successfully' 
    });
  } catch (error) {
    console.error('Error updating node:', error);
    res.status(500).json({ error: 'Failed to update node' });
  }
};

exports.deleteNode = async (req, res) => {
  try {
    const { flowId, nodeId } = req.params;
    const businessId = req.user.businessId;
    
    const flow = await chatbotModel.getFlowById(flowId, businessId);
    
    if (!flow) {
      return res.status(404).json({ error: 'Chatbot flow not found' });
    }
    
    await chatbotModel.deleteNode(nodeId, flowId);
    
    res.status(200).json({ 
      success: true, 
      message: 'Node deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting node:', error);
    res.status(500).json({ error: 'Failed to delete node' });
  }
};

// Edge Controllers
exports.createEdge = async (req, res) => {
  try {
    const { flowId } = req.params;
    const { sourceNodeId, targetNodeId, condition } = req.body;
    const businessId = req.user.businessId;
    
    if (!sourceNodeId || !targetNodeId) {
      return res.status(400).json({ error: 'Source and target node IDs are required' });
    }
    
    const flow = await chatbotModel.getFlowById(flowId, businessId);
    
    if (!flow) {
      return res.status(404).json({ error: 'Chatbot flow not found' });
    }
    
    const edgeId = await chatbotModel.createEdge(flowId, sourceNodeId, targetNodeId, condition);
    
    res.status(201).json({ 
      success: true, 
      edgeId,
      message: 'Edge created successfully' 
    });
  } catch (error) {
    console.error('Error creating edge:', error);
    res.status(500).json({ error: 'Failed to create edge' });
  }
};

exports.updateEdge = async (req, res) => {
  try {
    const { flowId, edgeId } = req.params;
    const { sourceNodeId, targetNodeId, condition } = req.body;
    const businessId = req.user.businessId;
    
    const flow = await chatbotModel.getFlowById(flowId, businessId);
    
    if (!flow) {
      return res.status(404).json({ error: 'Chatbot flow not found' });
    }
    
    await chatbotModel.updateEdge(edgeId, flowId, { sourceNodeId, targetNodeId, condition });
    
    res.status(200).json({ 
      success: true, 
      message: 'Edge updated successfully' 
    });
  } catch (error) {
    console.error('Error updating edge:', error);
    res.status(500).json({ error: 'Failed to update edge' });
  }
};

exports.deleteEdge = async (req, res) => {
  try {
    const { flowId, edgeId } = req.params;
    const businessId = req.user.businessId;
    
    const flow = await chatbotModel.getFlowById(flowId, businessId);
    
    if (!flow) {
      return res.status(404).json({ error: 'Chatbot flow not found' });
    }
    
    await chatbotModel.deleteEdge(edgeId, flowId);
    
    res.status(200).json({ 
      success: true, 
      message: 'Edge deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting edge:', error);
    res.status(500).json({ error: 'Failed to delete edge' });
  }
};

// Complete Flow Controllers
exports.getCompleteFlow = async (req, res) => {
  try {
    const { flowId } = req.params;
    const businessId = req.user.businessId;
    
    const completeFlow = await chatbotModel.getCompleteFlow(flowId, businessId);
    
    if (!completeFlow) {
      return res.status(404).json({ error: 'Chatbot flow not found' });
    }
    
    res.status(200).json({ 
      success: true, 
      flow: completeFlow 
    });
  } catch (error) {
    console.error('Error fetching complete flow:', error);
    res.status(500).json({ error: 'Failed to fetch complete flow' });
  }
};

// Conversation Controllers
exports.getChatbotStatus = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const businessId = req.user.businessId;
    const userId = req.user.id;
    
    const conversation = await ConversationController.getConversation(conversationId, userId);
    
    if (!conversation || conversation.business_id !== businessId) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    let flow = null;
    if (conversation.bot_flow_id) {
      flow = await chatbotModel.getFlowById(conversation.bot_flow_id, businessId);
    }
    
    res.status(200).json({
      success: true,
      data: {
        enabled: conversation.is_bot_active || false,
        flowId: conversation.bot_flow_id,
        currentNodeId: conversation.current_node_id,
        flow: flow
      }
    });
  } catch (error) {
    console.error('Error getting chatbot status:', error);
    res.status(500).json({ error: 'Failed to get chatbot status' });
  }
};

exports.toggleChatbotForConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { enabled, flowId } = req.body;
    const businessId = req.user.businessId;
    const userId = req.user.id;
    
    // Validate if conversation exists and belongs to the business
    const conversation = await ConversationController.getConversation(conversationId, userId);
    
    if (!conversation || conversation.business_id !== businessId) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    // If activating, validate that the flow exists and belongs to the business
    if (enabled && flowId) {
      const flow = await chatbotModel.getFlowById(flowId, businessId);
      
      if (!flow) {
        return res.status(404).json({ error: 'Chatbot flow not found' });
      }
    }
    
    await chatbotModel.toggleChatbotForConversation(conversationId, enabled, enabled ? flowId : null);
    
    res.status(200).json({ 
      success: true, 
      message: `Chatbot ${enabled ? 'activated' : 'deactivated'} for conversation` 
    });
  } catch (error) {
    console.error('Error toggling chatbot for conversation:', error);
    res.status(500).json({ error: 'Failed to toggle chatbot for conversation' });
  }
};

// Process incoming message with chatbot
exports.processChatbotMessageInternal = async (message, conversation) => {
  try {
    // If bot is not active for this conversation, do nothing
    if (!conversation.is_bot_active || !conversation.bot_flow_id) {
      return false;
    }

    const businessId = conversation.business_id || conversation.businessId;
    const flow = await chatbotModel.getCompleteFlow(conversation.bot_flow_id, businessId);

    if (!flow) {
      console.error(`Chatbot flow ${conversation.bot_flow_id} not found`);
      return false;
    }

    // Get current node or find entry node if none set
    let currentNodeId = conversation.current_node_id;

    // If no current node, find the first node (entry point)
    if (!currentNodeId) {
      // Find a node without incoming edges or the first node in the list
      const entryNode = flow.nodes.find(node => {
        return !flow.edges.some(edge => edge.target_node_id === node.id);
      }) || flow.nodes[0];

      if (!entryNode) {
        console.error('No nodes found in flow');
        return false;
      }

      currentNodeId = entryNode.id;
    }
    console.log('Processing flow for message:', message);
    // Process the flow starting from current node
    const processed = await processFlowFromNode(currentNodeId, flow, conversation, message);

    return processed;
  } catch (error) {
    console.error('Error processing chatbot message:', error);
    return false;
  }
};

// Process flow starting from a specific node
async function processFlowFromNode(currentNodeId, flow, conversation, userMessage) {
  try {
    let currentNode = flow.nodes.find(node => node.id === currentNodeId);

    if (!currentNode) {
      console.error(`Current node ${currentNodeId} not found in flow`);
      return false;
    }

    // Process current node
    if (currentNode.type === 'sendMessage' || shouldSendMessage(currentNode)) {
      await sendNodeMessage(currentNode, conversation);
    }

    // Find next nodes in the flow
    const outgoingEdges = flow.edges.filter(edge => edge.source_node_id === currentNodeId);

    if (outgoingEdges.length === 0) {
      // No outgoing edges, end of flow - reset current node for next conversation
      await chatbotModel.updateConversationCurrentNode(conversation.id, null);
      console.log('Flow completed, current node reset for conversation:', conversation.id);
      return true;
    }

    // Find the next node based on user input (for Wait for Reply nodes)
    const userInput = userMessage ? userMessage.content.toLowerCase().trim() : '';
    console.log('User input:', userInput);
    let nextNodeId = null;

    // Extract effective user input for all processing
    let effectiveUserInput = userInput;
    if (userMessage && userMessage.interactive) {
      const interactiveData = userMessage.interactive;
      console.log('Processing interactive response:', interactiveData);
      if (interactiveData.type === 'button') {
        effectiveUserInput = (interactiveData.button_text || '').toLowerCase().trim();
      } else if (interactiveData.type === 'list') {
        effectiveUserInput = (interactiveData.list_item_title || '').toLowerCase().trim();
      }
    }
    
    console.log('Effective user input for all processing:', effectiveUserInput);
    console.log('Current node type:', currentNode.type);
    console.log('Current node metadata:', currentNode.metadata);

    // Handle condition nodes first (they can be triggered by interactive responses)
    if (currentNode.type === 'condition' && currentNode.metadata) {
      const conditionType = currentNode.metadata.conditionType || 'equals';
      const compareValue = (currentNode.metadata.compareValue || '').toLowerCase();

      let conditionMatched = false;

      switch (conditionType) {
        case 'equals':
          conditionMatched = effectiveUserInput === compareValue;
          break;
        case 'contains':
          conditionMatched = effectiveUserInput.includes(compareValue);
          break;
        case 'startsWith':
          conditionMatched = effectiveUserInput.startsWith(compareValue);
          break;
        case 'regex':
          try {
            const regex = new RegExp(compareValue, 'i');
            conditionMatched = regex.test(effectiveUserInput);
          } catch (e) {
            console.error('Invalid regex pattern:', compareValue);
            conditionMatched = false;
          }
          break;
      }

      console.log(`Condition check: "${effectiveUserInput}" ${conditionType} "${compareValue}" = ${conditionMatched}`);

      // Find true/false edges (first edge = true branch, second edge = false branch)
      const conditionEdges = outgoingEdges.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

      if (conditionMatched && conditionEdges.length > 0) {
        // Take first edge (true branch)
        nextNodeId = conditionEdges[0].target_node_id;
        console.log(`Taking true branch to node ${nextNodeId}`);
      } else if (conditionEdges.length > 1) {
        // Take second edge (false branch)
        nextNodeId = conditionEdges[1].target_node_id;
        console.log(`Taking false branch to node ${nextNodeId}`);
      } else if (conditionEdges.length > 0) {
        // Only one edge available
        nextNodeId = conditionEdges[0].target_node_id;
        console.log(`Only one branch available, taking to node ${nextNodeId}`);
      }
    } 
    // Handle interactive message responses (button clicks, list selections)
    else if (userMessage && userMessage.interactive) {
      const interactiveData = userMessage.interactive;
      console.log('Processing interactive response:', interactiveData);
      
      // Find edge that matches the interactive response
      for (const edge of outgoingEdges) {
        if (edge.condition) {
          // Check if the condition matches the interactive response
          if (interactiveData.type === 'button' && edge.condition.toLowerCase() === effectiveUserInput) {
            nextNodeId = edge.target_node_id;
            break;
          } else if (interactiveData.type === 'list' && edge.condition.toLowerCase() === effectiveUserInput) {
            nextNodeId = edge.target_node_id;
            break;
          }
        }
      }
      
      // If no specific match found, take the first edge
      if (!nextNodeId && outgoingEdges.length > 0) {
        nextNodeId = outgoingEdges[0].target_node_id;
      }
      
      // After finding the next node for interactive response, continue processing
      if (nextNodeId) {
        const nextNode = flow.nodes.find(node => node.id === nextNodeId);
        if (nextNode) {
          // Update current node
          await chatbotModel.updateConversationCurrentNode(conversation.id, nextNodeId);
          
          // If next node is a Wait for Reply, stop here
          if (nextNode.type === 'waitForReply') {
            console.log('Next node is Wait for Reply, stopping flow and waiting for user input');
            return true;
          }
          
          // If next node should send a message, process it immediately
          if (nextNode.type === 'sendMessage' || shouldSendMessage(nextNode)) {
            console.log('Next node is Send Message, processing immediately');
            return await processFlowFromNode(nextNodeId, flow, conversation, userMessage);
          }
          
          // For other node types, continue processing
          return await processFlowFromNode(nextNodeId, flow, conversation, userMessage);
        }
      }
    } else {
      // Handle regular nodes based on conditions
      // First try to match based on conditions
      for (const edge of outgoingEdges) {
        if (edge.condition && userInput === edge.condition.toLowerCase()) {
          nextNodeId = edge.target_node_id;
          break;
        }
      }

      // If no condition matched, take the first edge without a condition or the first edge
      if (!nextNodeId) {
        const defaultEdge = outgoingEdges.find(edge => !edge.condition) || outgoingEdges[0];
        if (defaultEdge) {
          nextNodeId = defaultEdge.target_node_id;
        }
      }
    }

    if (!nextNodeId) {
      console.error('No next node found');
      return false;
    }

    // Find the next node
    const nextNode = flow.nodes.find(node => node.id === nextNodeId);

    if (!nextNode) {
      console.error(`Next node ${nextNodeId} not found in flow`);
      return false;
    }

    // If next node is a Wait for Reply, stop here and wait for user input
    if (nextNode.type === 'waitForReply') {
      console.log('Next node is Wait for Reply, stopping flow and waiting for user input');
      await chatbotModel.updateConversationCurrentNode(conversation.id, nextNodeId);
      return true;
    }

    // If next node is a Send Message, process it immediately
    if (nextNode.type === 'sendMessage' || shouldSendMessage(nextNode)) {
      console.log('Next node is Send Message, processing immediately');
      await chatbotModel.updateConversationCurrentNode(conversation.id, nextNodeId);
      return await processFlowFromNode(nextNodeId, flow, conversation, userMessage); // Pass user message for context
    }

    // For other node types, just update current node
    await chatbotModel.updateConversationCurrentNode(conversation.id, nextNodeId);
    return true;

  } catch (error) {
    console.error('Error processing flow from node:', error);
    return false;
  }
}

// Helper function to determine if a node should send a message
function shouldSendMessage(node) {
  const messageSendingNodes = ['text', 'image', 'video', 'document', 'buttons', 'list'];
  const nodeMessageType = node.metadata && node.metadata.messageType ? node.metadata.messageType : node.type;
  return messageSendingNodes.includes(nodeMessageType);
}

// Helper function to send a node message
async function sendNodeMessage(node, conversation) {
  try {
    const phoneNumber = conversation.phone_number;
    const businessId = conversation.business_id || conversation.businessId;

    // Only send messages for node types that should actually send messages
    // Check if it's a sendMessage node with a messageType, or other message-sending nodes
    const messageSendingNodes = ['text', 'image', 'video', 'document', 'buttons', 'list'];
    const nodeMessageType = node.metadata && node.metadata.messageType ? node.metadata.messageType : node.type;

    // Send messages for sendMessage nodes OR nodes that are in the messageSendingNodes array
    if (node.type === 'sendMessage' || messageSendingNodes.includes(nodeMessageType)) {
      console.log(`Sending message for node type ${node.type} (messageType: ${nodeMessageType})`);
    } else {
      console.log(`Node type ${node.type} (messageType: ${nodeMessageType}) doesn't send messages, just updating flow state`);
      return;
    }

    // Prepare message based on node type and messageType
    const messageType = nodeMessageType || 'text';
    const content = node.content || '';

    switch (messageType) {
      case 'text':
        await conversationService.sendMessage({
          to: phoneNumber,
          businessId: businessId,
          messageType: 'text',
          content: content
        });
        break;

      case 'image':
        if (node.metadata && node.metadata.mediaId) {
          await conversationService.sendMessage({
            to: phoneNumber,
            businessId: businessId,
            messageType: 'image',
            mediaId: node.metadata.mediaId,
            caption: content
          });
        } else if (node.metadata && node.metadata.imageUrl) {
          await conversationService.sendMessage({
            to: phoneNumber,
            businessId: businessId,
            messageType: 'text',
            content: `${content}\n[Image: ${node.metadata.imageUrl}]`
          });
        } else {
          await conversationService.sendMessage({
            to: phoneNumber,
            businessId: businessId,
            messageType: 'text',
            content: content
          });
        }
        break;

      case 'video':
        if (node.metadata && node.metadata.mediaId) {
          await conversationService.sendMessage({
            to: phoneNumber,
            businessId: businessId,
            messageType: 'video',
            mediaId: node.metadata.mediaId,
            caption: content
          });
        } else if (node.metadata && node.metadata.videoUrl) {
          await conversationService.sendMessage({
            to: phoneNumber,
            businessId: businessId,
            messageType: 'text',
            content: `${content}\n[Video: ${node.metadata.videoUrl}]`
          });
        } else {
          await conversationService.sendMessage({
            to: phoneNumber,
            businessId: businessId,
            messageType: 'text',
            content: content
          });
        }
        break;

      case 'document':
        if (node.metadata && node.metadata.mediaId) {
          await conversationService.sendMessage({
            to: phoneNumber,
            businessId: businessId,
            messageType: 'document',
            mediaId: node.metadata.mediaId,
            filename: node.metadata.mediaFilename,
            caption: content
          });
        } else if (node.metadata && node.metadata.documentUrl) {
          await conversationService.sendMessage({
            to: phoneNumber,
            businessId: businessId,
            messageType: 'text',
            content: `${content}\n[Document: ${node.metadata.documentUrl}]`
          });
        } else {
          await conversationService.sendMessage({
            to: phoneNumber,
            businessId: businessId,
            messageType: 'text',
            content: content
          });
        }
        break;

      case 'buttons':
        // Send as proper WhatsApp interactive buttons
        if (node.metadata && node.metadata.buttons && Array.isArray(node.metadata.buttons)) {
          const buttons = node.metadata.buttons.map(button => ({
            type: 'reply',
            reply: {
              id: `${node.id}_${button.title.toLowerCase().replace(/\s+/g, '_')}`,
              title: button.title
            }
          }));

          await conversationService.sendMessage({
            to: phoneNumber,
            businessId: businessId,
            messageType: 'interactive',
            interactive: {
              type: 'button',
              body: {
                text: content
              },
              action: {
                buttons: buttons
              }
            }
          });
        } else {
          await conversationService.sendMessage({
            to: phoneNumber,
            businessId: businessId,
            messageType: 'text',
            content: content
          });
        }
        break;

      case 'list':
        // Send as proper WhatsApp interactive list
        if (node.metadata && node.metadata.listItems && Array.isArray(node.metadata.listItems)) {
          // Convert simplified listItems to WhatsApp sections format
          const sections = [{
            title: node.metadata.listTitle || 'Options',
            rows: node.metadata.listItems.map(item => ({
              id: `${node.id}_${item.title.toLowerCase().replace(/\s+/g, '_')}`,
              title: item.title,
              description: item.description
            }))
          }];

          await conversationService.sendMessage({
            to: phoneNumber,
            businessId: businessId,
            messageType: 'interactive',
            interactive: {
              type: 'list',
              body: {
                text: content
              },
              action: {
                button: node.metadata.listTitle || 'Choose option',
                sections: sections
              }
            }
          });
        } else if (node.metadata && node.metadata.sections && Array.isArray(node.metadata.sections)) {
          // Legacy support for old sections format
          const sections = node.metadata.sections.map(section => ({
            title: section.title,
            rows: section.rows.map(row => ({
              id: `${node.id}_${row.title.toLowerCase().replace(/\s+/g, '_')}`,
              title: row.title,
              description: row.description
            }))
          }));

          await conversationService.sendMessage({
            to: phoneNumber,
            businessId: businessId,
            messageType: 'interactive',
            interactive: {
              type: 'list',
              body: {
                text: content
              },
              action: {
                button: node.metadata.listTitle || 'Choose option',
                sections: sections
              }
            }
          });
        } else {
          await conversationService.sendMessage({
            to: phoneNumber,
            businessId: businessId,
            messageType: 'text',
            content: content
          });
        }
        break;

      default:
        console.log(`Unknown message type: ${messageType}, sending as text`);
        await conversationService.sendMessage({
          to: phoneNumber,
          businessId: businessId,
          messageType: 'text',
          content: content
        });
    }

    // Record this message in the database as a bot message
    let interactiveData = null;
    if (messageType === 'buttons' || messageType === 'list') {
      if (messageType === 'buttons' && node.metadata && node.metadata.buttons) {
        interactiveData = {
          type: 'button',
          content: content,
          data: node.metadata.buttons
        };
      } else if (messageType === 'list' && node.metadata && node.metadata.listItems) {
        // Convert listItems to sections format for database storage
        const sections = [{
          title: node.metadata.listTitle || 'Options',
          rows: node.metadata.listItems.map(item => ({
            id: `${node.id}_${item.title.toLowerCase().replace(/\s+/g, '_')}`,
            title: item.title,
            description: item.description
          }))
        }];
        interactiveData = {
          type: 'list',
          content: content,
          data: sections
        };
      }
    }

    await conversationService.addMessageToConversation({
      conversationId: conversation.id,
      direction: 'outbound',
      messageType: (messageType === 'buttons' || messageType === 'list') ? 'interactive' : messageType,
      content: content,
      mediaUrl: node.metadata && (node.metadata.imageUrl || node.metadata.videoUrl || node.metadata.documentUrl) || null,
      mediaFilename: node.metadata && node.metadata.mediaFilename || null,
      isBot: true,
      interactive: interactiveData
    });

  } catch (error) {
    console.error('Error sending node message:', error);
    throw error;
  }
}
// API endpoint to process a message through the chatbot
exports.processChatbotMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { message, flowId } = req.body;
    const businessId = req.user.businessId;
    const userId = req.user.id;

    // Get conversation
    const conversation = await ConversationController.getConversation(conversationId, userId);

    if (!conversation || conversation.business_id !== businessId) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    console.log('Processing chatbot message via API:', message);
    // Process message with chatbot
    const processed = await exports.processChatbotMessageInternal(message, conversation);

    res.status(200).json({
      success: true,
      processed: processed
    });
  } catch (error) {
    console.error('Error processing chatbot message via API:', error);
    res.status(500).json({ error: 'Failed to process chatbot message' });
  }
};

// API endpoint to upload media for chatbot
exports.uploadMedia = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { messageType } = req.body;
    const businessId = req.user.businessId;

    // Get business settings for WhatsApp API
    const [settings] = await pool.query(
      `SELECT * FROM business_settings WHERE business_id = ?`, [businessId]
    );

    if (!settings.length) {
      return res.status(404).json({ error: 'Business settings not found' });
    }

    const config = {
      headers: {
        'Authorization': `Bearer ${settings[0].whatsapp_api_token}`,
        'Content-Type': 'multipart/form-data'
      }
    };

    // Upload media to WhatsApp
    const formData = new FormData();
    formData.append('file', req.file.buffer, req.file.originalname);
    formData.append('messaging_product', 'whatsapp');

    const response = await axios.post(
      `https://graph.facebook.com/v17.0/${settings[0].whatsapp_phone_number_id}/media`,
      formData,
      config
    );

    return res.status(200).json({
      success: true,
      mediaId: response.data.id,
      mediaUrl: response.data.url || null
    });
  } catch (error) {
    console.error('Media upload error:', error.response ? error.response.data : error.message);
    return res.status(500).json({
      error: 'Failed to upload media',
      details: error.response ? error.response.data : error.message
    });
  }
};

// API endpoint to test chatbot flow
exports.testFlow = async (req, res) => {
  try {
    const { flowId } = req.params;
    const { message } = req.body;
    const businessId = req.user.businessId;

    // Get the flow
    const flow = await chatbotModel.getCompleteFlow(flowId, businessId);
    
    if (!flow) {
      return res.status(404).json({ error: 'Chatbot flow not found' });
    }

    // Create a mock conversation for testing
    const mockConversation = {
      id: 'test-conversation-' + Date.now(),
      business_id: businessId,
      phone_number: '1234567890', // Test phone number
      is_bot_active: true,
      bot_flow_id: flowId,
      current_node_id: null
    };

    // Process the test message
    const testMessage = {
      content: message || 'Hello',
      type: 'text',
      interactive: null
    };

    const processed = await exports.processChatbotMessageInternal(testMessage, mockConversation);

    res.status(200).json({
      success: true,
      processed: processed,
      message: 'Flow test completed',
      testMessage: testMessage.content,
      flowName: flow.name
    });
  } catch (error) {
    console.error('Error testing flow:', error);
    res.status(500).json({ 
      error: 'Failed to test flow',
      details: error.message 
    });
  }
};