const { pool } = require('../config/database');
const bcrypt = require('bcrypt');

class User {
    static async getAll() {
        try {
            const [rows] = await pool.execute(
                `SELECT u.*, b.name as business_name
                 FROM users u
                 LEFT JOIN businesses b ON u.business_id = b.id
                 ORDER BY u.created_at DESC`
            );
            return rows;
        } catch (error) {
            console.error('Error in User.getAll:', error);
            throw error;
        }
    }

    static async getById(id) {
        try {
            const [rows] = await pool.execute(
                `SELECT u.*, b.name as business_name
                 FROM users u
                 LEFT JOIN businesses b ON u.business_id = b.id
                 WHERE u.id = ?`, [id]
            );
            return rows[0] || null;
        } catch (error) {
            console.error('Error in User.getById:', error);
            throw error;
        }
    }

    static async create(userData) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Hash password
            const hashedPassword = await bcrypt.hash(userData.password, 12);

            // Get the next ID (max ID + 1)
            const [maxIdResult] = await connection.execute('SELECT COALESCE(MAX(id), 0) + 1 as nextId FROM users');
            const nextId = maxIdResult[0].nextId;

            // Insert user with specific ID
            await connection.execute(
                `INSERT INTO users (id, email, name, password, phone, business_id, role, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                [nextId, userData.email, userData.name, hashedPassword, userData.phone || null, userData.business_id, userData.role || 'user']
            );

            await connection.commit();

            // Return the created user (without password)
            return await this.getById(nextId);
        } catch (error) {
            await connection.rollback();
            console.error('Error in User.create:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    static async update(id, userData) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            let query = `UPDATE users SET email = ?, name = ?, phone = ?, business_id = ?, role = ?, updated_at = NOW()`;
            let params = [userData.email, userData.name, userData.phone || null, userData.business_id, userData.role];

            // Only update password if provided
            if (userData.password) {
              //  const hashedPassword = await bcrypt.hash(userData.password, 12);
                query += `, password = ?`;
               // params.push(hashedPassword);
               params.push(userData.password);
            }

            query += ` WHERE id = ?`;
            params.push(id);

            await connection.execute(query, params);
            await connection.commit();

            // Return updated user
            return await this.getById(id);
        } catch (error) {
            await connection.rollback();
            console.error('Error in User.update:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    static async delete(id) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Check if user exists
            const user = await this.getById(id);
            if (!user) {
                throw new Error('User not found');
            }

            // Delete user
            await connection.execute('DELETE FROM users WHERE id = ?', [id]);
            await connection.commit();

            return { success: true, message: 'User deleted successfully' };
        } catch (error) {
            await connection.rollback();
            console.error('Error in User.delete:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    static async getByEmail(email) {
        try {
            const [rows] = await pool.execute(
                'SELECT * FROM users WHERE email = ?',
                [email]
            );
            return rows[0] || null;
        } catch (error) {
            console.error('Error in User.getByEmail:', error);
            throw error;
        }
    }

    static async updatePassword(id, newPassword) {
        try {
            const hashedPassword = await bcrypt.hash(newPassword, 12);
            await pool.execute(
                'UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?',
                [hashedPassword, id]
            );
            return { success: true, message: 'Password updated successfully' };
        } catch (error) {
            console.error('Error in User.updatePassword:', error);
            throw error;
        }
    }

    static async getUsersByBusiness(businessId) {
        try {
            const [rows] = await pool.execute(
                `SELECT u.*, b.name as business_name
                 FROM users u
                 LEFT JOIN businesses b ON u.business_id = b.id
                 WHERE u.business_id = ?
                 ORDER BY u.created_at DESC`,
                [businessId]
            );
            return rows;
        } catch (error) {
            console.error('Error in User.getUsersByBusiness:', error);
            throw error;
        }
    }

    static async getUsersByRole(role) {
        try {
            const [rows] = await pool.execute(
                `SELECT u.*, b.name as business_name
                 FROM users u
                 LEFT JOIN businesses b ON u.business_id = b.id
                 WHERE u.role = ?
                 ORDER BY u.created_at DESC`,
                [role]
            );
            return rows;
        } catch (error) {
            console.error('Error in User.getUsersByRole:', error);
            throw error;
        }
    }
}

module.exports = User;
