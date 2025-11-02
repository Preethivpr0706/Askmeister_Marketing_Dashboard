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
      const cases = currentNode.metadata.cases || [];
      const hasMultipleCases = cases.length > 0;

      // Multi-case mode (switch statement)
      if (hasMultipleCases) {
        console.log(`Processing multi-case condition with ${cases.length} cases`);
        let matchedCase = null;

        // Try to match user input against each case
        for (const caseItem of cases) {
          const caseValue = (caseItem.value || '').toLowerCase();
          let matches = false;

          switch (conditionType) {
            case 'equals':
              matches = effectiveUserInput === caseValue;
              break;
            case 'contains':
              matches = effectiveUserInput.includes(caseValue) || caseValue.includes(effectiveUserInput);
              break;
            case 'startsWith':
              matches = effectiveUserInput.startsWith(caseValue) || caseValue.startsWith(effectiveUserInput);
              break;
            case 'regex':
              try {
                const regex = new RegExp(caseValue, 'i');
                matches = regex.test(effectiveUserInput);
              } catch (e) {
                console.error('Invalid regex pattern:', caseValue);
                matches = false;
              }
              break;
          }

          if (matches) {
            matchedCase = caseItem.value;
            console.log(`Matched case: "${matchedCase}" for input: "${effectiveUserInput}"`);
            break;
          }
        }

        // Find edge with matching condition
        if (matchedCase) {
          console.log(`Looking for edge with condition matching: "${matchedCase}"`);
          console.log(`Available edges:`, outgoingEdges.map(e => ({
            id: e.id,
            condition: e.condition || e.edge_condition,
            target: e.target_node_id
          })));
          
          for (const edge of outgoingEdges) {
            // Check both condition and edge_condition fields (database uses edge_condition)
            const edgeCondition = edge.condition || edge.edge_condition || '';
            if (edgeCondition && edgeCondition.toLowerCase() === matchedCase.toLowerCase()) {
              nextNodeId = edge.target_node_id;
              console.log(`✓ Taking matched case branch (${matchedCase}) to node ${nextNodeId}`);
              break;
            }
          }
          
          if (!nextNodeId) {
            console.log(`✗ No edge found matching case: "${matchedCase}"`);
          }
        }

        // If no match found, check for default case
        if (!nextNodeId && currentNode.metadata.defaultCase) {
          console.log('Checking for default case edge...');
          for (const edge of outgoingEdges) {
            const edgeCondition = edge.condition || edge.edge_condition || '';
            if (edgeCondition && edgeCondition.toLowerCase() === 'default') {
              nextNodeId = edge.target_node_id;
              console.log(`✓ Taking default case branch to node ${nextNodeId}`);
              break;
            }
          }
        }

        // If still no match, try to find any edge without condition as fallback
        if (!nextNodeId && outgoingEdges.length > 0) {
          const defaultEdge = outgoingEdges.find(edge => !(edge.condition || edge.edge_condition)) || outgoingEdges[0];
          if (defaultEdge) {
            nextNodeId = defaultEdge.target_node_id;
            console.log(`Taking fallback edge to node ${nextNodeId}`);
          }
        }
      } 
      // Legacy binary mode (true/false)
      else {
        const compareValue = (currentNode.metadata.compareValue || '').toLowerCase();
        console.log('Compare value:', compareValue);
        console.log('Effective user input:', effectiveUserInput);
        console.log('Condition type:', conditionType);
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

        // First try to match by condition label
        if (conditionMatched) {
          const trueEdge = conditionEdges.find(e => {
            const edgeCondition = e.condition || e.edge_condition || '';
            return edgeCondition.toLowerCase() === 'true';
          }) || conditionEdges[0];
          if (trueEdge) {
            nextNodeId = trueEdge.target_node_id;
            console.log(`Taking true branch to node ${nextNodeId}`);
          }
        } else {
          const falseEdge = conditionEdges.find(e => {
            const edgeCondition = e.condition || e.edge_condition || '';
            return edgeCondition.toLowerCase() === 'false';
          }) || (conditionEdges.length > 1 ? conditionEdges[1] : null);
          if (falseEdge) {
            nextNodeId = falseEdge.target_node_id;
            console.log(`Taking false branch to node ${nextNodeId}`);
          } else if (conditionEdges.length > 0) {
            // Fallback to first edge if no false edge found
            nextNodeId = conditionEdges[0].target_node_id;
            console.log(`Only one branch available, taking to node ${nextNodeId}`);
          }
        }
      }
    } 
    // Handle interactive message responses (button clicks, list selections)
    else if (userMessage && userMessage.interactive) {
      const interactiveData = userMessage.interactive;
      console.log('Processing interactive response:', interactiveData);
      
      // Find edge that matches the interactive response
      for (const edge of outgoingEdges) {
        const edgeCondition = edge.condition || edge.edge_condition || '';
        if (edgeCondition) {
          // Check if the condition matches the interactive response
          if (interactiveData.type === 'button' && edgeCondition.toLowerCase() === effectiveUserInput) {
            nextNodeId = edge.target_node_id;
            break;
          } else if (interactiveData.type === 'list' && edgeCondition.toLowerCase() === effectiveUserInput) {
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
        const edgeCondition = edge.condition || edge.edge_condition || '';
        if (edgeCondition && userInput === edgeCondition.toLowerCase()) {
          nextNodeId = edge.target_node_id;
          break;
        }
      }

      // If no condition matched, take the first edge without a condition or the first edge
      if (!nextNodeId) {
        const defaultEdge = outgoingEdges.find(edge => !(edge.condition || edge.edge_condition)) || outgoingEdges[0];
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
    // For list messages, ensure content is set (required by WhatsApp)
    let content = node.content || '';
    if (messageType === 'list' && !content && node.metadata && node.metadata.listDescription) {
      content = node.metadata.listDescription;
    }
    if (messageType === 'list' && !content) {
      content = 'Please select an option from the list below.';
    }

    console.log('DEBUG sendNodeMessage:', {
      nodeType: node.type,
      nodeMessageType,
      messageType,
      content,
      hasMetadata: !!node.metadata,
      metadataMessageType: node.metadata?.messageType
    });

    switch (messageType) {
      case 'text':
        sendResult = await conversationService.sendMessage({
          to: phoneNumber,
          businessId: businessId,
          messageType: 'text',
          content: content
        });
        break;

      case 'image':
        if (node.metadata && node.metadata.mediaId) {
          sendResult = await conversationService.sendMessage({
            to: phoneNumber,
            businessId: businessId,
            messageType: 'image',
            mediaId: node.metadata.mediaId,
            caption: content
          });
        } else if (node.metadata && node.metadata.imageUrl) {
          sendResult = await conversationService.sendMessage({
            to: phoneNumber,
            businessId: businessId,
            messageType: 'text',
            content: `${content}\n[Image: ${node.metadata.imageUrl}]`
          });
        } else {
          sendResult = await conversationService.sendMessage({
            to: phoneNumber,
            businessId: businessId,
            messageType: 'text',
            content: content
          });
        }
        break;

      case 'video':
        if (node.metadata && node.metadata.mediaId) {
          sendResult = await conversationService.sendMessage({
            to: phoneNumber,
            businessId: businessId,
            messageType: 'video',
            mediaId: node.metadata.mediaId,
            caption: content
          });
        } else if (node.metadata && node.metadata.videoUrl) {
          sendResult = await conversationService.sendMessage({
            to: phoneNumber,
            businessId: businessId,
            messageType: 'text',
            content: `${content}\n[Video: ${node.metadata.videoUrl}]`
          });
        } else {
          sendResult = await conversationService.sendMessage({
            to: phoneNumber,
            businessId: businessId,
            messageType: 'text',
            content: content
          });
        }
        break;

      case 'document':
        if (node.metadata && node.metadata.mediaId) {
          sendResult = await conversationService.sendMessage({
            to: phoneNumber,
            businessId: businessId,
            messageType: 'document',
            mediaId: node.metadata.mediaId,
            filename: node.metadata.mediaFilename,
            caption: content
          });
        } else if (node.metadata && node.metadata.documentUrl) {
          sendResult = await conversationService.sendMessage({
            to: phoneNumber,
            businessId: businessId,
            messageType: 'text',
            content: `${content}\n[Document: ${node.metadata.documentUrl}]`
          });
        } else {
          sendResult = await conversationService.sendMessage({
            to: phoneNumber,
            businessId: businessId,
            messageType: 'text',
            content: content
          });
        }
        break;

      case 'buttons':
        // Send as proper WhatsApp interactive buttons
        // IMPORTANT: WhatsApp Cloud API interactive messages ONLY support reply buttons (up to 3)
        // Call and URL buttons are ONLY available in template messages, NOT in interactive messages
        // Reference: https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages/
        if (node.metadata && node.metadata.buttons && Array.isArray(node.metadata.buttons)) {
          // Helper to truncate button title to 20 chars (WhatsApp limit)
          const truncateTitle = (title) => {
            if (!title) return '';
            return title.length > 20 ? title.substring(0, 20) : title;
          };

          // Filter out CTA buttons (call/URL) - these are not supported in interactive messages
          const replyButtons = node.metadata.buttons.filter(btn => 
            !btn.type || btn.type === 'reply'
          );

          // Check if there were any CTA buttons that will be ignored
          const ctaButtons = node.metadata.buttons.filter(btn => 
            (btn.type === 'call' || btn.type === 'phone_number' || btn.type === 'url')
          );

          if (ctaButtons.length > 0) {
            console.warn(`Warning: Call/URL buttons are not supported in interactive messages. Only ${replyButtons.length} reply button(s) will be sent.`);
            console.warn(`CTA buttons require template messages. Ignoring ${ctaButtons.length} CTA button(s).`);
          }

          if (replyButtons.length > 0) {
            // Limit to 3 reply buttons (WhatsApp limit)
            const buttonsToSend = replyButtons.slice(0, 3).map((button, index) => {
              const buttonId = `${node.id}_${(button.title || '').toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}_${index}`;
              return {
                type: 'reply',
                reply: {
                  id: buttonId,
                  title: truncateTitle(button.title)
                }
              };
            });

            const interactivePayload = {
              type: 'button',
              body: {
                text: content
              },
              action: {
                buttons: buttonsToSend
              }
            };

            try {
              sendResult = await conversationService.sendMessage({
                to: phoneNumber,
                businessId: businessId,
                messageType: 'buttons',
                content: content,
                interactive: interactivePayload
              });
            } catch (error) {
              console.error('Error sending interactive buttons:', error.response?.data || error.message);
              throw error;
            }
          } else {
            // No reply buttons available, send as text
            console.warn('No valid reply buttons found, sending as text message');
            sendResult = await conversationService.sendMessage({
              to: phoneNumber,
              businessId: businessId,
              messageType: 'text',
              content: content || 'Please select an option.'
            });
          }
        } else {
          sendResult = await conversationService.sendMessage({
            to: phoneNumber,
            businessId: businessId,
            messageType: 'text',
            content: content
          });
        }
        break;

      case 'list':
        // Send as proper WhatsApp interactive list
        // Check for listItems (from frontend) or sections (from legacy/imported data)
        if (node.metadata && ((node.metadata.listItems && Array.isArray(node.metadata.listItems)) || 
            (node.metadata.sections && Array.isArray(node.metadata.sections)))) {
          let sections = [];
          
          // Convert listItems to sections format if needed
          if (node.metadata.listItems && Array.isArray(node.metadata.listItems) && node.metadata.listItems.length > 0) {
            sections = [{
              title: node.metadata.listTitle || node.metadata.listDescription || 'Options',
              rows: node.metadata.listItems
                .filter(item => item.title && item.title.trim()) // Filter out empty items
                .map(item => ({
                  id: `${node.id}_${(item.title || '').toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}`,
                  title: item.title,
                  description: item.description || ''
                }))
            }];
          } else if (node.metadata.sections && Array.isArray(node.metadata.sections)) {
            // Use existing sections format
            sections = node.metadata.sections.map(section => ({
              title: section.title,
              rows: section.rows.map(row => ({
                id: `${node.id}_${(row.title || '').toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}`,
                title: row.title,
                description: row.description || ''
              }))
            }));
          }

          // Only send if we have valid sections with rows
          if (sections.length > 0 && sections[0].rows && sections[0].rows.length > 0) {
            sendResult = await conversationService.sendMessage({
              to: phoneNumber,
              businessId: businessId,
              messageType: 'list',
              content: content,
              interactive: {
                type: 'list',
                body: {
                  text: content
                },
                action: {
                  button: node.metadata.listTitle || node.metadata.listDescription || 'Choose option',
                  sections: sections
                }
              }
            });
          } else {
            console.warn('List message has no valid items, sending as text instead');
            sendResult = await conversationService.sendMessage({
              to: phoneNumber,
              businessId: businessId,
              messageType: 'text',
              content: content || 'Please select an option.'
            });
          }
        } else {
          console.warn('List message node missing listItems or sections, sending as text');
          sendResult = await conversationService.sendMessage({
            to: phoneNumber,
            businessId: businessId,
            messageType: 'text',
            content: content || 'Please select an option.'
          });
        }
        break;

      default:
        console.log(`Unknown message type: ${messageType}, sending as text`);
        sendResult = await conversationService.sendMessage({
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

    console.log('DEBUG storing in database:', {
      messageType,
      isButtonsOrList: (messageType === 'buttons' || messageType === 'list'),
      finalMessageType: (messageType === 'buttons' || messageType === 'list') ? 'interactive' : messageType,
      content
    });

    await conversationService.addMessageToConversation({
      conversationId: conversation.id,
      direction: 'outbound',
      messageType: (messageType === 'buttons' || messageType === 'list') ? 'interactive' : messageType, // Store buttons/list as 'interactive' type, keep others as-is
      content: content,
      mediaUrl: node.metadata && (node.metadata.imageUrl || node.metadata.videoUrl || node.metadata.documentUrl) || null,
      mediaFilename: node.metadata && node.metadata.mediaFilename || null,
      isBot: true,
      interactive: (messageType === 'buttons' || messageType === 'list') ? {
        type: messageType === 'buttons' ? 'button' : 'list',
        content: content,
        data: messageType === 'buttons' ? node.metadata.buttons : 
              (messageType === 'list' && node.metadata.listItems ? interactiveData.data : node.metadata.sections)
      } : null,
      whatsappMessageId: sendResult.messageId // Store the WhatsApp message ID
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