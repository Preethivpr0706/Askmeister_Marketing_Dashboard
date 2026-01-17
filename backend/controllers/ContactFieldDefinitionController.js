const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class ContactFieldDefinitionController {
    // Predefined field options
    static PREDEFINED_FIELDS = [
        { field_name: 'company_name', field_type: 'text', is_predefined: true },
        { field_name: 'job_title', field_type: 'text', is_predefined: true },
        { field_name: 'date_of_birth', field_type: 'date', is_predefined: true },
        { field_name: 'address', field_type: 'text', is_predefined: true },
        { field_name: 'city', field_type: 'text', is_predefined: true },
        { field_name: 'country', field_type: 'text', is_predefined: true },
        { field_name: 'postal_code', field_type: 'text', is_predefined: true },
        { field_name: 'phone_secondary', field_type: 'phone', is_predefined: true },
        { field_name: 'website', field_type: 'text', is_predefined: true },
        { field_name: 'notes', field_type: 'text', is_predefined: true },
        { field_name: 'custom_attribute_1', field_type: 'text', is_predefined: true },
        { field_name: 'custom_attribute_2', field_type: 'text', is_predefined: true },
        { field_name: 'custom_attribute_3', field_type: 'text', is_predefined: true },
        { field_name: 'custom_attribute_4', field_type: 'text', is_predefined: true },
        { field_name: 'custom_attribute_5', field_type: 'text', is_predefined: true },
        { field_name: 'custom_attribute_6', field_type: 'text', is_predefined: true },
        { field_name: 'custom_attribute_7', field_type: 'text', is_predefined: true },
        { field_name: 'custom_attribute_8', field_type: 'text', is_predefined: true },
        { field_name: 'custom_attribute_9', field_type: 'text', is_predefined: true },
        { field_name: 'custom_attribute_10', field_type: 'text', is_predefined: true }
    ];

    // Get all field definitions for a business/list
    static async getFieldDefinitions(req, res) {
        try {
            const { listId } = req.query;
            const businessId = req.user.businessId;

            let query = `
                SELECT id, business_id, list_id, field_name, field_type, is_predefined, is_active, created_at, updated_at
                FROM contact_field_definitions
                WHERE business_id = ? AND is_active = TRUE
            `;
            const params = [businessId];

            if (listId) {
                // Get list-specific fields OR business-wide fields (list_id IS NULL)
                query += ' AND (list_id = ? OR list_id IS NULL)';
                params.push(listId);
            } else {
                // Only business-wide fields if no listId specified
                query += ' AND list_id IS NULL';
            }

            query += ' ORDER BY is_predefined DESC, field_name ASC';

            const [fields] = await pool.execute(query, params);

            res.json({
                success: true,
                data: fields
            });
        } catch (error) {
            console.error('Error fetching field definitions:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch field definitions' });
        }
    }

    // Get all available fields (fixed + custom) for a list
    static async getAvailableFields(req, res) {
        try {
            const { listId } = req.query;
            const businessId = req.user.businessId;

            // Fixed fields
            const fixedFields = [
                { field_name: 'fname', field_type: 'text', is_fixed: true },
                { field_name: 'lname', field_type: 'text', is_fixed: true },
                { field_name: 'wanumber', field_type: 'phone', is_fixed: true },
                { field_name: 'email', field_type: 'email', is_fixed: true }
            ];

            // Get custom field definitions directly from database
            let query = `
                SELECT id, business_id, list_id, field_name, field_type, is_predefined, is_active, created_at, updated_at
                FROM contact_field_definitions
                WHERE business_id = ? AND is_active = TRUE
            `;
            const params = [businessId];

            if (listId) {
                // Get list-specific fields OR business-wide fields (list_id IS NULL)
                query += ' AND (list_id = ? OR list_id IS NULL)';
                params.push(listId);
            } else {
                // Only business-wide fields if no listId specified
                query += ' AND list_id IS NULL';
            }

            const [fieldDefs] = await pool.execute(query, params);
            const customFields = fieldDefs || [];

            // Combine fixed and custom fields
            const allFields = [
                ...fixedFields,
                ...customFields.map(f => ({ ...f, is_fixed: false }))
            ];

            res.json({
                success: true,
                data: allFields
            });
        } catch (error) {
            console.error('Error fetching available fields:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch available fields' });
        }
    }

    // Create a new field definition
    static async createFieldDefinition(req, res) {
        try {
            const { listId, field_name, field_type } = req.body;
            const businessId = req.user.businessId;

            if (!field_name) {
                return res.status(400).json({ success: false, message: 'Field name is required' });
            }

            // Validate field name (snake_case, alphanumeric and underscores)
            if (!/^[a-z][a-z0-9_]*$/.test(field_name)) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Field name must be in snake_case (lowercase letters, numbers, and underscores only)' 
                });
            }

            // Check if field already exists
            const [existing] = await pool.execute(
                `SELECT id FROM contact_field_definitions 
                 WHERE business_id = ? AND list_id ${listId ? '= ?' : 'IS NULL'} AND field_name = ?`,
                listId ? [businessId, listId, field_name] : [businessId, field_name]
            );

            if (existing.length > 0) {
                return res.status(400).json({ success: false, message: 'Field name already exists' });
            }

            const id = uuidv4();
            await pool.execute(
                `INSERT INTO contact_field_definitions 
                 (id, business_id, list_id, field_name, field_type, is_predefined, is_active) 
                 VALUES (?, ?, ?, ?, ?, FALSE, TRUE)`,
                [id, businessId, listId || null, field_name, field_type || 'text']
            );

            res.status(201).json({
                success: true,
                message: 'Field definition created successfully',
                data: { id, field_name, field_type: field_type || 'text' }
            });
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ success: false, message: 'Field name already exists' });
            }
            console.error('Error creating field definition:', error);
            res.status(500).json({ success: false, message: 'Failed to create field definition' });
        }
    }

    // Update a field definition
    static async updateFieldDefinition(req, res) {
        try {
            const { id } = req.params;
            const { field_name, field_type, is_active } = req.body;
            const businessId = req.user.businessId;

            // Verify field exists and belongs to business
            const [existing] = await pool.execute(
                'SELECT id FROM contact_field_definitions WHERE id = ? AND business_id = ?',
                [id, businessId]
            );

            if (existing.length === 0) {
                return res.status(404).json({ success: false, message: 'Field definition not found' });
            }

            // Build update query dynamically
            const updates = [];
            const params = [];

            if (field_name !== undefined) {
                updates.push('field_name = ?');
                params.push(field_name);
            }
            if (field_type !== undefined) {
                updates.push('field_type = ?');
                params.push(field_type);
            }
            if (is_active !== undefined) {
                updates.push('is_active = ?');
                params.push(is_active);
            }

            if (updates.length === 0) {
                return res.status(400).json({ success: false, message: 'No fields to update' });
            }

            params.push(id, businessId);

            await pool.execute(
                `UPDATE contact_field_definitions SET ${updates.join(', ')}, updated_at = NOW() 
                 WHERE id = ? AND business_id = ?`,
                params
            );

            res.json({
                success: true,
                message: 'Field definition updated successfully'
            });
        } catch (error) {
            console.error('Error updating field definition:', error);
            res.status(500).json({ success: false, message: 'Failed to update field definition' });
        }
    }

    // Delete a field definition
    static async deleteFieldDefinition(req, res) {
        try {
            const { id } = req.params;
            const businessId = req.user.businessId;

            // Verify field exists and belongs to business
            const [existing] = await pool.execute(
                'SELECT id, is_predefined FROM contact_field_definitions WHERE id = ? AND business_id = ?',
                [id, businessId]
            );

            if (existing.length === 0) {
                return res.status(404).json({ success: false, message: 'Field definition not found' });
            }

            // Don't allow deletion of predefined fields, just deactivate them
            if (existing[0].is_predefined) {
                await pool.execute(
                    'UPDATE contact_field_definitions SET is_active = FALSE WHERE id = ?',
                    [id]
                );
                return res.json({
                    success: true,
                    message: 'Predefined field deactivated (cannot be deleted)'
                });
            }

            await pool.execute(
                'DELETE FROM contact_field_definitions WHERE id = ? AND business_id = ?',
                [id, businessId]
            );

            res.json({
                success: true,
                message: 'Field definition deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting field definition:', error);
            res.status(500).json({ success: false, message: 'Failed to delete field definition' });
        }
    }

    // Initialize predefined fields for a business
    static async initializePredefinedFields(businessId) {
        try {
            // Check if predefined fields already exist
            const [existing] = await pool.execute(
                'SELECT COUNT(*) as count FROM contact_field_definitions WHERE business_id = ? AND is_predefined = TRUE',
                [businessId]
            );

            if (existing[0].count > 0) {
                return; // Already initialized
            }

            // Insert all predefined fields
            const fields = ContactFieldDefinitionController.PREDEFINED_FIELDS.map(field => [
                uuidv4(),
                businessId,
                null, // list_id (business-wide)
                field.field_name,
                field.field_type,
                field.is_predefined,
                true // is_active
            ]);

            await pool.query(
                `INSERT INTO contact_field_definitions 
                 (id, business_id, list_id, field_name, field_type, is_predefined, is_active) 
                 VALUES ?`,
                [fields]
            );
        } catch (error) {
            console.error('Error initializing predefined fields:', error);
        }
    }
}

module.exports = ContactFieldDefinitionController;

