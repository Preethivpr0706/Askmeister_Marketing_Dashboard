// controllers/authController.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { pool } = require('../config/database');

class AuthController {
    static async login(req, res) {
        console.log("login")
        try {
            const { email, password } = req.body;

            // Get user from database
            const [users] = await pool.execute(
                'SELECT id, email, name, password, business_id, role FROM users WHERE email = ?', [email]
            );

            if (users.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password'
                });
            }

            const user = users[0];

            // Verify password using bcrypt.compare (hashes the input and compares with stored hash)
            const validPassword = await bcrypt.compare(password, user.password);
            if (!validPassword) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password'
                });
            }

            // Create token with user data
            const token = jwt.sign({
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    businessId: user.business_id,
                    role: user.role
                },
                process.env.JWT_SECRET, { expiresIn: '24h' }
            );

            // Remove password from user object
            delete user.password;

            res.json({
                success: true,
                data: {
                    token,
                    user: {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        businessId: user.business_id,
                        role: user.role
                    }
                }
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    static async logout(req, res) {
        try {
            // You can add any cleanup needed here
            res.json({
                success: true,
                message: 'Logged out successfully'
            });
        } catch (error) {
            console.error('Logout error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to logout'
            });
        }
    }

    static async changePassword(req, res) {
        try {
            const userId = req.user.id; // Get user ID from authenticated token
            const { currentPassword, newPassword } = req.body;

            // Validate input
            if (!currentPassword || !newPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'Current password and new password are required'
                });
            }

            if (newPassword.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: 'New password must be at least 6 characters long'
                });
            }

            // Get user from database
            const [users] = await pool.execute(
                'SELECT id, password FROM users WHERE id = ?',
                [userId]
            );

            if (users.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            const user = users[0];

            // Verify current password
            const validPassword = await bcrypt.compare(currentPassword, user.password);
            if (!validPassword) {
                return res.status(401).json({
                    success: false,
                    message: 'Current password is incorrect'
                });
            }

            // Hash new password
            const hashedPassword = await bcrypt.hash(newPassword, 12);

            // Update password in database
            await pool.execute(
                'UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?',
                [hashedPassword, userId]
            );

            res.json({
                success: true,
                message: 'Password changed successfully'
            });
        } catch (error) {
            console.error('Change password error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to change password'
            });
        }
    }
}

module.exports = AuthController;