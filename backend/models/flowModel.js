const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'whatsapp_templates',
  charset: 'utf8mb4'
};

class FlowModel {
  constructor() {
    this.pool = mysql.createPool(dbConfig);
  }

  /**
   * Create a new flow
   * @param {Object} flowData - Flow data including name, description, business_id, etc.
   * @returns {Promise<Object>} Created flow object
   */
  async createFlow(flowData) {
    const connection = await this.pool.getConnection();
    try {
      const {
        business_id,
        name,
        description = '',
        version = '1.0.0',
        category = 'utility',
        language = 'en_US',
        flow_data = {},
        created_by
      } = flowData;

      const id = uuidv4();
      
      // Ensure flow_data is properly stringified
      const flowDataString = typeof flow_data === 'string' 
        ? flow_data 
        : JSON.stringify(flow_data);
      
      await connection.execute(
        `INSERT INTO flows (id, business_id, name, description, version, category, language, flow_data, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, business_id, name, description, version, category, language, flowDataString, created_by]
      );

      // Create initial version
      await this.createFlowVersion(connection, {
        flow_id: id,
        version_number: version,
        flow_data: typeof flow_data === 'string' ? JSON.parse(flow_data) : flow_data,
        change_log: 'Initial version',
        is_current: true,
        created_by
      });

      return await this.getFlowById(id);
    } finally {
      connection.release();
    }
  }

  /**
   * Get flow by ID
   * @param {string} flowId - Flow ID
   * @returns {Promise<Object|null>} Flow object or null
   */
  async getFlowById(flowId) {
    const connection = await this.pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT f.*, b.name as business_name 
         FROM flows f 
         LEFT JOIN businesses b ON f.business_id = b.id 
         WHERE f.id = ?`,
        [flowId]
      );

      if (rows.length === 0) return null;

      const flow = rows[0];
      
      // Safe JSON parsing with error handling
      try {
        flow.flow_data = typeof flow.flow_data === 'string' 
          ? JSON.parse(flow.flow_data) 
          : (flow.flow_data || {});
      } catch (parseError) {
        console.error('Error parsing flow_data:', parseError, 'Raw data:', flow.flow_data);
        flow.flow_data = {};
      }
      
      // Get nodes and edges
      flow.nodes = await this.getFlowNodes(flowId);
      flow.edges = await this.getFlowEdges(flowId);

      return flow;
    } finally {
      connection.release();
    }
  }

