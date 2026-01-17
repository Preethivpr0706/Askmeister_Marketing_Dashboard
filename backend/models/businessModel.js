const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

class Business {

    static async updateProfileImage(userId, imageUrl) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // First get the current business and image URL
            const business = await this.getByUserId(userId);
            if (!business) {
                throw new Error('Business not found for this user');
            }

            // Update with new image URL
            await connection.execute(
                `UPDATE businesses 
                 SET profile_image_url = ?,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`, [imageUrl, business.business.id]
            );

            // Delete old image file if it exists
            if (business.profile_image_url) {
                const oldImagePath = path.join(
                    __dirname,
                    '../../public',
                    business.profile_image_url
                );

                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }

            await connection.commit();

            return this.getByUserId(userId);
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
    static async getByUserId(userId) {
        try {
            // First get the business_id and user details from users table with explicit aliases to avoid name collisions
            const [userRows] = await pool.execute(
                `SELECT 
                    u.id AS user_id,
                    u.email AS user_email,
                    u.name AS user_name,
                    u.phone AS user_phone,
                    u.business_id AS user_business_id,
                    b.id AS business_id,
                    b.name AS business_name,
                    b.description AS business_description,
                    b.profile_image_url AS business_profile_image_url,
                    b.industry AS business_industry,
                    b.size AS business_size,
                    b.contact_email AS business_contact_email,
                    b.contact_phone AS business_contact_phone,
                    b.website AS business_website
                 FROM users u 
                 LEFT JOIN businesses b ON u.business_id = b.id 
                 WHERE u.id = ?`, [userId]
            );

            if (!userRows.length) {
                return null;
            }

            // Format the response
            const row = userRows[0];
            return {
                user: {
                    id: row.user_id,
                    email: row.user_email,
                    name: row.user_name,
                    firstName: (row.user_name || '').split(' ')[0] || '',
                    lastName: (row.user_name || '').split(' ')[1] || '',
                    phone: row.user_phone
                },
                business: {
                    id: row.business_id,
                    name: row.business_name,
                    description: row.business_description,
                    profile_image_url: row.business_profile_image_url,
                    industry: row.business_industry,
                    size: row.business_size,
                    contact_email: row.business_contact_email,
                    contact_phone: row.business_contact_phone,
                    website: row.business_website,
                }
            };
        } catch (error) {
            console.error('Error in getByUserId:', error);
            throw error;
        }
    }

    // businessModel.js
    static async update(userId, updateData) {
            const connection = await pool.getConnection();
            try {
                await connection.beginTransaction();
                console.log('Updating with data:', updateData); // Debug log

                const { user: userUpdate, business: businessUpdate } = updateData;

                // Update user details
                if (userUpdate) {
                    const fullName = `${userUpdate.firstName} ${userUpdate.lastName}`.trim();
                    console.log('Updating user:', { userId, fullName, email: userUpdate.email }); // Debug log

                    await connection.execute(
                        `UPDATE users 
                 SET name = ?, 
                     email = ?,
                     phone=?,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`, [fullName, userUpdate.email, userUpdate.phone, userId]
                    );
                }

                // Update business details
                if (businessUpdate) {
                    // First get the business_id
                    const [userRow] = await connection.execute(
                        'SELECT business_id FROM users WHERE id = ?', [userId]
                    );
                    if (!userRow[0] || !userRow[0].business_id) {
                        throw new Error('No business associated with this user');
                    }


                    console.log('Updating business:', {
                        businessId: userRow[0].business_id,
                        data: businessUpdate
                    }); // Debug log

                    await connection.execute(
                        `UPDATE businesses 
                 SET name = ?, 
                     description = ?,
                     industry = ?,
                     size = ?,
                     contact_email = ?,
                     contact_phone = ?,
                     website = ?,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`, [
                            businessUpdate.name,
                            businessUpdate.description,
                            businessUpdate.industry,
                            businessUpdate.size,
                            businessUpdate.contact_email,
                            businessUpdate.contact_phone,
                            businessUpdate.website,
                            userRow[0].business_id
                        ]
                    );
                }

                await connection.commit();

                // Fetch and return updated data
                return await this.getByUserId(userId);
            } catch (error) {
                await connection.rollback();
                console.error('Error in update:', error); // Debug log
                throw error;
            } finally {
                connection.release();
            }
        }
        // businessModel.js
    static validateUpdateData(data) {
        const { user, business } = data;

        if (user && (!user.firstName || !user.email)) {
            throw new Error('First name and email are required for user update');
        }

        if (business && !business.name) {
            throw new Error('Business name is required for business update');
        }

        return true;
    }

    static async getAll() {
        try {
            const [rows] = await pool.execute(
                `SELECT b.*, COUNT(u.id) as user_count
                 FROM businesses b
                 LEFT JOIN users u ON b.id = u.business_id
                 GROUP BY b.id
                 ORDER BY b.created_at DESC`
            );
            return rows;
        } catch (error) {
            console.error('Error in Business.getAll:', error);
            throw error;
        }
    }

    static async getById(id) {
        try {
            const [rows] = await pool.execute(
                `SELECT b.*, COUNT(u.id) as user_count
                 FROM businesses b
                 LEFT JOIN users u ON b.id = u.business_id
                 WHERE b.id = ?
                 GROUP BY b.id`, [id]
            );
            return rows[0] || null;
        } catch (error) {
            console.error('Error in Business.getById:', error);
            throw error;
        }
    }

    static async create(businessData) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Get the next ID (max ID + 1)
            const [maxIdResult] = await connection.execute('SELECT COALESCE(MAX(id), 0) + 1 as nextId FROM businesses');
            const businessId = maxIdResult[0].nextId;

