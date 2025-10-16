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

}


module.exports = Business;