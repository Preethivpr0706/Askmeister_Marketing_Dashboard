const flowModel = require('../models/flowModel');
const { validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const WhatsappConfigService = require('../services/WhatsappConfigService');

/**
 * Validate WhatsApp Flow structure
 * @param {Object} flowData - Flow data to validate
 * @returns {Object} Validation result
 */
function validateWhatsAppFlow(flowData) {
  const errors = [];
  
  if (!flowData) {
    errors.push('Flow data is required');
    return { isValid: false, errors };
  }
  
  if (!flowData.screens || !Array.isArray(flowData.screens)) {
    errors.push('Flow must contain screens array');
    return { isValid: false, errors };
  }
  
  if (flowData.screens.length === 0) {
    errors.push('Flow must have at least one screen');
    return { isValid: false, errors };
  }
  
  // Validate each screen
  flowData.screens.forEach((screen, index) => {
    if (!screen.id) {
      errors.push(`Screen ${index + 1} must have an ID`);
    }
    
    if (!screen.name) {
      errors.push(`Screen ${index + 1} must have a name`);
    }
    
    if (!screen.components || !Array.isArray(screen.components)) {
      errors.push(`Screen ${index + 1} must have components array`);
    }
    
    // Validate components
    if (screen.components) {
      screen.components.forEach((component, compIndex) => {
        if (!component.id) {
          errors.push(`Screen ${index + 1}, Component ${compIndex + 1} must have an ID`);
        }
        
        if (!component.type) {
          errors.push(`Screen ${index + 1}, Component ${compIndex + 1} must have a type`);
        }
        
        // Validate specific component types
        switch (component.type) {
          case 'form':
            if (!component.fields || !Array.isArray(component.fields)) {
              errors.push(`Screen ${index + 1}, Form component must have fields array`);
            }
            break;
          case 'list':
            if (!component.options || !Array.isArray(component.options)) {
              errors.push(`Screen ${index + 1}, List component must have options array`);
            }
            break;
        }
      });
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Flow Controller
 * Handles all flow-related operations including CRUD, validation, and WhatsApp API integration
 */
class FlowController {
  
  /**
   * Create a new flow
   * POST /api/flows
   */
  async createFlow(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const {
        name,
        description,
        version = '1.0.0',
        category = 'utility',
        language = 'en_US',
        flow_data = {}
      } = req.body;

      const business_id = req.user.businessId;
      const created_by = req.user.id;

      // Validate flow data structure
      const validation = await flowModel.validateFlow(flow_data);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid flow structure',
          errors: validation.errors,
          warnings: validation.warnings
        });
      }

      const flow = await flowModel.createFlow({
        business_id,
        name,
        description,
        version,
        category,
        language,
        flow_data,
        created_by
      });

      res.status(201).json({
        success: true,
        message: 'Flow created successfully',
        data: flow
      });

    } catch (error) {
      console.error('Error creating flow:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create flow',
        error: error.message
      });
    }
  }

  /**
   * Get all flows for a business
   * GET /api/flows
   */
  async getFlows(req, res) {
    try {
      const business_id = req.user.businessId;
      const { status, category, search, page = 1, limit = 10 } = req.query;

      const filters = {};
      if (status) filters.status = status;
      if (category) filters.category = category;
      if (search) filters.search = search;

      const flows = await flowModel.getFlowsByBusiness(business_id, filters);

      // Simple pagination
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      const paginatedFlows = flows.slice(startIndex, endIndex);

      res.json({
        success: true,
        data: paginatedFlows,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(flows.length / limit),
          total_items: flows.length,
          items_per_page: parseInt(limit)
        }
      });

    } catch (error) {
      console.error('Error fetching flows:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch flows',
        error: error.message
      });
    }
  }

  /**
   * Get a specific flow by ID
   * GET /api/flows/:id
   */
  async getFlowById(req, res) {
    try {
      const { id } = req.params;
      const business_id = req.user.businessId;

      const flow = await flowModel.getFlowById(id);
      
      if (!flow) {
        return res.status(404).json({
          success: false,
          message: 'Flow not found'
        });
      }

      // Check if user has access to this flow
      if (flow.business_id !== business_id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      res.json({
        success: true,
        data: flow
      });

    } catch (error) {
      console.error('Error fetching flow:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch flow',
        error: error.message
      });
    }
  }

  /**
   * Update a flow
   * PUT /api/flows/:id
   */
  async updateFlow(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const business_id = req.user.businessId;
      const updateData = req.body;

      // Check if flow exists and user has access
      const existingFlow = await flowModel.getFlowById(id);
      if (!existingFlow) {
        return res.status(404).json({
          success: false,
          message: 'Flow not found'
        });
      }

      if (existingFlow.business_id !== business_id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Validate flow data if provided
      if (updateData.flow_data) {
        const validation = await flowModel.validateFlow(updateData.flow_data);
        if (!validation.isValid) {
          return res.status(400).json({
            success: false,
            message: 'Invalid flow structure',
            errors: validation.errors,
            warnings: validation.warnings
          });
        }
      }

      const updatedFlow = await flowModel.updateFlow(id, updateData);

      res.json({
        success: true,
        message: 'Flow updated successfully',
        data: updatedFlow
      });

    } catch (error) {
      console.error('Error updating flow:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update flow',
        error: error.message
      });
    }
  }

  /**
   * Delete a flow
   * DELETE /api/flows/:id
   */
  async deleteFlow(req, res) {
    try {
      const { id } = req.params;
      const business_id = req.user.businessId;

      // Check if flow exists and user has access
      const existingFlow = await flowModel.getFlowById(id);
      if (!existingFlow) {
        return res.status(404).json({
          success: false,
          message: 'Flow not found'
        });
      }

      if (existingFlow.business_id !== business_id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      await flowModel.deleteFlow(id);

      res.json({
        success: true,
        message: 'Flow deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting flow:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete flow',
        error: error.message
      });
    }
  }

  /**
   * Duplicate a flow
   * POST /api/flows/:id/duplicate
   */
  async duplicateFlow(req, res) {
    try {
      const { id } = req.params;
      const { name } = req.body;
      const business_id = req.user.businessId;
      const created_by = req.user.id;

      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Flow name is required for duplication'
        });
      }

      // Check if original flow exists and user has access
      const originalFlow = await flowModel.getFlowById(id);
      if (!originalFlow) {
        return res.status(404).json({
          success: false,
          message: 'Original flow not found'
        });
      }

      if (originalFlow.business_id !== business_id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const duplicatedFlow = await flowModel.duplicateFlow(id, name, created_by);

      res.status(201).json({
        success: true,
        message: 'Flow duplicated successfully',
        data: duplicatedFlow
      });

    } catch (error) {
      console.error('Error duplicating flow:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to duplicate flow',
        error: error.message
      });
    }
  }

  /**
   * Save flow structure (nodes and edges)
   * POST /api/flows/:id/structure
   */
  async saveFlowStructure(req, res) {
    try {
      const { id } = req.params;
      const { nodes, edges } = req.body;
      const business_id = req.user.businessId;

      // Check if flow exists and user has access
      const existingFlow = await flowModel.getFlowById(id);
      if (!existingFlow) {
        return res.status(404).json({
          success: false,
          message: 'Flow not found'
        });
      }

      if (existingFlow.business_id !== business_id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Validate structure
      const validation = await flowModel.validateFlow({ nodes, edges });
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid flow structure',
          errors: validation.errors,
          warnings: validation.warnings
        });
      }

      await flowModel.saveFlowStructure(id, nodes, edges);

      res.json({
        success: true,
        message: 'Flow structure saved successfully'
      });

    } catch (error) {
      console.error('Error saving flow structure:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to save flow structure',
        error: error.message
      });
    }
  }

  /**
   * Validate flow structure
   * POST /api/flows/validate
   */
  async validateFlow(req, res) {
    try {
      const { flow_data } = req.body;

      const validation = await flowModel.validateFlow(flow_data);

      res.json({
        success: true,
        data: validation
      });

    } catch (error) {
      console.error('Error validating flow:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to validate flow',
        error: error.message
      });
    }
  }

  /**
   * Publish flow to WhatsApp API
   * POST /api/flows/:id/publish
   */
  async publishFlow(req, res) {
    try {
      const { id } = req.params;
      const business_id = req.user.businessId;

      // Check if flow exists and user has access
      const flow = await flowModel.getFlowById(id);
      if (!flow) {
        return res.status(404).json({
          success: false,
          message: 'Flow not found'
        });
      }

      if (flow.business_id !== business_id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Validate flow before publishing
      const validation = await flowModel.validateFlow(flow.flow_data);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Cannot publish invalid flow',
          errors: validation.errors
        });
      }

      // Convert flow to WhatsApp Flow format
      const whatsappFlowData = FlowController.convertToWhatsAppFlowFormat(flow);

      // First create the flow, then publish it
      const createResult = await FlowController.createFlowInWhatsApp(whatsappFlowData, business_id);
      
      // Only publish if creation was successful and no validation errors
      if (!createResult.success) {
        throw new Error('Failed to create flow in WhatsApp');
      }
      
      const publishResult = await FlowController.publishFlowInWhatsApp(createResult.id, business_id);

      // Update flow with WhatsApp ID and status
      await flowModel.updateFlow(id, {
        whatsapp_flow_id: publishResult.id || publishResult.flow_id,
        whatsapp_status: publishResult.status || 'pending',
        status: (publishResult.status === 'approved' || publishResult.success) ? 'published' : 'pending'
      });

      res.json({
        success: true,
        message: 'Flow published successfully',
        data: {
          whatsapp_flow_id: publishResult.id || publishResult.flow_id,
          status: publishResult.status || 'pending',
          flow_id: id
        }
      });

    } catch (error) {
      console.error('Error publishing flow:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to publish flow',
        error: error.message
      });
    }
  }

  /**
   * Convert flow to WhatsApp Flow format
   * @param {Object} flow - Flow object
   * @returns {Object} WhatsApp Flow format
   */
  static convertToWhatsAppFlowFormat(flow) {
    // Handle both internal format (nodes/edges) and WhatsApp format (screens)
    if (flow.flow_data.screens) {
      // Convert frontend screens to proper WhatsApp Flow API v7.3 format
      const sanitizeId = (value) => String(value || '').replace(/[^a-zA-Z_]/g, '_');
      const generateUniqueId = (prefix = '') => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
        let result = prefix || '';
        const length = prefix ? 12 : 16;
        for (let i = 0; i < length; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
      };
      const coerceText = (value, fallback = 'Welcome') => {
        const text = (value ?? '').toString().trim();
        return text.length > 0 ? text : fallback;
      };

      // Generate unique screen IDs and track them
      const screenIdMap = new Map();
      const usedNames = new Set();
      
      // First pass: generate all screen IDs
      flow.flow_data.screens.forEach((screen, index) => {
        let screenId = generateUniqueId();
        while (screenIdMap.has(screenId)) {
          screenId = generateUniqueId();
        }
        screenIdMap.set(screen.id, screenId);
      });
      
      const screens = flow.flow_data.screens.map((screen, index) => {
        const isLastScreen = index === flow.flow_data.screens.length - 1;
        
        // Get the pre-generated screen ID
        const screenId = screenIdMap.get(screen.id);
        
        // Generate unique screen name - sanitize to remove numbers
        let baseName = sanitizeId(screen.name || `Screen`);
        let screenName = baseName;
        while (usedNames.has(screenName)) {
          screenName = `${baseName}_${generateUniqueId().substring(0, 4)}`;
        }
        usedNames.add(screenName);
        
        // Get the next screen ID from the map
        const nextScreenId = !isLastScreen ? screenIdMap.get(flow.flow_data.screens[index + 1]?.id) : null;
        const screenTitle = coerceText(screenName, `Screen`);

        console.log(`Processing screen ${screenId} (${screenName}) with ${screen.components?.length || 0} components:`, screen.components);
        
        const children = (screen.components || []).map((component, cIdx) => {
          const compType = component.type;
          
          console.log(`Converting component ${cIdx + 1}: ${compType}`, component);
          
          switch (compType) {
            case 'small_heading':
            case 'large_heading':
            case 'heading':
              return {
                type: 'TextHeading',
                text: coerceText(component.content || component.text, 'Heading')
              };
              
            case 'paragraph':
            case 'text':
            case 'body':
              return {
                type: 'TextBody',
                text: coerceText(component.content || component.text, 'Content')
              };
              
            case 'text_input': {
              const name = generateUniqueId('input_');
              return {
                type: 'TextInput',
                name,
                label: coerceText(component.label, name),
                'input-type': 'text',
                required: Boolean(component.required),
                'helper-text': component.helperText || undefined
              };
            }
            
            case 'number_input': {
              const name = generateUniqueId('number_');
              return {
                type: 'TextInput',
                name,
                label: coerceText(component.label, name),
                'input-type': 'number',
                required: Boolean(component.required),
                'helper-text': component.helperText || undefined
              };
            }
            
            case 'email_input': {
              const name = generateUniqueId('email_');
              return {
                type: 'TextInput',
                name,
                label: coerceText(component.label, name),
                'input-type': 'email',
                required: Boolean(component.required),
                'helper-text': component.helperText || undefined
              };
            }
            
            case 'phone_input': {
              const name = generateUniqueId('phone_');
              return {
                type: 'TextInput',
                name,
                label: coerceText(component.label, name),
                'input-type': 'phone',
                required: Boolean(component.required),
                'helper-text': component.helperText || undefined
              };
            }
            
            case 'date_input': {
              const name = generateUniqueId('date_');
              return {
                type: 'DatePicker',
                name,
                label: coerceText(component.label, name),
                required: Boolean(component.required),
                'helper-text': component.helperText || undefined
              };
            }
            
            case 'single_choice':
            case 'radio': {
              const name = generateUniqueId('choice_');
              const options = (component.options || []).map((opt) => ({
                id: sanitizeId(opt.id) || generateUniqueId('opt_'),
                title: coerceText(opt.text || opt.title || opt.label, `Option_${generateUniqueId().substring(0, 4)}`)
              }));
              return {
                type: 'RadioButtonsGroup',
                name,
                label: coerceText(component.question || component.label, name),
                required: Boolean(component.required),
                'data-source': options
              };
            }
            
            case 'multiple_choice':
            case 'checkbox': {
              const name = generateUniqueId('multi_');
              const options = (component.options || []).map((opt) => ({
                id: sanitizeId(opt.id) || generateUniqueId('opt_'),
                title: coerceText(opt.text || opt.title || opt.label, `Option_${generateUniqueId().substring(0, 4)}`)
              }));
              return {
                type: 'CheckboxGroup',
                name,
                label: coerceText(component.question || component.label, name),
                required: Boolean(component.required),
                'data-source': options
              };
            }
            
            case 'button': {
              // Footer with context-aware action: navigate or complete
              return {
                type: 'Footer',
                label: coerceText(component.text || component.label, isLastScreen ? 'Finish' : 'Continue'),
                enabled: Boolean(component.enabled !== false),
                'on-click-action': isLastScreen ? {
                  name: 'complete',
                  payload: {}
                } : {
                  name: 'navigate',
                  next: {
                    type: 'screen',
                    name: nextScreenId
                  }
                }
              };
            }
            
            default:
              console.warn(`Unknown component type: ${compType}, converting to TextBody`);
              return {
                type: 'TextBody',
                text: coerceText(component.content || component.text || component.label || component.question, 'Content')
              };
          }
        });

        // Ensure at least a body exists
        if (children.length === 0) {
          children.push({ type: 'TextBody', text: 'Welcome' });
        }

        // Ensure connectivity: inject Footer if no Footer present
        const hasFooter = children.some(ch => ch.type === 'Footer');
        if (!hasFooter) {
          children.push({
            type: 'Footer',
            label: isLastScreen ? 'Finish' : 'Continue',
            enabled: true,
            'on-click-action': isLastScreen ? {
              name: 'complete',
              payload: {}
            } : {
              name: 'navigate',
              next: {
                type: 'screen',
                name: nextScreenId
              }
            }
          });
        }

        console.log(`Final children array for ${screenId}:`, children);
        
        const screenObj = {
          id: screenId,
          title: screenTitle,
          terminal: isLastScreen,
          layout: {
            type: 'SingleColumnLayout',
            children
          }
        };

        if (isLastScreen) {
          screenObj.success = true;
        }

        console.log(`Built screen object for ${screenId}:`, screenObj);
        return screenObj;
      });

      return {
        id: flow.id,
        name: flow.name,
        version: flow.version,
        category: flow.category,
        language: flow.language,
        screens: screens
      };
    } else if (flow.flow_data.nodes) {
      // Convert from internal nodes/edges format to WhatsApp screens format
      const screens = [];
      
      // Group nodes by screen type or create individual screens
      flow.flow_data.nodes.forEach(node => {
        const screen = {
          id: node.id,
          name: node.title || node.type,
          type: node.type,
          title: node.title || '',
          content: node.content || '',
          components: []
        };

        // Convert node to WhatsApp components based on type
        switch (node.type) {
          case 'screen':
            screen.components.push({
              id: `${node.id}_body`,
              type: 'body',
              text: node.content || ''
            });
            break;
          case 'form':
            screen.components.push({
              id: `${node.id}_form`,
              type: 'form',
              fields: node.properties?.fields || []
            });
            break;
          case 'list_picker':
            screen.components.push({
              id: `${node.id}_list`,
              type: 'single_choice',
              options: node.properties?.options || []
            });
            break;
          case 'confirmation':
            screen.components.push({
              id: `${node.id}_confirm`,
              type: 'single_choice',
              options: [
                { id: 'yes', title: 'Yes' },
                { id: 'no', title: 'No' }
              ]
            });
            break;
          default:
            screen.components.push({
              id: `${node.id}_content`,
              type: 'body',
              text: node.content || ''
            });
        }

        screens.push(screen);
      });

      return {
        id: flow.id,
        name: flow.name,
        version: flow.version,
        category: flow.category,
        language: flow.language,
        screens: screens
      };
    } else {
      // Fallback for empty or invalid flow data
      return {
        id: flow.id,
        name: flow.name,
        version: flow.version,
        category: flow.category,
        language: flow.language,
        screens: [{
          id: 'start',
          name: 'Start',
          type: 'screen',
          title: 'Welcome',
          content: 'Welcome to the flow',
          components: [{
            id: 'welcome_body',
            type: 'body',
            text: 'Welcome to the flow'
          }]
        }]
      };
    }
  }

  /**
   * Send test flow to WhatsApp API
   * @param {Object} whatsappFlowData - Flow data in WhatsApp format
   * @param {string} phoneNumber - Test phone number
   * @param {string} businessId - Business ID
   * @param {string} whatsappFlowId - Published WhatsApp Flow ID
   * @returns {Promise<Object>} Test result
   */
  static async sendTestFlowToWhatsApp(whatsappFlowData, phoneNumber, businessId, whatsappFlowId) {
    try {
      // Get business configuration
      const businessConfig = await WhatsappConfigService.getConfigForUser(businessId);
      
      if (!businessConfig) {
        throw new Error('Business configuration not found');
      }

      const whatsappApiUrl = 'https://graph.facebook.com/v21.0';
      const whatsappApiToken = businessConfig.whatsapp_api_token;
      const phoneNumberId = businessConfig.whatsapp_phone_number_id;

      if (!whatsappApiUrl || !whatsappApiToken || !phoneNumberId) {
        throw new Error('WhatsApp API configuration is missing');
      }

      // Prepare the interactive flow message payload
      const payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: phoneNumber,
        type: "interactive",
        interactive: {
          type: "flow",
          header: {
            type: "text",
            text: whatsappFlowData.name || "Test Flow"
          },
          body: {
            text: "This is a test of your published flow. Please interact with the flow below."
          },
          footer: {
            text: "Test Flow"
          },
          action: {
            name: "flow",
            parameters: {
              flow_message_version: "3",
              flow_token: "test123",
              flow_id: whatsappFlowId,
              flow_cta: "Test Flow",
              flow_action: "navigate",
              flow_action_payload: {
                screen: whatsappFlowData.screens?.[0]?.id || "START"
              }
            }
          }
        }
      };

      console.log('Sending test flow to WhatsApp:', JSON.stringify(payload, null, 2));

      const response = await axios.post(
        `${whatsappApiUrl}/${phoneNumberId}/messages`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${whatsappApiToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('WhatsApp test flow response:', response.data);

      return {
        message_id: response.data.messages?.[0]?.id || `test_${uuidv4()}`,
        status: 'sent',
        phone_number: phoneNumber,
        message: 'Test flow sent successfully',
        whatsapp_response: response.data,
        whatsapp_flow_id: whatsappFlowId
      };

    } catch (error) {
      console.error('Error sending test flow to WhatsApp:', error);
      throw new Error(`Failed to send test flow: ${error.message}`);
    }
  }

  /**
   * Test flow by sending to a test number
   * POST /api/flows/:id/test
   */
  async testFlow(req, res) {
    try {
      const { id } = req.params;
      const { phone_number } = req.body;
      const business_id = req.user.businessId;

      if (!phone_number) {
        return res.status(400).json({
          success: false,
          message: 'Phone number is required for testing'
        });
      }

      // Check if flow exists and user has access
      const flow = await flowModel.getFlowById(id);
      if (!flow) {
        return res.status(404).json({
          success: false,
          message: 'Flow not found'
        });
      }

      if (flow.business_id !== business_id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Validate flow before testing
      const validation = await flowModel.validateFlow(flow.flow_data);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Cannot test invalid flow',
          errors: validation.errors
        });
      }

      // Check if flow is published to WhatsApp
      if (!flow.whatsapp_flow_id) {
        return res.status(400).json({
          success: false,
          message: 'Flow must be published to WhatsApp before testing. Please publish the flow first.',
          error: 'FLOW_NOT_PUBLISHED'
        });
      }

      // Convert flow to WhatsApp Flow format and send test
      const whatsappFlowData = FlowController.convertToWhatsAppFlowFormat(flow);
      const testResult = await FlowController.sendTestFlowToWhatsApp(whatsappFlowData, phone_number, business_id, flow.whatsapp_flow_id);

      res.json({
        success: true,
        message: 'Test flow sent successfully',
        data: testResult
      });

    } catch (error) {
      console.error('Error testing flow:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to test flow',
        error: error.message
      });
    }
  }

  /**
   * Get flow analytics
   * GET /api/flows/:id/analytics
   */
  async getFlowAnalytics(req, res) {
    try {
      const { id } = req.params;
      const { start_date, end_date } = req.query;
      const business_id = req.user.businessId;

      // Check if flow exists and user has access
      const flow = await flowModel.getFlowById(id);
      if (!flow) {
        return res.status(404).json({
          success: false,
          message: 'Flow not found'
        });
      }

      if (flow.business_id !== business_id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const dateRange = {};
      if (start_date) dateRange.start = start_date;
      if (end_date) dateRange.end = end_date;

      const analytics = await flowModel.getFlowAnalytics(id, dateRange);

      res.json({
        success: true,
        data: analytics
      });

    } catch (error) {
      console.error('Error fetching flow analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch flow analytics',
        error: error.message
      });
    }
  }

  /**
   * Get flow in WhatsApp format for debugging
   * GET /api/flows/:id/whatsapp-format
   */
  async getFlowWhatsAppFormat(req, res) {
    try {
      const { id } = req.params;
      const business_id = req.user.businessId;

      // Check if flow exists and user has access
      const flow = await flowModel.getFlowById(id);
      if (!flow) {
        return res.status(404).json({
          success: false,
          message: 'Flow not found'
        });
      }

      if (flow.business_id !== business_id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Convert flow to WhatsApp Flow format
      const whatsappFlowData = FlowController.convertToWhatsAppFlowFormat(flow);

      res.json({
        success: true,
        data: {
          original_flow: flow,
          whatsapp_format: whatsappFlowData,
          transformation_log: 'Check server logs for detailed transformation information'
        }
      });

    } catch (error) {
      console.error('Error getting flow WhatsApp format:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get flow WhatsApp format',
        error: error.message
      });
    }
  }

  /**
   * Export flow as JSON
   * GET /api/flows/:id/export
   */
  async exportFlow(req, res) {
    try {
      const { id } = req.params;
      const business_id = req.user.businessId;

      // Check if flow exists and user has access
      const flow = await flowModel.getFlowById(id);
      if (!flow) {
        return res.status(404).json({
          success: false,
          message: 'Flow not found'
        });
      }

      if (flow.business_id !== business_id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Prepare export data
      const exportData = {
        name: flow.name,
        description: flow.description,
        version: flow.version,
        category: flow.category,
        language: flow.language,
        flow_data: flow.flow_data,
        exported_at: new Date().toISOString(),
        exported_by: req.user.email
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${flow.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_flow.json"`);
      res.json(exportData);

    } catch (error) {
      console.error('Error exporting flow:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export flow',
        error: error.message
      });
    }
  }

  /**
   * Import flow from JSON
   * POST /api/flows/import
   */
  async importFlow(req, res) {
    try {
      const { flow_data, name } = req.body;
      const business_id = req.user.businessId;
      const created_by = req.user.id;

      if (!flow_data) {
        return res.status(400).json({
          success: false,
          message: 'Flow data is required for import'
        });
      }

      // Validate imported flow data
      console.log('Import flow_data:', JSON.stringify(flow_data, null, 2));
      const validation = await flowModel.validateFlow(flow_data);
      console.log('Validation result:', validation);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid flow data for import',
          errors: validation.errors
        });
      }

      const importFlowData = {
        business_id,
        name: name || flow_data.name || 'Imported Flow',
        description: flow_data.description || 'Imported from JSON',
        version: flow_data.version || '1.0.0',
        category: flow_data.category || 'utility',
        language: flow_data.language || 'en_US',
        flow_data: flow_data.flow_data || flow_data,
        created_by
      };

      const importedFlow = await flowModel.createFlow(importFlowData);

      res.status(201).json({
        success: true,
        message: 'Flow imported successfully',
        data: importedFlow
      });

    } catch (error) {
      console.error('Error importing flow:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to import flow',
        error: error.message
      });
    }
  }


  /**
   * Create flow in WhatsApp API (puts it in DRAFT status)
   * @param {Object} flowData - Flow data in WhatsApp format
   * @param {string} businessId - Business ID
   * @returns {Promise<Object>} Create result
   */
  static async createFlowInWhatsApp(flowData, businessId) {
    try {
      // Get business configuration
      const businessConfig = await WhatsappConfigService.getConfigForUser(businessId);
      
      if (!businessConfig) {
        throw new Error('Business configuration not found');
      }

      const whatsappApiUrl = 'https://graph.facebook.com/v21.0';
      const whatsappApiToken = businessConfig.whatsapp_api_token;
      const businessAccountId = businessConfig.whatsapp_business_account_id;

      if (!whatsappApiToken || !businessAccountId) {
        throw new Error('WhatsApp API configuration is missing');
      }

      // Use the proper WhatsApp Flow API v7.3 format
      const sanitizeId = (value) => String(value || '').replace(/[^a-zA-Z_]/g, '_');
      const generateUniqueId = (prefix = '') => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
        let result = prefix || '';
        const length = prefix ? 12 : 16;
        for (let i = 0; i < length; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
      };
      const coerceText = (value, fallback = 'Welcome') => {
        const text = (value ?? '').toString().trim();
        return text.length > 0 ? text : fallback;
      };

      // Generate unique screen IDs and track them
      const screenIdMap = new Map();
      const usedNames = new Set();
      
      // First pass: generate all screen IDs
      flowData.screens.forEach((screen, index) => {
        let screenId = generateUniqueId();
        while (screenIdMap.has(screenId)) {
          screenId = generateUniqueId();
        }
        screenIdMap.set(screen.id, screenId);
      });
      
      const flowJsonStructure = {
        version: "7.3",
        screens: flowData.screens.map((screen, index) => {
          const isLastScreen = index === flowData.screens.length - 1;
          
          // Get the pre-generated screen ID
          const screenId = screenIdMap.get(screen.id);
          
          // Generate unique screen name - sanitize to remove numbers
          let baseName = sanitizeId(screen.name || `Screen`);
          let screenName = baseName;
          while (usedNames.has(screenName)) {
            screenName = `${baseName}_${generateUniqueId().substring(0, 4)}`;
          }
          usedNames.add(screenName);
          
          // Get the next screen ID from the map
          const nextScreenId = !isLastScreen ? screenIdMap.get(flowData.screens[index + 1]?.id) : null;
          const screenTitle = coerceText(screenName, `Screen`);

          console.log(`Processing screen ${screenId} (${screenName}) with ${screen.components?.length || 0} components:`, screen.components);
          
          const children = (screen.components || []).map((component, cIdx) => {
            const compType = component.type;
            
            console.log(`Converting component ${cIdx + 1}: ${compType}`, component);
            
            switch (compType) {
              case 'small_heading':
              case 'large_heading':
              case 'heading':
                return {
                  type: 'TextHeading',
                  text: coerceText(component.content || component.text, 'Heading')
                };
                
              case 'paragraph':
              case 'text':
              case 'body':
                return {
                  type: 'TextBody',
                  text: coerceText(component.content || component.text, 'Content')
                };
                
              case 'text_input': {
                const name = generateUniqueId('input_');
                return {
                  type: 'TextInput',
                  name,
                  label: coerceText(component.label, name),
                  'input-type': 'text',
                  required: Boolean(component.required),
                  'helper-text': component.helperText || undefined
                };
              }
              
              case 'number_input': {
                const name = generateUniqueId('number_');
                return {
                  type: 'TextInput',
                  name,
                  label: coerceText(component.label, name),
                  'input-type': 'number',
                  required: Boolean(component.required),
                  'helper-text': component.helperText || undefined
                };
              }
              
              case 'email_input': {
                const name = generateUniqueId('email_');
                return {
                  type: 'TextInput',
                  name,
                  label: coerceText(component.label, name),
                  'input-type': 'email',
                  required: Boolean(component.required),
                  'helper-text': component.helperText || undefined
                };
              }
              
              case 'phone_input': {
                const name = generateUniqueId('phone_');
                return {
                  type: 'TextInput',
                  name,
                  label: coerceText(component.label, name),
                  'input-type': 'phone',
                  required: Boolean(component.required),
                  'helper-text': component.helperText || undefined
                };
              }
              
              case 'date_input': {
                const name = generateUniqueId('date_');
                return {
                  type: 'DatePicker',
                  name,
                  label: coerceText(component.label, name),
                  required: Boolean(component.required),
                  'helper-text': component.helperText || undefined
                };
              }
              
              case 'single_choice':
              case 'radio': {
                const name = generateUniqueId('choice_');
                const options = (component.options || []).map((opt, oIdx) => ({
                  id: sanitizeId(opt.id) || generateUniqueId('opt_'),
                  title: coerceText(opt.text || opt.title || opt.label, `Option_${generateUniqueId().substring(0, 4)}`)
                }));
                return {
                  type: 'RadioButtonsGroup',
                  name,
                  label: coerceText(component.question || component.label, name),
                  required: Boolean(component.required),
                  'data-source': options
                };
              }
              
              case 'multiple_choice':
              case 'checkbox': {
                const name = generateUniqueId('multi_');
                const options = (component.options || []).map((opt, oIdx) => ({
                  id: sanitizeId(opt.id) || generateUniqueId('opt_'),
                  title: coerceText(opt.text || opt.title || opt.label, `Option_${generateUniqueId().substring(0, 4)}`)
                }));
                return {
                  type: 'CheckboxGroup',
                  name,
                  label: coerceText(component.question || component.label, name),
                  required: Boolean(component.required),
                  'data-source': options
                };
              }
              
              case 'button': {
                // Footer with context-aware action: navigate or complete
                return {
                  type: 'Footer',
                  label: coerceText(component.text || component.label, isLastScreen ? 'Finish' : 'Continue'),
                  enabled: Boolean(component.enabled !== false),
                  'on-click-action': isLastScreen ? {
                    name: 'complete',
                    payload: {}
                  } : {
                    name: 'navigate',
                    next: {
                      type: 'screen',
                      name: nextScreenId
                    }
                  }
                };
              }
              
              default:
                return {
                  type: 'TextBody',
                  text: coerceText(component.content || component.text, 'Content')
                };
            }
          });

          // Ensure at least a body exists
          if (children.length === 0) {
            children.push({ type: 'TextBody', text: 'Welcome' });
          }

          // Ensure connectivity: inject Footer if no Footer present
          const hasFooter = children.some(ch => ch.type === 'Footer');
          if (!hasFooter) {
            children.push({
              type: 'Footer',
              label: isLastScreen ? 'Finish' : 'Continue',
              enabled: true,
              'on-click-action': isLastScreen ? {
                name: 'complete',
                payload: {}
              } : {
                name: 'navigate',
                next: {
                  type: 'screen',
                  name: nextScreenId
                }
              }
            });
          }

          console.log(`Final children array for ${screenId}:`, children);
          
          const screenObj = {
            id: screenId,
            title: screenTitle,
            terminal: isLastScreen,
            layout: {
              type: 'SingleColumnLayout',
              children
            }
          };

          if (isLastScreen) {
            screenObj.success = true;
          }

          console.log(`Built screen object for ${screenId}:`, screenObj);
          return screenObj;
        })
      };

      // Prepare the payload according to WhatsApp API documentation
      const payload = {
        name: flowData.name,
        categories: [flowData.category || 'OTHER'],
        flow_json: JSON.stringify(flowJsonStructure),
        publish: false // Create as draft first, then publish separately
      };

      console.log('Creating flow in WhatsApp with category:', flowData.category);
      console.log('Full payload:', JSON.stringify(payload, null, 2));
      console.log('Flow JSON structure:', JSON.stringify(flowJsonStructure, null, 2));

      const response = await axios.post(
        `${whatsappApiUrl}/${businessAccountId}/flows`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${whatsappApiToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('WhatsApp flow create response:', response.data);

      // Check for validation errors
      if (response.data.validation_errors && response.data.validation_errors.length > 0) {
        console.error('Flow validation errors:', response.data.validation_errors);
        console.error('Flow JSON that caused errors:', JSON.stringify(flowJsonStructure, null, 2));
        const codes = response.data.validation_errors.map(e => e.code).filter(Boolean).join(', ');
        const messages = response.data.validation_errors.map(e => e.message).join('; ');
        const details = response.data.validation_errors.map(e => JSON.stringify(e.details || {})).join(' | ');
        const combined = [messages, codes && `(codes: ${codes})`, details && `(details: ${details})`].filter(Boolean).join(' ');
        throw new Error(`Flow validation failed: ${combined}`);
      }

      return response.data;

    } catch (error) {
      console.error('Error creating flow in WhatsApp:', error);
      if (error.response && error.response.data) {
        console.error('WhatsApp API Error Response:', JSON.stringify(error.response.data, null, 2));
        const waErr = error.response.data;
        const waCode = waErr.error?.code || waErr.code;
        const waMsg = waErr.error?.message || waErr.message;
        const waErrs = waErr.validation_errors;
        if (waErrs && waErrs.length) {
          const codes = waErrs.map(e => e.code).filter(Boolean).join(', ');
          const messages = waErrs.map(e => e.message).join('; ');
          throw new Error(`Failed to create flow: ${messages}${codes ? ` (codes: ${codes})` : ''}`);
        }
        if (waMsg || waCode) {
          throw new Error(`Failed to create flow: ${waMsg || 'Unknown error'}${waCode ? ` (code: ${waCode})` : ''}`);
        }
      }
      throw new Error(`Failed to create flow: ${error.message}`);
    }
  }

  /**
   * Publish flow in WhatsApp API (changes status from DRAFT to PUBLISHED)
   * @param {string} flowId - WhatsApp Flow ID
   * @param {string} businessId - Business ID
   * @returns {Promise<Object>} Publish result
   */
  static async publishFlowInWhatsApp(flowId, businessId) {
    try {
      // Get business configuration
      const businessConfig = await WhatsappConfigService.getConfigForUser(businessId);
      
      if (!businessConfig) {
        throw new Error('Business configuration not found');
      }

      const whatsappApiUrl = 'https://graph.facebook.com/v21.0';
      const whatsappApiToken = businessConfig.whatsapp_api_token;

      if (!whatsappApiToken) {
        throw new Error('WhatsApp API configuration is missing');
      }

      console.log('Publishing flow in WhatsApp:', flowId);

      const response = await axios.post(
        `${whatsappApiUrl}/${flowId}/publish`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${whatsappApiToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('WhatsApp flow publish response:', response.data);

      return {
        id: flowId,
        status: 'published',
        success: true
      };

    } catch (error) {
      console.error('Error publishing flow in WhatsApp:', error);
      throw new Error(`Failed to publish flow: ${error.message}`);
    }
  }

}

module.exports = new FlowController();