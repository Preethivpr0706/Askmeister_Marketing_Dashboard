const User = require('../models/userModel');
const Business = require('../models/businessModel');
const { authorize } = require('../middleware/auth');

class UserController {
    // Get all users (admin only)
    static async getAllUsers(req, res) {
        try {
            const users = await User.getAll();

            // Remove password from response
            const usersWithoutPassword = users.map(user => {
                const { password, ...userWithoutPassword } = user;
                return userWithoutPassword;
            });

            res.status(200).json({
                success: true,
                data: usersWithoutPassword
            });
        } catch (error) {
            console.error('Error in getAllUsers:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get users',
                error: error.message
            });
        }
    }

    // Get user by ID (admin only)
    static async getUserById(req, res) {
        try {
            const { id } = req.params;
            const user = await User.getById(id);

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Remove password from response
            const { password, ...userWithoutPassword } = user;

            res.status(200).json({
                success: true,
                data: userWithoutPassword
            });
        } catch (error) {
            console.error('Error in getUserById:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get user',
                error: error.message
            });
        }
    }

    // Create new user (admin only)
    static async createUser(req, res) {
        try {
            const { email, name, password, phone, business_id, role } = req.body;

            // Validate required fields
            if (!email || !name || !password || !business_id) {
                return res.status(400).json({
                    success: false,
                    message: 'Email, name, password, and business_id are required'
                });
            }

            // Check if user with this email already exists
            const existingUser = await User.getByEmail(email);
            if (existingUser) {
                return res.status(409).json({
                    success: false,
                    message: 'User with this email already exists'
                });
            }

            // Check if business exists
            const business = await Business.getByUserId(req.user.id); // Get current user's business to verify
            if (!business || business.business.id !== business_id) {
                // For now, allow admin to create users for any business
                // In production, you might want to restrict this based on admin permissions
                const [businesses] = await require('../config/database').pool.execute(
                    'SELECT id FROM businesses WHERE id = ?',
                    [business_id]
                );
                if (businesses.length === 0) {
                    return res.status(404).json({
                        success: false,
                        message: 'Business not found'
                    });
                }
            }

            // Validate role
            if (role && !['admin', 'user'].includes(role)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid role. Must be either admin or user'
                });
            }

            const newUser = await User.create({
                email,
                name,
                password,
                phone,
                business_id,
                role: role || 'user'
            });

            // Remove password from response
            const { password: _, ...userWithoutPassword } = newUser;

            res.status(201).json({
                success: true,
                data: userWithoutPassword,
                message: 'User created successfully'
            });
        } catch (error) {
            console.error('Error in createUser:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create user',
                error: error.message
            });
        }
    }

    // Update user (admin only)
    static async updateUser(req, res) {
        try {
            const { id } = req.params;
            const { email, name, phone, business_id, role, password } = req.body;

            // Check if user exists
            const existingUser = await User.getById(id);
            if (!existingUser) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Check if email is already taken by another user
            if (email && email !== existingUser.email) {
                const emailExists = await User.getByEmail(email);
                if (emailExists) {
                    return res.status(409).json({
                        success: false,
                        message: 'Email is already taken by another user'
                    });
                }
            }

            // Validate role
            if (role && !['admin', 'user'].includes(role)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid role. Must be either admin or user'
                });
            }

            // Check if business exists (if business_id is being updated)
            if (business_id && business_id !== existingUser.business_id) {
                const [businesses] = await require('../config/database').pool.execute(
                    'SELECT id FROM businesses WHERE id = ?',
                    [business_id]
                );
                if (businesses.length === 0) {
                    return res.status(404).json({
                        success: false,
                        message: 'Business not found'
                    });
                }
            }

            // Only include password if it's provided and not empty
            const updateData = {
                email: email || existingUser.email,
                name: name || existingUser.name,
                phone: phone !== undefined ? phone : existingUser.phone,
                business_id: business_id || existingUser.business_id,
                role: role || existingUser.role
            };
            
            // Only add password if it's provided and not empty
            if (password && password.trim() !== '') {
                if (password.length < 6) {
                    return res.status(400).json({
                        success: false,
                        message: 'Password must be at least 6 characters long'
                    });
                }
                updateData.password = password;
            }

            const updatedUser = await User.update(id, updateData);

            // Remove password from response
            const { password: _, ...userWithoutPassword } = updatedUser;

            res.status(200).json({
                success: true,
                data: userWithoutPassword,
                message: 'User updated successfully'
            });
        } catch (error) {
            console.error('Error in updateUser:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update user',
                error: error.message
            });
        }
    }

    // Delete user (admin only)
    static async deleteUser(req, res) {
        try {
            const { id } = req.params;

            // Prevent deleting own account
            if (id === req.user.id) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot delete your own account'
                });
            }

            const result = await User.delete(id);

            res.status(200).json({
                success: true,
                message: result.message
            });
        } catch (error) {
            console.error('Error in deleteUser:', error);
            if (error.message === 'User not found') {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }
            res.status(500).json({
                success: false,
                message: 'Failed to delete user',
                error: error.message
            });
        }
    }

    // Get users by business (admin only)
    static async getUsersByBusiness(req, res) {
        try {
            const { businessId } = req.params;
            const users = await User.getUsersByBusiness(businessId);

            // Remove password from response
            const usersWithoutPassword = users.map(user => {
                const { password, ...userWithoutPassword } = user;
                return userWithoutPassword;
            });

            res.status(200).json({
                success: true,
                data: usersWithoutPassword
            });
        } catch (error) {
            console.error('Error in getUsersByBusiness:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get users for business',
                error: error.message
            });
        }
    }

    // Get users by role (admin only)
    static async getUsersByRole(req, res) {
        try {
            const { role } = req.params;
            const users = await User.getUsersByRole(role);

            // Remove password from response
            const usersWithoutPassword = users.map(user => {
                const { password, ...userWithoutPassword } = user;
                return userWithoutPassword;
            });

            res.status(200).json({
                success: true,
                data: usersWithoutPassword
            });
        } catch (error) {
            console.error('Error in getUsersByRole:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get users by role',
                error: error.message
            });
        }
    }

    // Reset user password (admin only)
    static async resetUserPassword(req, res) {
        try {
            const { id } = req.params;
            const { newPassword } = req.body;

            if (!newPassword || newPassword.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: 'Password must be at least 6 characters long'
                });
            }

            const result = await User.updatePassword(id, newPassword);

            res.status(200).json({
                success: true,
                message: result.message
            });
        } catch (error) {
            console.error('Error in resetUserPassword:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to reset user password',
                error: error.message
            });
        }
    }
}

module.exports = UserController;
