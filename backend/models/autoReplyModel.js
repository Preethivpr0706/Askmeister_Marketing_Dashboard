const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class AutoReply {
    constructor(data) {
        this.id = data.id;
        this.business_id = data.business_id;
        this.keyword = data.keyword;
        this.response_message = data.response_message;
        this.is_active = data.is_active;
        this.priority = data.priority;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    // Create a new auto-reply
    static async create(data) {
        const id = uuidv4();
        const query = `
            INSERT INTO auto_replies (id, business_id, keyword, response_message, is_active, priority)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        const values = [
            id,
            data.business_id,
            data.keyword.toLowerCase().trim(),
            data.response_message,
            data.is_active !== undefined ? data.is_active : true,
            data.priority || 0
        ];

        await pool.query(query, values);
        return await this.findById(id);
    }

    // Find auto-reply by ID
    static async findById(id) {
        const query = 'SELECT * FROM auto_replies WHERE id = ?';
        const [rows] = await pool.query(query, [id]);
        return rows.length > 0 ? new AutoReply(rows[0]) : null;
    }

    // Get all auto-replies for a business
    static async findByBusinessId(businessId, options = {}) {
        let query = 'SELECT * FROM auto_replies WHERE business_id = ?';
        const params = [businessId];

        if (options.active_only) {
            query += ' AND is_active = TRUE';
        }

        if (options.search) {
            query += ' AND (keyword LIKE ? OR response_message LIKE ?)';
            const searchTerm = `%${options.search}%`;
            params.push(searchTerm, searchTerm);
        }

        query += ' ORDER BY priority DESC, created_at DESC';

        if (options.limit) {
            query += ' LIMIT ?';
            params.push(options.limit);
        }

        if (options.offset) {
            query += ' OFFSET ?';
            params.push(options.offset);
        }

        const [rows] = await pool.query(query, params);
        return rows.map(row => new AutoReply(row));
    }

    // Find matching auto-reply for a message
    static async findMatchingReply(businessId, message) {
        const query = `
            SELECT * FROM auto_replies 
            WHERE business_id = ? 
            AND is_active = TRUE 
            AND LOWER(?) LIKE CONCAT('%', LOWER(keyword), '%')
            ORDER BY priority DESC, LENGTH(keyword) DESC
            LIMIT 1
        `;

        const [rows] = await pool.query(query, [businessId, message]);
        return rows.length > 0 ? new AutoReply(rows[0]) : null;
    }

    // Update auto-reply
    async update(data) {
        const allowedFields = ['keyword', 'response_message', 'is_active', 'priority'];
        const updates = [];
        const values = [];

        for (const field of allowedFields) {
            if (data[field] !== undefined) {
                updates.push(`${field} = ?`);
                if (field === 'keyword') {
                    values.push(data[field].toLowerCase().trim());
                } else {
                    values.push(data[field]);
                }
            }
        }

        if (updates.length === 0) {
            return this;
        }

        values.push(this.id);
        const query = `UPDATE auto_replies SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;

        await pool.query(query, values);
        return await AutoReply.findById(this.id);
    }

    // Delete auto-reply
    async delete() {
        const query = 'DELETE FROM auto_replies WHERE id = ?';
        await pool.query(query, [this.id]);
        return true;
    }

    // Toggle active status
    async toggleActive() {
        const query = 'UPDATE auto_replies SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
        await pool.query(query, [this.id]);
        return await AutoReply.findById(this.id);
    }

    // Get statistics for auto-replies
    static async getStats(businessId) {
        const query = `
            SELECT 
                COUNT(*) as total_replies,
                SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) as active_replies,
                SUM(CASE WHEN is_active = FALSE THEN 1 ELSE 0 END) as inactive_replies
            FROM auto_replies 
            WHERE business_id = ?
        `;

        const [rows] = await pool.query(query, [businessId]);
        return rows[0];
    }

    // Convert to JSON
    toJSON() {
        return {
            id: this.id,
            business_id: this.business_id,
            keyword: this.keyword,
            response_message: this.response_message,
            is_active: this.is_active,
            priority: this.priority,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }
}

module.exports = AutoReply;