            // Insert business with specific ID
            await connection.execute(
                `INSERT INTO businesses (id, name, description, profile_image_url, industry, size, contact_email, contact_phone, website, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                [businessId, businessData.name, businessData.description, businessData.profile_image_url,
                 businessData.industry, businessData.size, businessData.contact_email,
                 businessData.contact_phone, businessData.website]
            );

            // Create default business settings
            // const settingsId = require('uuid').v4();
            // Get the next ID (max ID + 1)
            const [maxBusSetIdResult] = await connection.execute('SELECT COALESCE(MAX(id), 0) + 1 as nextId FROM businesses');
            const businessSettingsId = maxIdResult[0].nextId;
            await connection.execute(
                `INSERT INTO business_settings (id, business_id, whatsapp_api_token, whatsapp_business_account_id,
                 whatsapp_phone_number_id, facebook_app_id, webhook_verify_token, created_at, updated_at)
                 VALUES (?, ?, '', '', '', '', '', NOW(), NOW())`,
                [businessSettingsId, businessId]
            );

            await connection.commit();

            // Return the created business
            return await this.getById(businessId);
        } catch (error) {
            await connection.rollback();
            console.error('Error in Business.create:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    static async updateBusinessAdmin(id, businessData) {
        try {
            await pool.execute(
                `UPDATE businesses
                 SET name = ?, description = ?, profile_image_url = ?, industry = ?, size = ?,
                     contact_email = ?, contact_phone = ?, website = ?, updated_at = NOW()
                 WHERE id = ?`,
                [businessData.name, businessData.description, businessData.profile_image_url,
                 businessData.industry, businessData.size, businessData.contact_email,
                 businessData.contact_phone, businessData.website, id]
            );

            // Return updated business
            return await this.getById(id);
        } catch (error) {
            console.error('Error in Business.update:', error);
            throw error;
        }
    }

    static async delete(id) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Delete from all related tables
            // Delete chatbot flows and related data
            const [chatbotFlows] = await connection.execute(
                'SELECT id FROM chatbot_flows WHERE business_id = ?',
                [id]
            );
            const flowIds = chatbotFlows.map(f => f.id);
            if (flowIds.length > 0) {
                const flowPlaceholders = flowIds.map(() => '?').join(',');
                // Delete chatbot edges
                await connection.execute(
                    `DELETE FROM chatbot_edges WHERE flow_id IN (${flowPlaceholders})`,
                    flowIds
                );
                // Delete chatbot nodes
                await connection.execute(
                    `DELETE FROM chatbot_nodes WHERE flow_id IN (${flowPlaceholders})`,
                    flowIds
                );
                // Delete chatbot flows
                await connection.execute(
                    `DELETE FROM chatbot_flows WHERE id IN (${flowPlaceholders})`,
                    flowIds
                );
            }

            // Delete WhatsApp flows (flows table)
            await connection.execute('DELETE FROM flows WHERE business_id = ?', [id]);

            // Delete auto_replies
            await connection.execute('DELETE FROM auto_replies WHERE business_id = ?', [id]);

            // Delete conversations
            await connection.execute('DELETE FROM conversations WHERE business_id = ?', [id]);

            

            // Delete contact field definitions (cascade will handle contacts and contact_lists)
            await connection.execute('DELETE FROM contact_field_definitions WHERE business_id = ?', [id]);

            // Delete contact lists (cascade will delete contacts)
            await connection.execute('DELETE FROM contact_lists WHERE business_id = ?', [id]);

            // Delete contacts (if not already deleted by cascade)
            await connection.execute('DELETE FROM contacts WHERE business_id = ?', [id]);

            // Delete messages
            await connection.execute('DELETE FROM messages WHERE business_id = ?', [id]);

            // Delete campaigns
            await connection.execute('DELETE FROM campaigns WHERE business_id = ?', [id]);

            // Delete templates (cascade will delete template_buttons)
            await connection.execute('DELETE FROM templates WHERE business_id = ?', [id]);

            // Delete users
            await connection.execute('DELETE FROM users WHERE business_id = ?', [id]);

            // Delete business settings
            await connection.execute('DELETE FROM business_settings WHERE business_id = ?', [id]);

            // Delete business
            await connection.execute('DELETE FROM businesses WHERE id = ?', [id]);

            await connection.commit();

            return { success: true, message: 'Business deleted successfully' };
        } catch (error) {
            await connection.rollback();
            console.error('Error in Business.delete:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    static async getBusinessSettings(businessId) {
        try {
            const [rows] = await pool.execute(
                'SELECT * FROM business_settings WHERE business_id = ?',
                [businessId]
            );
            return rows[0] || null;
        } catch (error) {
            console.error('Error in Business.getBusinessSettings:', error);
            throw error;
        }
    }

    static async updateBusinessSettings(businessId, settingsData) {
        try {
            await pool.execute(
                `UPDATE business_settings
                 SET whatsapp_api_token = ?, whatsapp_business_account_id = ?,
                     whatsapp_phone_number_id = ?, facebook_app_id = ?, webhook_verify_token = ?, updated_at = NOW()
                 WHERE business_id = ?`,
                [settingsData.whatsapp_api_token, settingsData.whatsapp_business_account_id,
                 settingsData.whatsapp_phone_number_id, settingsData.facebook_app_id,
                 settingsData.webhook_verify_token, businessId]
            );

            // Return updated settings
            return await this.getBusinessSettings(businessId);
        } catch (error) {
            console.error('Error in Business.updateBusinessSettings:', error);
            throw error;
        }
    }
}

module.exports = Business;