  /**
   * Get all flows for a business
   * @param {string} businessId - Business ID
   * @param {Object} filters - Optional filters (status, category, search)
   * @returns {Promise<Array>} Array of flows
   */
  async getFlowsByBusiness(businessId, filters = {}) {
    const connection = await this.pool.getConnection();
    try {
      let query = `
        SELECT f.*, b.name as business_name,
               COUNT(fv.id) as version_count,
               fa.completion_rate
        FROM flows f 
        LEFT JOIN businesses b ON f.business_id = b.id
        LEFT JOIN flow_versions fv ON f.id = fv.flow_id
        LEFT JOIN (
          SELECT flow_id, 
                 ROUND(COUNT(CASE WHEN completion_status = 'completed' THEN 1 END) * 100.0 / COUNT(*), 2) as completion_rate
          FROM flow_analytics 
          GROUP BY flow_id
        ) fa ON f.id = fa.flow_id
        WHERE f.business_id = ?
      `;
      
      const params = [businessId];

      if (filters.status) {
        query += ' AND f.status = ?';
        params.push(filters.status);
      }

      if (filters.category) {
        query += ' AND f.category = ?';
        params.push(filters.category);
      }

      if (filters.search) {
        query += ' AND (f.name LIKE ? OR f.description LIKE ?)';
        params.push(`%${filters.search}%`, `%${filters.search}%`);
      }

      query += ' GROUP BY f.id ORDER BY f.updated_at DESC';

      const [rows] = await connection.execute(query, params);
      
      return rows.map(flow => {
        try {
          return {
            ...flow,
            flow_data: typeof flow.flow_data === 'string' 
              ? JSON.parse(flow.flow_data) 
              : (flow.flow_data || {})
          };
        } catch (parseError) {
          console.error('Error parsing flow_data for flow:', flow.id, parseError);
          return {
            ...flow,
            flow_data: {}
          };
        }
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Update flow
   * @param {string} flowId - Flow ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated flow object
   */
  async updateFlow(flowId, updateData) {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();

      const allowedFields = ['name', 'description', 'version', 'category', 'language', 'status', 'flow_data'];
      const updateFields = [];
      const values = [];

      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key)) {
          updateFields.push(`${key} = ?`);
          if (key === 'flow_data') {
            values.push(typeof value === 'string' ? value : JSON.stringify(value));
          } else {
            values.push(value);
          }
        }
      }

      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }

      values.push(flowId);

      // Update the main flow record
      const [result] = await connection.execute(
        `UPDATE flows SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        values
      );

      if (result.affectedRows === 0) {
        throw new Error('Flow not found or no changes made');
      }

      // Only create new version if flow_data was actually updated and changed
      if (updateData.flow_data) {
        const currentFlow = await this.getFlowById(flowId);
        const newFlowData = typeof updateData.flow_data === 'string' 
          ? JSON.parse(updateData.flow_data) 
          : updateData.flow_data;
        
        // Check if flow_data actually changed
        const currentFlowDataString = typeof currentFlow.flow_data === 'string' 
          ? currentFlow.flow_data 
          : JSON.stringify(currentFlow.flow_data);
        const newFlowDataString = typeof newFlowData === 'string' 
          ? newFlowData 
          : JSON.stringify(newFlowData);
        
        if (currentFlowDataString !== newFlowDataString) {
          await this.createFlowVersion(connection, {
            flow_id: flowId,
            version_number: updateData.version || currentFlow.version,
            flow_data: newFlowData,
            change_log: 'Flow structure updated',
            is_current: true,
            created_by: currentFlow.created_by
          });
        }
      }

      await connection.commit();
      return await this.getFlowById(flowId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Delete flow
   * @param {string} flowId - Flow ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteFlow(flowId) {
    const connection = await this.pool.getConnection();
    try {
      await connection.execute('DELETE FROM flows WHERE id = ?', [flowId]);
      return true;
    } finally {
      connection.release();
    }
  }

  /**
   * Duplicate flow
   * @param {string} flowId - Original flow ID
   * @param {string} newName - New flow name
   * @param {string} createdBy - User creating the duplicate
   * @returns {Promise<Object>} New flow object
   */
  async duplicateFlow(flowId, newName, createdBy) {
    const connection = await this.pool.getConnection();
    try {
      const originalFlow = await this.getFlowById(flowId);
      if (!originalFlow) {
        throw new Error('Original flow not found');
      }

      const newFlowData = {
        business_id: originalFlow.business_id,
        name: newName,
        description: `${originalFlow.description} (Copy)`,
        version: '1.0.0',
        category: originalFlow.category,
        language: originalFlow.language,
        flow_data: originalFlow.flow_data,
        created_by: createdBy
      };

      return await this.createFlow(newFlowData);
    } finally {
      connection.release();
    }
  }

  /**
   * Get flow nodes
   * @param {string} flowId - Flow ID
   * @returns {Promise<Array>} Array of nodes
   */
  async getFlowNodes(flowId) {
    const connection = await this.pool.getConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM flow_nodes WHERE flow_id = ? ORDER BY created_at',
        [flowId]
      );

      return rows.map(node => {
        try {
          return {
            ...node,
            properties: typeof node.properties === 'string' 
              ? JSON.parse(node.properties) 
              : (node.properties || {}),
            validation_rules: typeof node.validation_rules === 'string' 
              ? JSON.parse(node.validation_rules) 
              : (node.validation_rules || {})
          };
        } catch (parseError) {
          console.error('Error parsing node data:', node.id, parseError);
          return {
            ...node,
            properties: {},
            validation_rules: {}
          };
        }
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Get flow edges
   * @param {string} flowId - Flow ID
   * @returns {Promise<Array>} Array of edges
   */
  async getFlowEdges(flowId) {
    const connection = await this.pool.getConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM flow_edges WHERE flow_id = ? ORDER BY created_at',
        [flowId]
      );

      return rows;
    } finally {
      connection.release();
    }
  }

  /**
   * Save flow nodes and edges
   * @param {string} flowId - Flow ID
   * @param {Array} nodes - Array of nodes
   * @param {Array} edges - Array of edges
   * @returns {Promise<boolean>} Success status
   */
  async saveFlowStructure(flowId, nodes, edges) {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();

      // Clear existing nodes and edges
      await connection.execute('DELETE FROM flow_edges WHERE flow_id = ?', [flowId]);
      await connection.execute('DELETE FROM flow_nodes WHERE flow_id = ?', [flowId]);

      // Insert new nodes
      for (const node of nodes) {
        await connection.execute(
          `INSERT INTO flow_nodes (id, flow_id, node_id, type, title, content, position_x, position_y, properties, validation_rules)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            uuidv4(),
            flowId,
            node.id,
            node.type,
            node.title || '',
            node.content || '',
            node.position?.x || 0,
            node.position?.y || 0,
            JSON.stringify(node.properties || {}),
            JSON.stringify(node.validation_rules || {})
          ]
        );
      }

      // Insert new edges
      for (const edge of edges) {
        await connection.execute(
          `INSERT INTO flow_edges (id, flow_id, source_node_id, target_node_id, edge_type, condition_value, button_text)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            uuidv4(),
            flowId,
            edge.source,
            edge.target,
            edge.type || 'default',
            edge.conditionValue || null,
            edge.buttonText || null
          ]
        );
      }

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Create flow version
   * @param {Object} connection - Database connection
   * @param {Object} versionData - Version data
   * @returns {Promise<Object>} Created version
   */
  async createFlowVersion(connection, versionData) {
    const {
      flow_id,
      version_number,
      flow_data,
      change_log,
      is_current,
      created_by
    } = versionData;

    // Mark all other versions as not current
    if (is_current) {
      await connection.execute(
        'UPDATE flow_versions SET is_current = FALSE WHERE flow_id = ?',
        [flow_id]
      );
    }

    // Check if a version with the same flow_id and version_number already exists
    const [existingVersions] = await connection.execute(
      'SELECT id FROM flow_versions WHERE flow_id = ? AND version_number = ?',
      [flow_id, version_number]
    );

    if (existingVersions.length > 0) {
      // Update existing version instead of creating a new one
      const existingId = existingVersions[0].id;
      const flowDataString = typeof flow_data === 'string' 
        ? flow_data 
        : JSON.stringify(flow_data);
      
      await connection.execute(
        `UPDATE flow_versions SET flow_data = ?, change_log = ?, is_current = ? WHERE id = ?`,
        [flowDataString, change_log, is_current, existingId]
      );
      
      return { id: existingId, flow_id, version_number, change_log, is_current };
    }

    const id = uuidv4();
    
    // Ensure flow_data is properly stringified
    const flowDataString = typeof flow_data === 'string' 
      ? flow_data 
      : JSON.stringify(flow_data);
    
    await connection.execute(
      `INSERT INTO flow_versions (id, flow_id, version_number, flow_data, change_log, is_current, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, flow_id, version_number, flowDataString, change_log, is_current, created_by]
    );

    return { id, flow_id, version_number, change_log, is_current };
  }

  /**
   * Get flow versions
   * @param {string} flowId - Flow ID
   * @returns {Promise<Array>} Array of versions
   */
  async getFlowVersions(flowId) {
    const connection = await this.pool.getConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM flow_versions WHERE flow_id = ? ORDER BY created_at DESC',
        [flowId]
      );

      return rows.map(version => {
        try {
          return {
            ...version,
            flow_data: typeof version.flow_data === 'string' 
              ? JSON.parse(version.flow_data) 
              : (version.flow_data || {})
          };
        } catch (parseError) {
          console.error('Error parsing version flow_data:', version.id, parseError);
          return {
            ...version,
            flow_data: {}
          };
        }
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Validate flow structure
   * @param {Object} flowData - Flow data to validate
   * @returns {Promise<Object>} Validation result
   */
  async validateFlow(flowData) {
    console.log('Validating flow data:', JSON.stringify(flowData, null, 2));
    const errors = [];
    const warnings = [];

    // Handle both WhatsApp Flow format (screens) and internal format (nodes/edges)
    if (flowData.screens) {
      // WhatsApp Flow format validation
      if (!flowData.screens || flowData.screens.length === 0) {
        errors.push('Flow must have at least one screen');
      }

      // Validate each screen
      if (flowData.screens) {
        flowData.screens.forEach((screen, index) => {
          if (!screen.id) {
            errors.push(`Screen ${index + 1} must have an ID`);
          } else {
            // Validate ID format (alphanumeric + underscore only)
            if (!/^[a-zA-Z0-9_]+$/.test(screen.id)) {
              errors.push(`Screen ${index + 1} ID must contain only alphanumeric characters and underscores`);
            }
          }
          
          if (!screen.name) {
            errors.push(`Screen ${index + 1} must have a name`);
          }
          
          if (!screen.components || !Array.isArray(screen.components)) {
            errors.push(`Screen ${index + 1} must have components array`);
          }
          
          // Validate components
          if (screen.components) {
            const componentNames = new Set();
            screen.components.forEach((component, compIndex) => {
              if (!component.id) {
                errors.push(`Screen ${index + 1}, Component ${compIndex + 1} must have an ID`);
              } else {
                // Validate component ID format
                if (!/^[a-zA-Z0-9_]+$/.test(component.id)) {
                  errors.push(`Screen ${index + 1}, Component ${compIndex + 1} ID must contain only alphanumeric characters and underscores`);
                }
                
                // Check for duplicate component names within screen
                if (componentNames.has(component.id)) {
                  errors.push(`Screen ${index + 1}, Component ${compIndex + 1} has duplicate ID: ${component.id}`);
                } else {
                  componentNames.add(component.id);
                }
              }
              
              if (!component.type) {
                errors.push(`Screen ${index + 1}, Component ${compIndex + 1} must have a type`);
              }
              
              // Validate specific component types according to WhatsApp Flow API v7.3
              switch (component.type) {
                case 'small_heading':
                case 'large_heading':
                case 'heading':
                  if (!component.content || !component.content.trim()) {
                    errors.push(`Screen ${index + 1}, Component ${compIndex + 1} (${component.type}) must have content`);
                  }
                  break;
                  
                case 'paragraph':
                case 'text':
                case 'body':
                  if (!component.content || !component.content.trim()) {
                    errors.push(`Screen ${index + 1}, Component ${compIndex + 1} (${component.type}) must have content`);
                  }
                  break;
                  
                case 'text_input':
                case 'number_input':
                case 'email_input':
                case 'phone_input':
                case 'date_input':
                  if (!component.label || !component.label.trim()) {
                    errors.push(`Screen ${index + 1}, Component ${compIndex + 1} (${component.type}) must have a label`);
                  }
                  break;
                  
                case 'single_choice':
                case 'multiple_choice':
                  if (!component.question || !component.question.trim()) {
                    errors.push(`Screen ${index + 1}, Component ${compIndex + 1} (${component.type}) must have a question`);
                  }
                  if (!component.options || !Array.isArray(component.options) || component.options.length === 0) {
                    errors.push(`Screen ${index + 1}, Component ${compIndex + 1} (${component.type}) must have at least one option`);
                  } else {
                    const optionIds = new Set();
                    component.options.forEach((option, optIndex) => {
                      if (!option.id) {
                        errors.push(`Screen ${index + 1}, Component ${compIndex + 1}, Option ${optIndex + 1} must have an ID`);
                      } else {
                        if (!/^[a-zA-Z0-9_]+$/.test(option.id)) {
                          errors.push(`Screen ${index + 1}, Component ${compIndex + 1}, Option ${optIndex + 1} ID must contain only alphanumeric characters and underscores`);
                        }
                        if (optionIds.has(option.id)) {
                          errors.push(`Screen ${index + 1}, Component ${compIndex + 1}, Option ${optIndex + 1} has duplicate ID: ${option.id}`);
                        } else {
                          optionIds.add(option.id);
                        }
                      }
                      if (!option.text || !option.text.trim()) {
                        errors.push(`Screen ${index + 1}, Component ${compIndex + 1}, Option ${optIndex + 1} must have text`);
                      }
                    });
                  }
                  break;
                  
                case 'button':
                  if (!component.text || !component.text.trim()) {
                    errors.push(`Screen ${index + 1}, Component ${compIndex + 1} (button) must have text`);
                  }
                  break;
              }
            });
          }
        });
        
        // Check for proper navigation structure
        const lastScreen = flowData.screens[flowData.screens.length - 1];
        if (lastScreen) {
          const hasFooter = lastScreen.components.some(comp => comp.type === 'button');
          if (!hasFooter) {
            warnings.push('Last screen should have a button for completion');
          }
        }
      }
    } else if (flowData.nodes) {
      // Internal nodes/edges format validation
      if (!flowData.nodes || flowData.nodes.length === 0) {
        errors.push('Flow must have at least one node');
      }

      // Validate each node
      if (flowData.nodes) {
        flowData.nodes.forEach((node, index) => {
          if (!node.id) {
            errors.push(`Node ${index + 1} must have an ID`);
          }
          
          if (!node.type) {
            errors.push(`Node ${index + 1} must have a type`);
          }
          
          // Validate node types
          const validNodeTypes = ['screen', 'form', 'list_picker', 'confirmation', 'text', 'image', 'button', 'condition'];
          if (!validNodeTypes.includes(node.type)) {
            errors.push(`Node ${index + 1} has invalid type: ${node.type}`);
          }
        });
      }

      // Validate edges if present
      if (flowData.edges) {
        flowData.edges.forEach((edge, index) => {
          if (!edge.source) {
            errors.push(`Edge ${index + 1} must have a source node`);
          }
          
          if (!edge.target) {
            errors.push(`Edge ${index + 1} must have a target node`);
          }
          
          // Check if source and target nodes exist
          if (flowData.nodes) {
            const nodeIds = flowData.nodes.map(node => node.id);
            if (edge.source && !nodeIds.includes(edge.source)) {
              errors.push(`Edge ${index + 1} references non-existent source node: ${edge.source}`);
            }
            if (edge.target && !nodeIds.includes(edge.target)) {
              errors.push(`Edge ${index + 1} references non-existent target node: ${edge.target}`);
            }
          }
        });
      }
    } else {
      errors.push('Flow must contain either screens (WhatsApp format) or nodes (internal format)');
    }

    console.log('Validation errors:', errors);
    console.log('Validation warnings:', warnings);
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get flow analytics
   * @param {string} flowId - Flow ID
   * @param {Object} dateRange - Date range for analytics
   * @returns {Promise<Object>} Analytics data
   */
  async getFlowAnalytics(flowId, dateRange = {}) {
    const connection = await this.pool.getConnection();
    try {
      let query = `
        SELECT 
          COUNT(*) as total_sessions,
          COUNT(CASE WHEN completion_status = 'completed' THEN 1 END) as completed_sessions,
          COUNT(CASE WHEN completion_status = 'abandoned' THEN 1 END) as abandoned_sessions,
          COUNT(CASE WHEN completion_status = 'error' THEN 1 END) as error_sessions,
          AVG(TIMESTAMPDIFF(SECOND, started_at, completed_at)) as avg_completion_time
        FROM flow_analytics 
        WHERE flow_id = ?
      `;

      const params = [flowId];

      if (dateRange.start) {
        query += ' AND started_at >= ?';
        params.push(dateRange.start);
      }

      if (dateRange.end) {
        query += ' AND started_at <= ?';
        params.push(dateRange.end);
      }

      const [rows] = await connection.execute(query, params);
      return rows[0] || {};
    } finally {
      connection.release();
    }
  }

  /**
   * Record flow analytics
   * @param {Object} analyticsData - Analytics data
   * @returns {Promise<Object>} Recorded analytics
   */
  async recordFlowAnalytics(analyticsData) {
    const connection = await this.pool.getConnection();
    try {
      const {
        flow_id,
        session_id,
        phone_number,
        current_node_id,
        completion_status = 'abandoned',
        error_message,
        metadata = {}
      } = analyticsData;

      const id = uuidv4();
      await connection.execute(
        `INSERT INTO flow_analytics (id, flow_id, session_id, phone_number, current_node_id, completion_status, error_message, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, flow_id, session_id, phone_number, current_node_id, completion_status, error_message, JSON.stringify(metadata)]
      );

      return { id, flow_id, session_id, completion_status };
    } finally {
      connection.release();
    }
  }
}

module.exports = new FlowModel();