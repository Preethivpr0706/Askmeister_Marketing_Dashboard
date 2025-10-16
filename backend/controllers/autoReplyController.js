const AutoReply = require('../models/autoReplyModel');
const { pool } = require('../config/database');

class AutoReplyController {
    // Create a new auto-reply
    static async createAutoReply(req, res) {
        try {
            const { keyword, response_message, is_active = true, priority = 0 } = req.body;
            const business_id = req.user.businessId;

            if (!keyword || !response_message) {
                return res.status(400).json({
                    success: false,
                    message: 'Keyword and response message are required'
                });
            }

            // Prevent duplicate keyword tokens (supports comma-separated list)
            const existingReplies = await AutoReply.findByBusinessId(business_id);
            const newTokens = keyword
                .toLowerCase()
                .split(',')
                .map(k => k.trim())
                .filter(k => k.length > 0);

            const existingTokens = new Set();
            for (const r of existingReplies) {
                const tokens = (r.keyword || '')
                    .toLowerCase()
                    .split(',')
                    .map(k => k.trim())
                    .filter(k => k.length > 0);
                for (const t of tokens) existingTokens.add(t);
            }

            const duplicates = newTokens.filter(t => existingTokens.has(t));
            if (duplicates.length) {
                return res.status(400).json({
                    success: false,
                    message: `An auto-reply with these keyword(s) already exists: ${duplicates.join(', ')}`
                });
            }

            const autoReply = await AutoReply.create({
                business_id,
                keyword,
                response_message,
                is_active,
                priority
            });

            res.status(201).json({
                success: true,
                message: 'Auto-reply created successfully',
                data: autoReply.toJSON()
            });
        } catch (error) {
            console.error('Error creating auto-reply:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create auto-reply',
                error: error.message
            });
        }
    }

    // Get all auto-replies for a business
    static async getAutoReplies(req, res) {
        try {
            const business_id = req.user.businessId;
            const {
                page = 1,
                    limit = 10,
                    search = '',
                    active_only = false
            } = req.query;

            const offset = (page - 1) * limit;
            const options = {
                search: search,
                active_only: active_only === 'true',
                limit: parseInt(limit),
                offset: parseInt(offset)
            };

            const autoReplies = await AutoReply.findByBusinessId(business_id, options);

            // Get total count for pagination
            let countQuery = 'SELECT COUNT(*) as total FROM auto_replies WHERE business_id = ?';
            const countParams = [business_id];

            if (options.active_only) {
                countQuery += ' AND is_active = TRUE';
            }

            if (options.search) {
                countQuery += ' AND (keyword LIKE ? OR response_message LIKE ?)';
                const searchTerm = `%${options.search}%`;
                countParams.push(searchTerm, searchTerm);
            }

            const [countResult] = await pool.query(countQuery, countParams);
            const total = countResult[0].total;

            res.json({
                success: true,
                data: autoReplies.map(reply => reply.toJSON()),
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            });
        } catch (error) {
            console.error('Error fetching auto-replies:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch auto-replies',
                error: error.message
            });
        }
    }

    // Get a specific auto-reply
    static async getAutoReply(req, res) {
        try {
            const { id } = req.params;
            const business_id = req.user.businessId;

            const autoReply = await AutoReply.findById(id);
            if (!autoReply) {
                return res.status(404).json({
                    success: false,
                    message: 'Auto-reply not found'
                });
            }

            // Check if the auto-reply belongs to the user's business
            if (autoReply.business_id !== business_id) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }

            res.json({
                success: true,
                data: autoReply.toJSON()
            });
        } catch (error) {
            console.error('Error fetching auto-reply:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch auto-reply',
                error: error.message
            });
        }
    }

    // Update an auto-reply
    static async updateAutoReply(req, res) {
        try {
            const { id } = req.params;
            const business_id = req.user.businessId;
            const updateData = req.body;

            const autoReply = await AutoReply.findById(id);
            if (!autoReply) {
                return res.status(404).json({
                    success: false,
                    message: 'Auto-reply not found'
                });
            }

            // Check if the auto-reply belongs to the user's business
            if (autoReply.business_id !== business_id) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }

            // Check for keyword conflicts if keyword is being updated (token-based)
            if (updateData.keyword && updateData.keyword.toLowerCase() !== autoReply.keyword.toLowerCase()) {
                const existingReplies = await AutoReply.findByBusinessId(business_id);

                // Exclude current reply
                const otherReplies = existingReplies.filter(r => r.id !== id);

                const newTokens = updateData.keyword
                    .toLowerCase()
                    .split(',')
                    .map(k => k.trim())
                    .filter(k => k.length > 0);

                const existingTokens = new Set();
                for (const r of otherReplies) {
                    const tokens = (r.keyword || '')
                        .toLowerCase()
                        .split(',')
                        .map(k => k.trim())
                        .filter(k => k.length > 0);
                    for (const t of tokens) existingTokens.add(t);
                }

                const duplicates = newTokens.filter(t => existingTokens.has(t));
                if (duplicates.length) {
                    return res.status(400).json({
                        success: false,
                        message: `An auto-reply with these keyword(s) already exists: ${duplicates.join(', ')}`
                    });
                }
            }

            const updatedAutoReply = await autoReply.update(updateData);

            res.json({
                success: true,
                message: 'Auto-reply updated successfully',
                data: updatedAutoReply.toJSON()
            });
        } catch (error) {
            console.error('Error updating auto-reply:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update auto-reply',
                error: error.message
            });
        }
    }

    // Delete an auto-reply
    static async deleteAutoReply(req, res) {
        try {
            const { id } = req.params;
            const business_id = req.user.businessId;

            const autoReply = await AutoReply.findById(id);
            if (!autoReply) {
                return res.status(404).json({
                    success: false,
                    message: 'Auto-reply not found'
                });
            }

            // Check if the auto-reply belongs to the user's business
            if (autoReply.business_id !== business_id) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }

            await autoReply.delete();

            res.json({
                success: true,
                message: 'Auto-reply deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting auto-reply:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete auto-reply',
                error: error.message
            });
        }
    }

    // Toggle auto-reply active status
    static async toggleAutoReply(req, res) {
        try {
            const { id } = req.params;
            const business_id = req.user.businessId;

            const autoReply = await AutoReply.findById(id);
            if (!autoReply) {
                return res.status(404).json({
                    success: false,
                    message: 'Auto-reply not found'
                });
            }

            // Check if the auto-reply belongs to the user's business
            if (autoReply.business_id !== business_id) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }

            const updatedAutoReply = await autoReply.toggleActive();

            res.json({
                success: true,
                message: `Auto-reply ${updatedAutoReply.is_active ? 'activated' : 'deactivated'} successfully`,
                data: updatedAutoReply.toJSON()
            });
        } catch (error) {
            console.error('Error toggling auto-reply:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to toggle auto-reply',
                error: error.message
            });
        }
    }

    // Get auto-reply statistics
    static async getAutoReplyStats(req, res) {
        try {
            const business_id = req.user.businessId;

            const stats = await AutoReply.getStats(business_id);

            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            console.error('Error fetching auto-reply stats:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch auto-reply statistics',
                error: error.message
            });
        }
    }

    // Test auto-reply matching
    static async testAutoReply(req, res) {
        try {
            const { message } = req.body;
            const business_id = req.user.businessId;

            if (!message) {
                return res.status(400).json({
                    success: false,
                    message: 'Message is required for testing'
                });
            }

            const matchingReply = await AutoReply.findMatchingReply(business_id, message);

            res.json({
                success: true,
                data: {
                    message,
                    matching_reply: matchingReply ? matchingReply.toJSON() : null,
                    has_match: !!matchingReply
                }
            });
        } catch (error) {
            console.error('Error testing auto-reply:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to test auto-reply',
                error: error.message
            });
        }
    }
}

module.exports = AutoReplyController;